-- =============================================================================
-- 0006_features_round2.sql — discounts, reviews, back-in-stock alerts, returns, team
--
-- Apply after 0001_schema.sql, 0003_admin_roles.sql (is_owner, profiles.admin_role) and
-- 0004_order_emails.sql. Idempotent: every object is created with IF NOT EXISTS /
-- CREATE OR REPLACE / DROP ... IF EXISTS guards so the file can be re-run.
--
-- Contract: src/lib/supabase/database.types.ts (tables, views, RPCs, enums) and the
-- Supabase*Repository adapters under src/features/{discounts,reviews,stock-alerts,
-- returns,team}/infrastructure. Behaviour mirrors the Mock*Repository of each feature
-- (same messages, same rules) — the mocks are the specification.
--
-- Conventions (same as 0001_schema.sql / 0002_cms.sql)
--   * Clients read tables/views through RLS; every state change is a SECURITY DEFINER
--     RPC that checks is_admin() / is_owner() / auth.uid() first.
--   * Custom SQLSTATE codes mapped by mappers.ts:
--       VA001 validation   NF001 not_found   CF001 conflict   FB001 forbidden
--   * `place_order` is NOT redefined here. Discounts are applied by
--     `place_order_with_discount(payload)`, a wrapper that validates the code, sets the
--     transaction-local GUC `app.discount_id` and calls `place_order`; the BEFORE INSERT
--     trigger `orders_apply_pending_discount` on `orders` reads the GUC, re-checks the
--     code against the server-computed subtotal and writes `discount` / `total`. The
--     wrapper then increments `used_count` and records a `discount_redemptions` row —
--     all in one transaction. Later overrides of `place_order` (same signature) are
--     picked up automatically.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('percent', 'fixed');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_alert_status') then
    create type public.stock_alert_status as enum ('waiting', 'notified');
  end if;
  if not exists (select 1 from pg_type where typname = 'return_status') then
    create type public.return_status as enum ('requested', 'approved', 'rejected', 'received', 'refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'return_resolution') then
    create type public.return_resolution as enum ('refund', 'exchange');
  end if;
  if not exists (select 1 from pg_type where typname = 'return_reason') then
    create type public.return_reason as enum ('wrong_size', 'damaged', 'not_as_described', 'changed_mind', 'other');
  end if;
end $$;

-- Admin notification when a variant with waiting back-in-stock subscribers is restocked.
alter type public.notification_type add value if not exists 'back_in_stock';

-- Shared e-mail shape check (mirrors zod `z.email()` loosely).
create or replace function public.is_plausible_email(p_email text)
returns boolean language sql immutable as $$
  select coalesce(p_email, '') ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$';
$$;

-- =============================================================================
-- 1. DISCOUNT CODES
-- =============================================================================
create table if not exists public.discount_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9-]{3,20}$'),
  type          public.discount_type not null,
  value         numeric(12,2) not null check (value > 0),
  min_subtotal  numeric(12,2) not null default 0 check (min_subtotal >= 0),
  max_uses      integer check (max_uses is null or max_uses >= 1),
  used_count    integer not null default 0 check (used_count >= 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (starts_at is null or ends_at is null or starts_at <= ends_at)
);
create index if not exists discount_codes_created_idx on public.discount_codes (created_at desc);

drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

-- One row per order that used a code; keeps used_count auditable.
create table if not exists public.discount_redemptions (
  id           uuid primary key default gen_random_uuid(),
  discount_id  uuid not null references public.discount_codes (id) on delete cascade,
  order_id     uuid not null unique references public.orders (id) on delete cascade,
  code         text not null,
  amount       numeric(12,2) not null check (amount >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists discount_redemptions_discount_idx on public.discount_redemptions (discount_id, created_at desc);

-- Mirrors computeDiscountAmount() in src/features/discounts/domain/entities.ts
create or replace function public.discount_amount(
  p_type public.discount_type, p_value numeric, p_subtotal numeric
) returns numeric language sql immutable as $$
  select round(
    least(case when p_type = 'percent' then p_subtotal * p_value / 100 else p_value end, p_subtotal),
    2
  );
$$;

-- Mirrors discountIneligibleReason(); null when the code can be applied.
create or replace function public.discount_ineligible_reason(d public.discount_codes, p_subtotal numeric)
returns text language sql stable as $$
  select case
    when not d.is_active then 'This code is no longer active.'
    when d.starts_at is not null and d.starts_at > now() then 'This code is not active yet.'
    when d.ends_at is not null and d.ends_at < now() then 'This code has expired.'
    when d.max_uses is not null and d.used_count >= d.max_uses then 'This code has reached its usage limit.'
    when p_subtotal < d.min_subtotal then 'Add more to reach the minimum order for this code.'
    else null
  end;
$$;

create or replace function public.discount_code_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(d) from public.discount_codes d where d.id = p_id;
$$;

-- -----------------------------------------------------------------------------
-- RPC: validate_discount_code(p_code, p_subtotal) -> { code, type, value, amount }
-- Storefront (anon + authenticated). Raises VA001 with the user-facing reason.
-- -----------------------------------------------------------------------------
create or replace function public.validate_discount_code(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d        public.discount_codes%rowtype;
  v_reason text;
  v_sub    numeric := coalesce(p_subtotal, 0);
begin
  select * into d from public.discount_codes where code = upper(trim(coalesce(p_code, '')));
  if not found then
    raise exception 'That code is not valid.' using errcode = 'VA001';
  end if;
  v_reason := public.discount_ineligible_reason(d, v_sub);
  if v_reason is not null then
    raise exception '%', v_reason using errcode = 'VA001';
  end if;
  return jsonb_build_object(
    'code', d.code,
    'type', d.type,
    'value', d.value,
    'amount', public.discount_amount(d.type, d.value, v_sub)
  );
end $$;

-- -----------------------------------------------------------------------------
-- Trigger: orders_apply_pending_discount (BEFORE INSERT on orders)
-- Reads `app.discount_id` (set only by place_order_with_discount), re-validates the
-- code against the server-computed subtotal and writes discount / total before the
-- row lands, so `order_json` returned by place_order already carries the discount.
-- -----------------------------------------------------------------------------
create or replace function public.orders_apply_pending_discount()
returns trigger language plpgsql as $$
declare
  v_id     text := current_setting('app.discount_id', true);
  d        public.discount_codes%rowtype;
  v_reason text;
  v_amount numeric(12,2);
begin
  if coalesce(v_id, '') = '' then
    return new;
  end if;
  select * into d from public.discount_codes where id = v_id::uuid;
  if not found then
    raise exception 'That code is not valid.' using errcode = 'VA001';
  end if;
  v_reason := public.discount_ineligible_reason(d, new.subtotal);
  if v_reason is not null then
    raise exception '%', v_reason using errcode = 'VA001';
  end if;
  v_amount := public.discount_amount(d.type, d.value, new.subtotal);
  new.discount := v_amount;
  new.total := round(new.subtotal + new.shipping_fee - v_amount, 2);
  return new;
end $$;

drop trigger if exists orders_apply_pending_discount on public.orders;
create trigger orders_apply_pending_discount
  before insert on public.orders
  for each row execute function public.orders_apply_pending_discount();

-- -----------------------------------------------------------------------------
-- RPC: place_order_with_discount(payload) -> same result as place_order
-- payload is the place_order payload plus `discount_code: string | null`. Without a
-- code it simply delegates. With one: locks the code row (serialises usage counting),
-- fails fast on the subtotal-independent rules, lets place_order + the insert trigger
-- do the rest, then records the redemption. Never redefines place_order.
-- -----------------------------------------------------------------------------
create or replace function public.place_order_with_discount(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code     text := upper(trim(coalesce(payload ->> 'discount_code', '')));
  d          public.discount_codes%rowtype;
  v_reason   text;
  v_result   jsonb;
  v_order_id uuid;
  v_amount   numeric(12,2);
begin
  if v_code = '' then
    return public.place_order(payload);
  end if;

  select * into d from public.discount_codes where code = v_code for update;
  if not found then
    raise exception 'That code is not valid.' using errcode = 'VA001';
  end if;
  -- Subtotal-independent rules first (active, window, usage limit) so nothing is locked
  -- for a code that can never apply. The trigger repeats the full check with the real subtotal.
  v_reason := public.discount_ineligible_reason(d, d.min_subtotal);
  if v_reason is not null then
    raise exception '%', v_reason using errcode = 'VA001';
  end if;

  perform set_config('app.discount_id', d.id::text, true);
  v_result := public.place_order(payload);
  perform set_config('app.discount_id', '', true);

  v_order_id := (v_result ->> 'order_id')::uuid;
  select discount into v_amount from public.orders where id = v_order_id;

  update public.discount_codes set used_count = used_count + 1 where id = d.id;
  insert into public.discount_redemptions (discount_id, order_id, code, amount)
  values (d.id, v_order_id, d.code, coalesce(v_amount, 0));

  return v_result;
end $$;

-- -----------------------------------------------------------------------------
-- RPC: save_discount_code(p_id, p_payload) -> discount json (owner)
-- payload: { code, type, value, min_subtotal, max_uses, starts_at, ends_at, is_active }
-- -----------------------------------------------------------------------------
create or replace function public.save_discount_code(p_id uuid, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_code   text := upper(trim(coalesce(p_payload ->> 'code', '')));
  v_type   public.discount_type;
  v_value  numeric;
  v_min    numeric;
  v_max    integer;
  v_starts timestamptz;
  v_ends   timestamptz;
  v_active boolean;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage discount codes.' using errcode = 'FB001';
  end if;
  if v_code !~ '^[A-Z0-9-]{3,20}$' then
    raise exception 'Codes are 3-20 characters: uppercase letters, numbers and hyphens only.' using errcode = 'VA001';
  end if;
  begin
    v_type   := (p_payload ->> 'type')::public.discount_type;
    v_value  := (p_payload ->> 'value')::numeric;
    v_min    := coalesce(nullif(p_payload ->> 'min_subtotal', '')::numeric, 0);
    v_max    := nullif(p_payload ->> 'max_uses', '')::integer;
    v_starts := nullif(p_payload ->> 'starts_at', '')::timestamptz;
    v_ends   := nullif(p_payload ->> 'ends_at', '')::timestamptz;
    v_active := coalesce((p_payload ->> 'is_active')::boolean, true);
  exception when others then
    raise exception 'Check the discount details.' using errcode = 'VA001';
  end;
  if v_type is null then
    raise exception 'Choose a discount type.' using errcode = 'VA001';
  end if;
  if v_value is null or v_value <= 0 then
    raise exception 'Enter a value greater than zero.' using errcode = 'VA001';
  end if;
  if v_type = 'percent' and v_value > 100 then
    raise exception 'Percent cannot exceed 100.' using errcode = 'VA001';
  end if;
  if v_min < 0 then
    raise exception 'Minimum subtotal cannot be negative.' using errcode = 'VA001';
  end if;
  if v_max is not null and v_max < 1 then
    raise exception 'Usage limit must be at least 1.' using errcode = 'VA001';
  end if;
  if v_starts is not null and v_ends is not null and v_starts > v_ends then
    raise exception 'End must be after start.' using errcode = 'VA001';
  end if;
  if exists (select 1 from public.discount_codes where code = v_code and id is distinct from p_id) then
    raise exception 'A discount with this code already exists.' using errcode = 'CF001';
  end if;

  if p_id is null then
    insert into public.discount_codes (code, type, value, min_subtotal, max_uses, starts_at, ends_at, is_active)
    values (v_code, v_type, v_value, v_min, v_max, v_starts, v_ends, v_active)
    returning id into v_id;
  else
    update public.discount_codes
       set code = v_code, type = v_type, value = v_value, min_subtotal = v_min,
           max_uses = v_max, starts_at = v_starts, ends_at = v_ends, is_active = v_active
     where id = p_id
     returning id into v_id;
    if v_id is null then
      raise exception 'Discount code was not found.' using errcode = 'NF001';
    end if;
  end if;
  return public.discount_code_json(v_id);
end $$;

create or replace function public.delete_discount_code(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage discount codes.' using errcode = 'FB001';
  end if;
  delete from public.discount_codes where id = p_id;
  if not found then
    raise exception 'Discount code was not found.' using errcode = 'NF001';
  end if;
end $$;

-- =============================================================================
-- 2. REVIEWS
-- =============================================================================
create table if not exists public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products (id) on delete cascade,
  user_id              uuid references public.profiles (id) on delete set null,
  author_name          text not null,
  rating               smallint not null check (rating between 1 and 5),
  title                text not null check (char_length(title) between 3 and 80),
  body                 text not null check (char_length(body) between 10 and 1000),
  photo_urls           text[] not null default '{}' check (cardinality(photo_urls) <= 3),
  is_verified_purchase boolean not null default false,
  status               public.review_status not null default 'pending',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
-- One review per buyer per product (mirrors the mock's conflict check).
create unique index if not exists reviews_product_user_key
  on public.reviews (product_id, user_id) where user_id is not null;
create index if not exists reviews_product_status_idx on public.reviews (product_id, status, created_at desc);
create index if not exists reviews_status_created_idx on public.reviews (status, created_at desc);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Reviews with product name/slug for the storefront list and the admin table.
-- security_invoker: the reviews RLS (approved / own / admin) and the products RLS apply.
create or replace view public.review_rows with (security_invoker = true) as
select r.id, r.product_id, p.name as product_name, p.slug as product_slug,
       r.user_id, r.author_name, r.rating, r.title, r.body, r.photo_urls,
       r.is_verified_purchase, r.status, r.created_at, r.updated_at
from public.reviews r
join public.products p on p.id = r.product_id;

create or replace function public.review_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(v) from public.review_rows v where v.id = p_id;
$$;

-- "Maria Santos" -> "Maria S." (mirrors abbreviateName in MockReviewRepository).
create or replace function public.review_author_name(p_full_name text)
returns text language plpgsql immutable as $$
declare
  parts text[] := regexp_split_to_array(trim(coalesce(p_full_name, '')), '\s+');
  n     integer := coalesce(array_length(parts, 1), 0);
begin
  if n = 0 or coalesce(parts[1], '') = '' then
    return 'Customer';
  end if;
  if n = 1 then
    return parts[1];
  end if;
  return parts[1] || ' ' || upper(left(parts[n], 1)) || '.';
end $$;

-- -----------------------------------------------------------------------------
-- RPC: submit_review(p_product_id, p_rating, p_title, p_body, p_photo_urls) -> review json
-- Authenticated buyers. Verified purchase = a delivered order of theirs contains the
-- product. Photos are uploaded by the client to bucket review-photos first.
-- -----------------------------------------------------------------------------
create or replace function public.submit_review(
  p_product_id uuid, p_rating integer, p_title text, p_body text, p_photo_urls text[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_title  text := trim(coalesce(p_title, ''));
  v_body   text := trim(coalesce(p_body, ''));
  v_photos text[] := coalesce(p_photo_urls, '{}');
  v_name   text;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'Sign in to write a review.' using errcode = 'FB001';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Product was not found.' using errcode = 'NF001';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a star rating.' using errcode = 'VA001';
  end if;
  if char_length(v_title) < 3 then
    raise exception 'Give your review a short title.' using errcode = 'VA001';
  end if;
  if char_length(v_title) > 80 then
    raise exception 'Title must be 80 characters or fewer.' using errcode = 'VA001';
  end if;
  if char_length(v_body) < 10 then
    raise exception 'Tell us a little more (at least 10 characters).' using errcode = 'VA001';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Reviews must be 1000 characters or fewer.' using errcode = 'VA001';
  end if;
  if cardinality(v_photos) > 3 then
    raise exception 'You can attach up to 3 photos.' using errcode = 'VA001';
  end if;
  if exists (select 1 from public.reviews where product_id = p_product_id and user_id = v_user) then
    raise exception 'You have already reviewed this product.' using errcode = 'CF001';
  end if;

  select full_name into v_name from public.profiles where id = v_user;

  insert into public.reviews (
    product_id, user_id, author_name, rating, title, body, photo_urls, is_verified_purchase
  ) values (
    p_product_id, v_user, public.review_author_name(v_name), p_rating, v_title, v_body, v_photos,
    exists (
      select 1 from public.orders o
      join public.order_items i on i.order_id = o.id
      where o.user_id = v_user and o.status = 'delivered' and i.product_id = p_product_id
    )
  )
  returning id into v_id;

  return public.review_json(v_id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: review_summary(p_product_id) -> { product_id, average, count, distribution[5] }
-- Approved reviews only; average rounded to one decimal. Public.
-- -----------------------------------------------------------------------------
create or replace function public.review_summary(p_product_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'product_id', p_product_id,
    'average', coalesce(round(avg(r.rating)::numeric, 1), 0),
    'count', count(*),
    'distribution', jsonb_build_array(
      count(*) filter (where r.rating = 1),
      count(*) filter (where r.rating = 2),
      count(*) filter (where r.rating = 3),
      count(*) filter (where r.rating = 4),
      count(*) filter (where r.rating = 5)
    )
  )
  from public.reviews r
  where r.product_id = p_product_id and r.status = 'approved';
$$;

create or replace function public.set_review_status(p_id uuid, p_status public.review_status)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  update public.reviews set status = p_status where id = p_id;
  if not found then
    raise exception 'Review was not found.' using errcode = 'NF001';
  end if;
  return public.review_json(p_id);
end $$;

-- Returns the photo URLs so the client can remove the storage objects afterwards.
create or replace function public.delete_review(p_id uuid)
returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_photos text[];
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  delete from public.reviews where id = p_id returning photo_urls into v_photos;
  if v_photos is null then
    raise exception 'Review was not found.' using errcode = 'NF001';
  end if;
  return v_photos;
end $$;

-- =============================================================================
-- 3. BACK-IN-STOCK ALERTS
-- =============================================================================
create table if not exists public.stock_alerts (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references public.product_variants (id) on delete cascade,
  email        text not null check (public.is_plausible_email(email)),
  status       public.stock_alert_status not null default 'waiting',
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  check ((status = 'notified') = (notified_at is not null))
);
-- A duplicate (variant + email) while waiting resolves to the existing alert.
create unique index if not exists stock_alerts_waiting_key
  on public.stock_alerts (variant_id, lower(email)) where status = 'waiting';
create index if not exists stock_alerts_variant_status_idx on public.stock_alerts (variant_id, status);
create index if not exists stock_alerts_created_idx on public.stock_alerts (created_at desc);

-- Alerts joined with variant/product info (admin page groups them by variant).
create or replace view public.stock_alert_rows with (security_invoker = true) as
select a.id, p.id as product_id, p.name as product_name, p.slug as product_slug,
       a.variant_id, v.sku, v.size, v.color_name,
       a.email, a.status, a.created_at, a.notified_at
from public.stock_alerts a
join public.product_variants v on v.id = a.variant_id
join public.products p on p.id = v.product_id;

create or replace function public.stock_alert_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from public.stock_alert_rows r where r.id = p_id;
$$;

-- -----------------------------------------------------------------------------
-- RPC: subscribe_stock_alert(p_variant_id, p_email) -> alert json (anon + authenticated)
-- -----------------------------------------------------------------------------
create or replace function public.subscribe_stock_alert(p_variant_id uuid, p_email text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_status public.product_status;
  v_id     uuid;
begin
  if not public.is_plausible_email(v_email) then
    raise exception 'Enter a valid email address.' using errcode = 'VA001';
  end if;
  select p.status into v_status
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.id = p_variant_id;
  if not found or v_status <> 'published' then
    raise exception 'Variant was not found.' using errcode = 'NF001';
  end if;

  insert into public.stock_alerts (variant_id, email)
  values (p_variant_id, v_email)
  on conflict (variant_id, lower(email)) where status = 'waiting' do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.stock_alerts
     where variant_id = p_variant_id and lower(email) = v_email and status = 'waiting';
  end if;
  return public.stock_alert_json(v_id);
end $$;

-- RPC: mark_stock_alerts_notified(p_variant_id) -> number of alerts marked (admin)
create or replace function public.mark_stock_alerts_notified(p_variant_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  update public.stock_alerts
     set status = 'notified', notified_at = now()
   where variant_id = p_variant_id and status = 'waiting';
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- -----------------------------------------------------------------------------
-- Trigger: when a sold-out variant becomes available again and customers are waiting,
-- tell the admins so they can send the e-mails and press "Mark notified".
-- (E-mail delivery itself stays a backend concern, as in mock mode.)
-- -----------------------------------------------------------------------------
create or replace function public.variants_notify_back_in_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_waiting integer;
  v_product text;
begin
  if (old.stock - old.reserved_stock) <= 0 and (new.stock - new.reserved_stock) > 0 then
    select count(*) into v_waiting
      from public.stock_alerts where variant_id = new.id and status = 'waiting';
    if v_waiting > 0 then
      select name into v_product from public.products where id = new.product_id;
      perform public.notify_admins(
        'back_in_stock',
        'Back in stock: ' || new.sku,
        coalesce(v_product, 'Product') || ' (' || new.size || ', ' || new.color_name ||
          ') is available again. ' || v_waiting || ' customer(s) asked to be notified.',
        '/admin/stock-alerts'
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists product_variants_notify_back_in_stock on public.product_variants;
create trigger product_variants_notify_back_in_stock
  after update of stock, reserved_stock on public.product_variants
  for each row execute function public.variants_notify_back_in_stock();

-- =============================================================================
-- 4. RETURNS AND EXCHANGES
-- =============================================================================
create table if not exists public.return_requests (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  user_id        uuid references public.profiles (id) on delete set null,
  reason         public.return_reason not null,
  resolution     public.return_resolution not null,
  note           text not null default '' check (char_length(note) <= 500),
  status         public.return_status not null default 'requested',
  admin_note     text not null default '',
  refund_amount  numeric(12,2) not null default 0 check (refund_amount >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- At most one open request per order (rejected / refunded are closed).
create unique index if not exists return_requests_open_order_key
  on public.return_requests (order_id) where status in ('requested', 'approved', 'received');
create index if not exists return_requests_order_idx on public.return_requests (order_id, created_at desc);
create index if not exists return_requests_status_idx on public.return_requests (status, created_at desc);

drop trigger if exists return_requests_set_updated_at on public.return_requests;
create trigger return_requests_set_updated_at
  before update on public.return_requests
  for each row execute function public.set_updated_at();

create table if not exists public.return_items (
  id             uuid primary key default gen_random_uuid(),
  return_id      uuid not null references public.return_requests (id) on delete cascade,
  order_item_id  uuid not null references public.order_items (id) on delete restrict,
  product_name   text not null,
  size           text not null,
  color_name     text not null,
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(12,2) not null check (unit_price >= 0),
  sort_order     integer not null default 0,
  unique (return_id, order_item_id)
);
create index if not exists return_items_return_idx on public.return_items (return_id, sort_order);

-- Mirrors RETURN_STATUS_TRANSITIONS in src/features/returns/domain/entities.ts
create or replace function public.return_can_transition(p_from public.return_status, p_to public.return_status)
returns boolean language sql immutable as $$
  select case p_from
    when 'requested' then p_to in ('approved', 'rejected')
    when 'approved'  then p_to in ('received', 'rejected')
    when 'received'  then p_to in ('refunded')
    else false
  end;
$$;

-- Shape consumed by returnRequestJsonSchema in mappers.ts.
create or replace function public.return_request_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id,
    'order_id', r.order_id,
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'user_id', r.user_id,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_item_id', i.order_item_id,
        'product_name', i.product_name,
        'size', i.size,
        'color_name', i.color_name,
        'quantity', i.quantity,
        'unit_price', i.unit_price
      ) order by i.sort_order)
      from public.return_items i where i.return_id = r.id
    ), '[]'::jsonb),
    'reason', r.reason,
    'resolution', r.resolution,
    'note', r.note,
    'status', r.status,
    'admin_note', r.admin_note,
    'refund_amount', r.refund_amount,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  )
  from public.return_requests r
  join public.orders o on o.id = r.order_id
  where r.id = p_id;
$$;

-- -----------------------------------------------------------------------------
-- RPC: request_return(p_order_id, p_items, p_reason, p_resolution, p_note) -> json
-- p_items: [{ order_item_id, quantity }]. Buyer must own the order; delivered; within
-- 14 days of the `delivered` status event (or updated_at); one open request per order.
-- -----------------------------------------------------------------------------
create or replace function public.request_return(
  p_order_id uuid, p_items jsonb, p_reason text, p_resolution text, p_note text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user       uuid := auth.uid();
  v_reason     public.return_reason;
  v_resolution public.return_resolution;
  v_note       text := trim(coalesce(p_note, ''));
  o            public.orders%rowtype;
  oi           public.order_items%rowtype;
  v_delivered  timestamptz;
  v_id         uuid;
  it           record;
  v_item_id    uuid;
  v_qty        integer;
  v_seen       uuid[] := '{}';
  v_refund     numeric := 0;
begin
  if v_user is null then
    raise exception 'Sign in to request a return.' using errcode = 'FB001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item.' using errcode = 'VA001';
  end if;
  begin
    v_reason := p_reason::public.return_reason;
  exception when others then
    raise exception 'Choose a reason for the return.' using errcode = 'VA001';
  end;
  begin
    v_resolution := p_resolution::public.return_resolution;
  exception when others then
    raise exception 'Choose a resolution.' using errcode = 'VA001';
  end;
  if char_length(v_note) > 500 then
    raise exception 'Notes must be 500 characters or fewer.' using errcode = 'VA001';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from v_user then
    raise exception 'Order was not found.' using errcode = 'NF001';
  end if;
  if o.status <> 'delivered' then
    raise exception 'Only delivered orders can be returned.' using errcode = 'VA001';
  end if;
  select max(created_at) into v_delivered
    from public.order_status_events where order_id = o.id and status = 'delivered';
  v_delivered := coalesce(v_delivered, o.updated_at);
  if now() - v_delivered > interval '14 days' then
    raise exception 'Returns must be requested within 14 days of delivery.' using errcode = 'VA001';
  end if;
  if exists (
    select 1 from public.return_requests
     where order_id = o.id and status in ('requested', 'approved', 'received')
  ) then
    raise exception 'A return request is already open for this order.' using errcode = 'CF001';
  end if;

  insert into public.return_requests (order_id, user_id, reason, resolution, note)
  values (o.id, v_user, v_reason, v_resolution, v_note)
  returning id into v_id;

  for it in select e, ord from jsonb_array_elements(p_items) with ordinality as x(e, ord) loop
    begin
      v_item_id := (it.e ->> 'order_item_id')::uuid;
    exception when others then
      raise exception 'One of the selected items is not part of this order.' using errcode = 'VA001';
    end;
    v_qty := (it.e ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'Quantity must be at least 1.' using errcode = 'VA001';
    end if;
    select * into oi from public.order_items where id = v_item_id and order_id = o.id;
    if not found or v_item_id = any (v_seen) then
      raise exception 'One of the selected items is not part of this order.' using errcode = 'VA001';
    end if;
    if v_qty > oi.quantity then
      raise exception 'You can return at most % of %.', oi.quantity, oi.product_name using errcode = 'VA001';
    end if;
    insert into public.return_items (
      return_id, order_item_id, product_name, size, color_name, quantity, unit_price, sort_order
    ) values (v_id, oi.id, oi.product_name, oi.size, oi.color_name, v_qty, oi.unit_price, it.ord);
    v_seen := array_append(v_seen, v_item_id);
    v_refund := v_refund + oi.unit_price * v_qty;
  end loop;

  update public.return_requests set refund_amount = round(v_refund, 2) where id = v_id;

  perform public.notify_admins(
    'order_issue',
    'Return requested for ' || o.order_number,
    o.customer_name || ' asked for a' || case v_resolution when 'exchange' then 'n exchange' else ' refund' end ||
      ' (' || replace(v_reason::text, '_', ' ') || ').',
    '/admin/returns'
  );

  return public.return_request_json(v_id);
end $$;

-- RPC: order_return_request(p_order_id) -> latest request json or null (owner or admin)
create or replace function public.order_return_request(p_order_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_owner uuid;
  v_id    uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view return requests.' using errcode = 'FB001';
  end if;
  select user_id into v_owner from public.orders where id = p_order_id;
  if not found then
    return null;
  end if;
  if v_owner is distinct from auth.uid() and not public.is_admin() then
    return null;
  end if;
  select id into v_id from public.return_requests
   where order_id = p_order_id order by created_at desc limit 1;
  if v_id is null then
    return null;
  end if;
  return public.return_request_json(v_id);
end $$;

-- RPC: list_return_requests(p_status) -> json[] (admin). p_status = 'all' or a return_status.
create or replace function public.list_return_requests(p_status text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_status public.return_status;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if coalesce(p_status, 'all') <> 'all' then
    begin
      v_status := p_status::public.return_status;
    exception when others then
      raise exception 'Invalid return status.' using errcode = 'VA001';
    end;
  end if;
  return (
    select coalesce(jsonb_agg(public.return_request_json(r.id) order by r.created_at desc), '[]'::jsonb)
    from public.return_requests r
    where v_status is null or r.status = v_status
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC: update_return_status(p_id, p_status, p_admin_note) -> json (admin)
-- Enforces RETURN_STATUS_TRANSITIONS. `refunded` settles the order's payment status
-- (refunded / partially_refunded) and leaves a note in its history, as the mock does.
-- -----------------------------------------------------------------------------
create or replace function public.update_return_status(p_id uuid, p_status text, p_admin_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status public.return_status;
  r        public.return_requests%rowtype;
  o        public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  begin
    v_status := p_status::public.return_status;
  exception when others then
    raise exception 'Invalid return status.' using errcode = 'VA001';
  end;

  select * into r from public.return_requests where id = p_id for update;
  if not found then
    raise exception 'Return request was not found.' using errcode = 'NF001';
  end if;
  if not public.return_can_transition(r.status, v_status) then
    raise exception 'Invalid return status transition.' using errcode = 'VA001';
  end if;

  update public.return_requests
     set status = v_status, admin_note = trim(coalesce(p_admin_note, ''))
   where id = r.id;

  if v_status = 'refunded' then
    perform set_config('app.bypass_guard', 'on', true);
    select * into o from public.orders where id = r.order_id for update;
    if found then
      update public.orders
         set payment_status = case
               when r.refund_amount >= o.total then 'refunded'::public.payment_status
               else 'partially_refunded'::public.payment_status end
       where id = o.id;
      insert into public.order_status_events (order_id, status, note, actor)
      values (
        o.id, o.status,
        'Refund of PHP ' || to_char(r.refund_amount, 'FM999,999,990.00') ||
          ' issued for return request ' || r.id || '.',
        'admin'
      );
    end if;
  end if;

  return public.return_request_json(r.id);
end $$;

-- =============================================================================
-- 5. TEAM (admin staff management)
-- Active members are `profiles` rows with role = 'admin' (sub-role in admin_role).
-- Invites for people without an account are stored in team_invites; when the invitee
-- signs up, the BEFORE INSERT trigger on profiles promotes the new row in place
-- (no UPDATE, so the role guards from 0001/0003 are not involved).
-- =============================================================================
create table if not exists public.team_invites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (public.is_plausible_email(email)),
  full_name    text not null default '',
  role         public.admin_role not null default 'staff',
  invited_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create unique index if not exists team_invites_pending_email_key
  on public.team_invites (lower(email)) where accepted_at is null;

create or replace function public.profiles_apply_team_invite()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv public.team_invites%rowtype;
begin
  select * into inv from public.team_invites
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1
   for update;
  if found then
    new.role := 'admin';
    new.admin_role := inv.role;
    if coalesce(trim(new.full_name), '') = '' then
      new.full_name := inv.full_name;
    end if;
    update public.team_invites set accepted_at = now() where id = inv.id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_apply_team_invite on public.profiles;
create trigger profiles_apply_team_invite
  before insert on public.profiles
  for each row execute function public.profiles_apply_team_invite();

-- Member json for an admin profile id or a pending invite id (null otherwise).
-- last_active_at comes from auth.users.last_sign_in_at (readable by the function owner).
create or replace function public.team_member_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
       'id', p.id, 'email', p.email, 'full_name', p.full_name,
       'role', coalesce(p.admin_role, 'owner'), 'status', 'active',
       'last_active_at', u.last_sign_in_at, 'created_at', p.created_at)
     from public.profiles p left join auth.users u on u.id = p.id
     where p.id = p_id and p.role = 'admin'),
    (select jsonb_build_object(
       'id', i.id, 'email', i.email, 'full_name', i.full_name,
       'role', i.role, 'status', 'invited',
       'last_active_at', null, 'created_at', i.created_at)
     from public.team_invites i where i.id = p_id and i.accepted_at is null)
  );
$$;

create or replace function public.active_owner_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.profiles
  where role = 'admin' and coalesce(admin_role, 'owner') = 'owner';
$$;

-- RPC: team_members() -> json[] (admin), oldest first.
create or replace function public.team_members()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  return (
    select coalesce(jsonb_agg(public.team_member_json(m.id) order by m.created_at, m.id), '[]'::jsonb)
    from (
      select p.id, p.created_at from public.profiles p where p.role = 'admin'
      union all
      select i.id, i.created_at from public.team_invites i where i.accepted_at is null
    ) m
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC: invite_team_member(p_email, p_full_name, p_role) -> member json (owner)
-- An existing buyer account is promoted immediately (status 'active'); otherwise a
-- pending invite is stored (status 'invited') and applied when that e-mail signs up.
-- Sending the invitation e-mail is a backend concern (Edge Function / Auth invite).
-- -----------------------------------------------------------------------------
create or replace function public.invite_team_member(p_email text, p_full_name text, p_role public.admin_role)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name  text := trim(coalesce(p_full_name, ''));
  prof    public.profiles%rowtype;
  v_id    uuid;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage the team.' using errcode = 'FB001';
  end if;
  if not public.is_plausible_email(v_email) then
    raise exception 'Enter a valid email address.' using errcode = 'VA001';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'Enter a name.' using errcode = 'VA001';
  end if;
  if char_length(v_name) > 80 then
    raise exception 'Name must be 80 characters or fewer.' using errcode = 'VA001';
  end if;
  if p_role is null then
    raise exception 'Choose a role.' using errcode = 'VA001';
  end if;

  select * into prof from public.profiles where lower(email) = v_email for update;
  if found then
    if prof.role = 'admin' then
      raise exception 'That person is already on the team.' using errcode = 'CF001';
    end if;
    update public.profiles set role = 'admin', admin_role = p_role where id = prof.id;
    return public.team_member_json(prof.id);
  end if;

  if exists (select 1 from public.team_invites where lower(email) = v_email and accepted_at is null) then
    raise exception 'That person is already on the team.' using errcode = 'CF001';
  end if;
  insert into public.team_invites (email, full_name, role, invited_by)
  values (v_email, v_name, p_role, auth.uid())
  returning id into v_id;
  return public.team_member_json(v_id);
end $$;

-- RPC: update_team_member_role(p_id, p_role) -> member json (owner)
create or replace function public.update_team_member_role(p_id uuid, p_role public.admin_role)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  prof public.profiles%rowtype;
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage the team.' using errcode = 'FB001';
  end if;
  if p_role is null then
    raise exception 'Choose a role.' using errcode = 'VA001';
  end if;

  select * into prof from public.profiles where id = p_id and role = 'admin' for update;
  if found then
    if coalesce(prof.admin_role, 'owner') = 'owner' and p_role <> 'owner'
       and public.active_owner_count() <= 1 then
      raise exception 'A store needs at least one owner. Promote someone else first.' using errcode = 'CF001';
    end if;
    update public.profiles set admin_role = p_role where id = prof.id;
    return public.team_member_json(prof.id);
  end if;

  update public.team_invites set role = p_role
   where id = p_id and accepted_at is null
   returning id into v_id;
  if v_id is null then
    raise exception 'Team member was not found.' using errcode = 'NF001';
  end if;
  return public.team_member_json(v_id);
end $$;

-- RPC: remove_team_member(p_id) (owner). Active members are demoted to buyers (their
-- account and order history stay); pending invites are deleted.
create or replace function public.remove_team_member(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  prof public.profiles%rowtype;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage the team.' using errcode = 'FB001';
  end if;

  select * into prof from public.profiles where id = p_id and role = 'admin' for update;
  if found then
    if coalesce(prof.admin_role, 'owner') = 'owner' and public.active_owner_count() <= 1 then
      raise exception 'A store needs at least one owner. Promote someone else first.' using errcode = 'CF001';
    end if;
    update public.profiles set role = 'buyer', admin_role = null where id = prof.id;
    return;
  end if;

  delete from public.team_invites where id = p_id and accepted_at is null;
  if not found then
    raise exception 'Team member was not found.' using errcode = 'NF001';
  end if;
end $$;

-- =============================================================================
-- Function privileges
-- =============================================================================
revoke all on function public.is_plausible_email(text) from public;
revoke all on function public.discount_amount(public.discount_type, numeric, numeric) from public;
revoke all on function public.discount_ineligible_reason(public.discount_codes, numeric) from public;
revoke all on function public.discount_code_json(uuid) from public;
revoke all on function public.validate_discount_code(text, numeric) from public;
revoke all on function public.place_order_with_discount(jsonb) from public;
revoke all on function public.save_discount_code(uuid, jsonb) from public;
revoke all on function public.delete_discount_code(uuid) from public;
revoke all on function public.review_json(uuid) from public;
revoke all on function public.review_author_name(text) from public;
revoke all on function public.submit_review(uuid, integer, text, text, text[]) from public;
revoke all on function public.review_summary(uuid) from public;
revoke all on function public.set_review_status(uuid, public.review_status) from public;
revoke all on function public.delete_review(uuid) from public;
revoke all on function public.stock_alert_json(uuid) from public;
revoke all on function public.subscribe_stock_alert(uuid, text) from public;
revoke all on function public.mark_stock_alerts_notified(uuid) from public;
revoke all on function public.return_can_transition(public.return_status, public.return_status) from public;
revoke all on function public.return_request_json(uuid) from public;
revoke all on function public.request_return(uuid, jsonb, text, text, text) from public;
revoke all on function public.order_return_request(uuid) from public;
revoke all on function public.list_return_requests(text) from public;
revoke all on function public.update_return_status(uuid, text, text) from public;
revoke all on function public.team_member_json(uuid) from public;
revoke all on function public.active_owner_count() from public;
revoke all on function public.team_members() from public;
revoke all on function public.invite_team_member(text, text, public.admin_role) from public;
revoke all on function public.update_team_member_role(uuid, public.admin_role) from public;
revoke all on function public.remove_team_member(uuid) from public;

-- Pure helper referenced by CHECK constraints: must stay executable by every client role.
grant execute on function public.is_plausible_email(text) to anon, authenticated;
-- Storefront (guests included)
grant execute on function public.validate_discount_code(text, numeric) to anon, authenticated;
grant execute on function public.place_order_with_discount(jsonb) to anon, authenticated;
grant execute on function public.review_summary(uuid) to anon, authenticated;
grant execute on function public.subscribe_stock_alert(uuid, text) to anon, authenticated;
-- Signed-in buyers (the functions check ownership / auth.uid() themselves)
grant execute on function public.submit_review(uuid, integer, text, text, text[]) to authenticated;
grant execute on function public.request_return(uuid, jsonb, text, text, text) to authenticated;
grant execute on function public.order_return_request(uuid) to authenticated;
-- Admin / owner (the functions check is_admin() / is_owner() themselves)
grant execute on function public.save_discount_code(uuid, jsonb) to authenticated;
grant execute on function public.delete_discount_code(uuid) to authenticated;
grant execute on function public.set_review_status(uuid, public.review_status) to authenticated;
grant execute on function public.delete_review(uuid) to authenticated;
grant execute on function public.mark_stock_alerts_notified(uuid) to authenticated;
grant execute on function public.list_return_requests(text) to authenticated;
grant execute on function public.update_return_status(uuid, text, text) to authenticated;
grant execute on function public.team_members() to authenticated;
grant execute on function public.invite_team_member(text, text, public.admin_role) to authenticated;
grant execute on function public.update_team_member_role(uuid, public.admin_role) to authenticated;
grant execute on function public.remove_team_member(uuid) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.discount_codes       enable row level security;
alter table public.discount_redemptions enable row level security;
alter table public.reviews              enable row level security;
alter table public.stock_alerts         enable row level security;
alter table public.return_requests      enable row level security;
alter table public.return_items         enable row level security;
alter table public.team_invites         enable row level security;

-- discount codes: admins read (the admin table); owners write; visitors only ever
-- touch codes through validate_discount_code / place_order_with_discount.
drop policy if exists discount_codes_select on public.discount_codes;
create policy discount_codes_select on public.discount_codes for select using (public.is_admin());
drop policy if exists discount_codes_owner_write on public.discount_codes;
create policy discount_codes_owner_write on public.discount_codes for all
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists discount_redemptions_select on public.discount_redemptions;
create policy discount_redemptions_select on public.discount_redemptions for select using (public.is_admin());

-- reviews: approved rows are public, authors see their own, admins see everything.
-- No insert/update/delete policies: writes go through the RPCs above.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());

-- stock alerts: admin read only (subscribe is an RPC so guests never read the table).
drop policy if exists stock_alerts_select on public.stock_alerts;
create policy stock_alerts_select on public.stock_alerts for select using (public.is_admin());

-- returns: the buyer who owns the order and admins can read; writes via RPCs.
drop policy if exists return_requests_select on public.return_requests;
create policy return_requests_select on public.return_requests for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists return_items_select on public.return_items;
create policy return_items_select on public.return_items for select
  using (public.is_admin() or exists (
    select 1 from public.return_requests r where r.id = return_id and r.user_id = auth.uid()));

-- team invites: admins read; writes via owner RPCs.
drop policy if exists team_invites_select on public.team_invites;
create policy team_invites_select on public.team_invites for select using (public.is_admin());

-- =============================================================================
-- Storage: review-photos bucket (public read; buyers write under their own folder)
-- Path convention: reviews/<userId>/<uuid>.<ext>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos', 'review-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "review photos are public" on storage.objects;
create policy "review photos are public" on storage.objects for select
  using (bucket_id = 'review-photos');
drop policy if exists "buyers upload review photos" on storage.objects;
create policy "buyers upload review photos" on storage.objects for insert
  with check (
    bucket_id = 'review-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = 'reviews'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
drop policy if exists "review photos are removed by owner or admin" on storage.objects;
create policy "review photos are removed by owner or admin" on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );
