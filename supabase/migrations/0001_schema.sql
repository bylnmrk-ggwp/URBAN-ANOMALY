-- =============================================================================
-- 0001_schema.sql — footwear store schema, RLS and transactional functions
--
-- Contract: src/lib/supabase/database.types.ts must describe exactly what this
-- file creates. Regenerate with `supabase gen types typescript` after changes.
--
-- Conventions
--   * Money is numeric(12,2) in PHP. Timestamps are timestamptz.
--   * Clients talk to tables through RLS and to state machines through
--     SECURITY DEFINER functions. Functions set the transaction-local GUC
--     `app.bypass_guard = on` so the guard triggers let them write protected
--     columns (stock, reserved_stock, order status/payment/totals).
--   * Functions raise custom SQLSTATE codes mapped by mappers.ts:
--       OS001 out_of_stock   VA001 validation   NF001 not_found
--       CF001 conflict       FB001 forbidden
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum (
  'pending_payment', 'pending_confirmation', 'confirmed', 'processing',
  'shipped', 'delivered', 'cancelled'
);
create type public.payment_status as enum (
  'unpaid', 'pending', 'paid', 'failed', 'refund_pending', 'refunded', 'partially_refunded'
);
create type public.payment_method as enum ('cod', 'online');
create type public.user_role as enum ('buyer', 'admin');
create type public.movement_reason as enum (
  'restock', 'correction', 'damaged', 'returned',
  'order_reserved', 'order_released', 'order_fulfilled'
);
create type public.notification_type as enum (
  'new_order', 'payment_confirmed', 'low_stock', 'order_issue'
);

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.bypass_guard_enabled()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.bypass_guard', true), '') = 'on';
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text not null default '',
  role        public.user_role not null default 'buyer',
  created_at  timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

create table public.addresses (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  label                 text not null,
  address_line          text not null,
  barangay              text not null,
  city                  text not null,
  province              text not null,
  postal_code           text not null,
  delivery_instructions text not null default '',
  is_default            boolean not null default false,
  created_at            timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  image_url   text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',
  details       text[] not null default '{}',
  category_id   uuid not null references public.categories (id) on delete restrict,
  base_price    numeric(12,2) not null check (base_price > 0),
  sale_price    numeric(12,2) check (sale_price is null or (sale_price > 0 and sale_price < base_price)),
  -- Generated so PostgREST can filter/sort on the effective price.
  display_price numeric(12,2) generated always as (coalesce(sale_price, base_price)) stored,
  status        public.product_status not null default 'draft',
  is_featured   boolean not null default false,
  sales_count   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index products_status_created_idx on public.products (status, created_at desc);
create index products_category_idx on public.products (category_id);
create index products_display_price_idx on public.products (display_price);
create index products_sales_count_idx on public.products (sales_count desc);
create index products_name_lower_idx on public.products (lower(name));

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  alt         text not null default '',
  is_primary  boolean not null default false,
  sort_order  integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  sku                 text not null unique,
  size                text not null check (size in ('5', '6', '7', '8', '9', '10', '11', '12')),
  color_name          text not null,
  color_hex           text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  stock               integer not null default 0 check (stock >= 0),
  reserved_stock      integer not null default 0 check (reserved_stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  check (reserved_stock <= stock),
  unique (product_id, size, color_name)
);
create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_size_idx on public.product_variants (size);
create index product_variants_color_idx on public.product_variants (color_name);

create sequence public.order_number_seq;

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,
  user_id               uuid references public.profiles (id) on delete set null,
  customer_name         text not null,
  customer_email        text not null,
  customer_phone        text not null,
  address_line          text not null,
  barangay              text not null,
  city                  text not null,
  province              text not null,
  postal_code           text not null,
  delivery_instructions text not null default '',
  subtotal              numeric(12,2) not null check (subtotal >= 0),
  shipping_fee          numeric(12,2) not null check (shipping_fee >= 0),
  discount              numeric(12,2) not null default 0 check (discount >= 0),
  total                 numeric(12,2) not null check (total >= 0),
  payment_method        public.payment_method not null,
  payment_status        public.payment_status not null,
  status                public.order_status not null,
  courier               text,
  tracking_number       text,
  customer_note         text not null default '',
  admin_notes           text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete restrict,
  variant_id    uuid not null references public.product_variants (id) on delete restrict,
  product_name  text not null,
  product_slug  text not null,
  image_url     text,
  sku           text not null,
  size          text not null,
  color_name    text not null,
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(12,2) not null check (line_total >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  note        text,
  actor       text not null check (actor in ('customer', 'admin', 'system')),
  created_at  timestamptz not null default now()
);
create index order_status_events_order_idx on public.order_status_events (order_id, created_at);

-- Movement semantics: `delta` is the change in AVAILABLE units (reservations
-- count), `stock_after` is the PHYSICAL stock after the movement.
create table public.inventory_movements (
  id                  uuid primary key default gen_random_uuid(),
  variant_id          uuid not null references public.product_variants (id) on delete cascade,
  delta               integer not null,
  stock_after         integer not null,
  reason              public.movement_reason not null,
  note                text not null default '',
  actor               text not null,
  reference_order_id  uuid references public.orders (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_role  public.user_role not null default 'admin',
  type            public.notification_type not null,
  title           text not null,
  message         text not null,
  href            text not null default '',
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index notifications_role_created_idx on public.notifications (recipient_role, created_at desc);

create table public.store_settings (
  id                              integer primary key check (id = 1),
  store_name                      text not null default 'URBAN ANOMALY',
  logo_url                        text,
  contact_email                   text not null default '',
  contact_phone                   text not null default '',
  address                         text not null default '',
  flat_shipping_fee               numeric(12,2) not null default 150,
  free_shipping_threshold         numeric(12,2) not null default 2500,
  cod_enabled                     boolean not null default true,
  online_payment_enabled          boolean not null default false,
  online_payment_configured       boolean not null default false,
  email_notifications_configured  boolean not null default false,
  default_low_stock_threshold     integer not null default 5,
  notify_new_orders               boolean not null default true,
  notify_low_stock                boolean not null default true,
  notify_payment_events           boolean not null default true,
  updated_at                      timestamptz not null default now()
);
insert into public.store_settings (id) values (1);

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Written only by Edge Functions (service role). Clients never read or write it.
create table public.payment_sessions (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null,
  provider_session_id text,
  status              text not null default 'pending',
  redirect_url        text,
  created_at          timestamptz not null default now()
);
create index payment_sessions_order_idx on public.payment_sessions (order_id);

-- -----------------------------------------------------------------------------
-- Views (security_invoker: the caller's RLS applies)
-- -----------------------------------------------------------------------------
create view public.order_summaries with (security_invoker = true) as
select
  o.id, o.order_number, o.user_id, o.customer_name, o.customer_email,
  coalesce((select sum(i.quantity) from public.order_items i where i.order_id = o.id), 0)::integer as item_count,
  o.total, o.payment_method, o.payment_status, o.status, o.created_at
from public.orders o;

create view public.inventory_rows with (security_invoker = true) as
select
  v.id as variant_id,
  p.id as product_id,
  p.name as product_name,
  p.slug as product_slug,
  p.status as product_status,
  (select i.url from public.product_images i where i.product_id = p.id
     order by i.is_primary desc, i.sort_order limit 1) as image_url,
  v.sku, v.size, v.color_name,
  v.stock, v.reserved_stock,
  (v.stock - v.reserved_stock) as available_stock,
  v.low_stock_threshold,
  case
    when v.stock - v.reserved_stock <= 0 then 'out_of_stock'
    when v.stock - v.reserved_stock <= v.low_stock_threshold then 'low_stock'
    else 'in_stock'
  end as stock_status
from public.product_variants v
join public.products p on p.id = v.product_id;

create view public.inventory_movement_rows with (security_invoker = true) as
select
  m.id, m.variant_id, v.sku, p.name as product_name,
  m.delta, m.stock_after, m.reason, m.note, m.actor,
  m.reference_order_id, o.order_number as reference_order_number, m.created_at
from public.inventory_movements m
join public.product_variants v on v.id = m.variant_id
join public.products p on p.id = v.product_id
left join public.orders o on o.id = m.reference_order_id;

-- -----------------------------------------------------------------------------
-- Auth helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_actor()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select email from public.profiles where id = auth.uid()),
    (auth.jwt() ->> 'email'),
    'system'
  );
$$;

-- Creates the profile row on sign-up. Role is ALWAYS the default (buyer);
-- `raw_user_meta_data.role` is deliberately ignored.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only one default address per user.
create or replace function public.ensure_single_default_address()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger addresses_single_default
  after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.ensure_single_default_address();

-- -----------------------------------------------------------------------------
-- Guard triggers: protected columns change only inside SECURITY DEFINER functions
-- -----------------------------------------------------------------------------
create or replace function public.guard_variant_stock()
returns trigger language plpgsql as $$
begin
  if (new.stock <> old.stock or new.reserved_stock <> old.reserved_stock)
     and not public.bypass_guard_enabled() then
    raise exception 'Stock can only be changed through adjust_stock or order functions.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger product_variants_guard_stock
  before update on public.product_variants
  for each row execute function public.guard_variant_stock();

create or replace function public.guard_order_update()
returns trigger language plpgsql as $$
begin
  if not public.bypass_guard_enabled() and (
       new.status <> old.status
    or new.payment_status <> old.payment_status
    or new.payment_method <> old.payment_method
    or new.subtotal <> old.subtotal
    or new.shipping_fee <> old.shipping_fee
    or new.discount <> old.discount
    or new.total <> old.total
    or new.user_id is distinct from old.user_id
    or new.order_number <> old.order_number
  ) then
    raise exception 'Order status, payment and totals change only through order functions.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

create or replace function public.guard_store_settings()
returns trigger language plpgsql as $$
begin
  if not public.bypass_guard_enabled() and (
       new.online_payment_configured <> old.online_payment_configured
    or new.email_notifications_configured <> old.email_notifications_configured
  ) then
    raise exception 'Provider configuration flags are set by the backend only.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger store_settings_guard
  before update on public.store_settings
  for each row execute function public.guard_store_settings();

-- Profile role can only be changed by an admin (or the SQL editor).
create or replace function public.guard_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change roles.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- -----------------------------------------------------------------------------
-- Domain helpers
-- -----------------------------------------------------------------------------
create or replace function public.next_order_number()
returns text language sql volatile as $$
  select 'ORD-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

-- Mirrors ORDER_STATUS_TRANSITIONS in src/features/orders/domain/rules.ts
create or replace function public.can_transition(p_from public.order_status, p_to public.order_status)
returns boolean language sql immutable as $$
  select case p_from
    when 'pending_payment'      then p_to in ('pending_confirmation', 'cancelled')
    when 'pending_confirmation' then p_to in ('confirmed', 'cancelled')
    when 'confirmed'            then p_to in ('processing', 'cancelled')
    when 'processing'           then p_to in ('shipped', 'cancelled')
    when 'shipped'              then p_to in ('delivered')
    else false
  end;
$$;

-- Order row + items + events, same shape as the PostgREST embed used by the client.
create or replace function public.order_json(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items', coalesce((
      select jsonb_agg(to_jsonb(i)) from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'order_status_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at)
      from public.order_status_events e where e.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o where o.id = p_order_id;
$$;

create or replace function public.notify_admins(
  p_type public.notification_type, p_title text, p_message text, p_href text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_role, type, title, message, href)
  values ('admin', p_type, p_title, p_message, coalesce(p_href, ''));
end $$;

create or replace function public.maybe_notify_low_stock(p_variant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  rec record;
  s public.store_settings%rowtype;
begin
  select * into s from public.store_settings where id = 1;
  if not s.notify_low_stock then return; end if;
  select pv.*, p.name as product_name
    into rec
    from public.product_variants pv join public.products p on p.id = pv.product_id
   where pv.id = p_variant_id;
  if not found then return; end if;
  if rec.stock - rec.reserved_stock <= rec.low_stock_threshold then
    perform public.notify_admins(
      'low_stock',
      'Low stock: ' || rec.sku,
      rec.product_name || ' (' || rec.size || ', ' || rec.color_name || ') has ' ||
        greatest(rec.stock - rec.reserved_stock, 0) || ' available.',
      '/admin/inventory'
    );
  end if;
end $$;

create or replace function public.release_order_reservations(p_order_id uuid, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare
  it record;
  v_stock integer;
begin
  perform set_config('app.bypass_guard', 'on', true);
  for it in select * from public.order_items where order_id = p_order_id order by variant_id loop
    update public.product_variants
       set reserved_stock = greatest(reserved_stock - it.quantity, 0)
     where id = it.variant_id
     returning stock into v_stock;
    insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor, reference_order_id)
    values (it.variant_id, it.quantity, v_stock, 'order_released', 'Order cancelled', p_actor, p_order_id);
  end loop;
end $$;

create or replace function public.fulfill_order_reservations(p_order_id uuid, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare
  it record;
  v_stock integer;
begin
  perform set_config('app.bypass_guard', 'on', true);
  for it in select * from public.order_items where order_id = p_order_id order by variant_id loop
    update public.product_variants
       set stock = stock - it.quantity,
           reserved_stock = greatest(reserved_stock - it.quantity, 0)
     where id = it.variant_id
     returning stock into v_stock;
    insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor, reference_order_id)
    values (it.variant_id, -it.quantity, v_stock, 'order_fulfilled', 'Order shipped', p_actor, p_order_id);
    update public.products set sales_count = sales_count + it.quantity where id = it.product_id;
    perform public.maybe_notify_low_stock(it.variant_id);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RPC: place_order(payload jsonb) -> jsonb
-- payload: {
--   customer: { full_name, email, phone },
--   shipping_address: { address_line, barangay, city, province, postal_code, delivery_instructions },
--   payment_method: 'cod' | 'online',
--   items: [{ product_id, variant_id, quantity }],
--   customer_note
-- }
-- returns { order_id, order_number, payment_redirect_url, order }
-- -----------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s            public.store_settings%rowtype;
  v_user       uuid := auth.uid();
  v_method     public.payment_method;
  v_cust       jsonb := payload -> 'customer';
  v_addr       jsonb := payload -> 'shipping_address';
  v_items      jsonb := payload -> 'items';
  v_item       jsonb;
  v_qty        integer;
  v_variant_id uuid;
  v_product_id uuid;
  v            record;
  v_subtotal   numeric(12,2) := 0;
  v_shipping   numeric(12,2);
  v_total      numeric(12,2);
  v_order_id   uuid := gen_random_uuid();
  v_number     text;
  v_status     public.order_status;
  v_pay_status public.payment_status;
  v_redirect   text := null;
  v_actor      text;
begin
  perform set_config('app.bypass_guard', 'on', true);
  select * into s from public.store_settings where id = 1;

  -- ---- validate payload -----------------------------------------------------
  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Your cart is empty.' using errcode = 'VA001';
  end if;
  if nullif(trim(v_cust ->> 'full_name'), '') is null
     or nullif(trim(v_cust ->> 'email'), '') is null
     or nullif(trim(v_cust ->> 'phone'), '') is null then
    raise exception 'Customer name, email and phone are required.' using errcode = 'VA001';
  end if;
  if nullif(trim(v_addr ->> 'address_line'), '') is null
     or nullif(trim(v_addr ->> 'barangay'), '') is null
     or nullif(trim(v_addr ->> 'city'), '') is null
     or nullif(trim(v_addr ->> 'province'), '') is null
     or nullif(trim(v_addr ->> 'postal_code'), '') is null then
    raise exception 'A complete shipping address is required.' using errcode = 'VA001';
  end if;
  begin
    v_method := (payload ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'Choose a payment method.' using errcode = 'VA001';
  end;
  if v_method = 'cod' and not s.cod_enabled then
    raise exception 'Cash on delivery is currently unavailable.' using errcode = 'VA001';
  end if;
  if v_method = 'online' and not s.online_payment_enabled then
    raise exception 'Online payment is currently unavailable.' using errcode = 'VA001';
  end if;
  if (select count(*) from jsonb_array_elements(v_items) e) <>
     (select count(distinct e ->> 'variant_id') from jsonb_array_elements(v_items) e) then
    raise exception 'Duplicate items in cart.' using errcode = 'VA001';
  end if;

  v_actor := coalesce(v_cust ->> 'email', 'customer');

  -- ---- lock variants (deterministic order avoids deadlocks) and price lines ---
  create temp table if not exists _order_lines (
    product_id uuid, variant_id uuid, product_name text, product_slug text, image_url text,
    sku text, size text, color_name text, unit_price numeric(12,2), quantity integer
  ) on commit drop;
  delete from _order_lines;

  for v_item in
    select e from jsonb_array_elements(v_items) e order by (e ->> 'variant_id')
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Quantity must be between 1 and 10.' using errcode = 'VA001';
    end if;
    begin
      v_variant_id := (v_item ->> 'variant_id')::uuid;
      v_product_id := (v_item ->> 'product_id')::uuid;
    exception when others then
      raise exception 'Invalid cart item.' using errcode = 'VA001';
    end;

    select pv.id, pv.product_id, pv.sku, pv.size, pv.color_name, pv.stock, pv.reserved_stock,
           p.name, p.slug, p.status, p.display_price,
           (select i.url from public.product_images i where i.product_id = p.id
              order by i.is_primary desc, i.sort_order limit 1) as image_url
      into v
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
     where pv.id = v_variant_id
       for update of pv;

    if not found then
      raise exception 'An item in your cart is no longer available.' using errcode = 'NF001';
    end if;
    if v.product_id <> v_product_id then
      raise exception 'An item in your cart is no longer available.' using errcode = 'NF001';
    end if;
    if v.status <> 'published' then
      raise exception '% is no longer available.', v.name using errcode = 'VA001';
    end if;
    if v.stock - v.reserved_stock < v_qty then
      raise exception 'Not enough stock for % (%, %). Only % left.',
        v.name, v.size, v.color_name, greatest(v.stock - v.reserved_stock, 0)
        using errcode = 'OS001';
    end if;

    insert into _order_lines values (
      v.product_id, v.id, v.name, v.slug, v.image_url, v.sku, v.size, v.color_name,
      v.display_price, v_qty
    );
    v_subtotal := v_subtotal + (v.display_price * v_qty);
  end loop;

  -- ---- totals computed from DB prices and settings, never from the client ----
  v_shipping := case when v_subtotal >= s.free_shipping_threshold then 0 else s.flat_shipping_fee end;
  v_total := v_subtotal + v_shipping;
  v_number := public.next_order_number();
  if v_method = 'cod' then
    v_status := 'pending_confirmation'; v_pay_status := 'unpaid';
  else
    v_status := 'pending_payment'; v_pay_status := 'pending';
  end if;

  insert into public.orders (
    id, order_number, user_id, customer_name, customer_email, customer_phone,
    address_line, barangay, city, province, postal_code, delivery_instructions,
    subtotal, shipping_fee, discount, total, payment_method, payment_status, status, customer_note
  ) values (
    v_order_id, v_number, v_user,
    trim(v_cust ->> 'full_name'), lower(trim(v_cust ->> 'email')), trim(v_cust ->> 'phone'),
    trim(v_addr ->> 'address_line'), trim(v_addr ->> 'barangay'), trim(v_addr ->> 'city'),
    trim(v_addr ->> 'province'), trim(v_addr ->> 'postal_code'),
    coalesce(v_addr ->> 'delivery_instructions', ''),
    v_subtotal, v_shipping, 0, v_total, v_method, v_pay_status, v_status,
    coalesce(payload ->> 'customer_note', '')
  );

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, image_url,
    sku, size, color_name, unit_price, quantity, line_total
  )
  select v_order_id, product_id, variant_id, product_name, product_slug, image_url,
         sku, size, color_name, unit_price, quantity, unit_price * quantity
    from _order_lines;

  insert into public.order_status_events (order_id, status, note, actor)
  values (v_order_id, v_status, null, 'customer');

  -- ---- reserve stock + audit ------------------------------------------------
  for v in select * from _order_lines order by variant_id loop
    update public.product_variants
       set reserved_stock = reserved_stock + v.quantity
     where id = v.variant_id;
    insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor, reference_order_id)
    select v.variant_id, -v.quantity, pv.stock, 'order_reserved', 'Reserved for ' || v_number, v_actor, v_order_id
      from public.product_variants pv where pv.id = v.variant_id;
    perform public.maybe_notify_low_stock(v.variant_id);
  end loop;

  if s.notify_new_orders then
    perform public.notify_admins(
      'new_order',
      'New order ' || v_number,
      trim(v_cust ->> 'full_name') || ' placed an order for PHP ' || to_char(v_total, 'FM999,999,990.00') || '.',
      '/admin/orders/' || v_order_id
    );
  end if;

  -- ---- online payment handoff ----------------------------------------------
  if v_method = 'online' then
    -- redirect_url stays NULL here. The `create-payment-session` Edge Function
    -- (service role + PayMongo secret key) creates the checkout session, fills
    -- provider_session_id / redirect_url, and the client follows that URL.
    insert into public.payment_sessions (order_id, provider, status)
    values (v_order_id, 'paymongo', 'pending');
    v_redirect := null;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_number,
    'payment_redirect_url', v_redirect,
    'order', public.order_json(v_order_id)
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC: update_order_status (admin)
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order_id uuid, p_status public.order_status, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  v_actor text := public.current_actor();
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'NF001';
  end if;
  if not public.can_transition(o.status, p_status) then
    raise exception 'Cannot move an order from % to %.', o.status, p_status using errcode = 'CF001';
  end if;
  if o.status = 'pending_payment' and p_status = 'pending_confirmation' then
    raise exception 'Online orders are confirmed by the payment provider webhook.' using errcode = 'FB001';
  end if;
  if p_status = 'confirmed' and o.payment_method = 'online' and o.payment_status <> 'paid' then
    raise exception 'This order has not been paid yet.' using errcode = 'CF001';
  end if;

  if p_status = 'cancelled' then
    perform public.release_order_reservations(o.id, v_actor);
    if o.payment_status = 'paid' then
      update public.orders set payment_status = 'refund_pending' where id = o.id;
    elsif o.payment_status = 'pending' then
      update public.orders set payment_status = 'failed' where id = o.id;
    end if;
  elsif p_status = 'shipped' then
    perform public.fulfill_order_reservations(o.id, v_actor);
  end if;

  update public.orders set status = p_status where id = o.id;
  insert into public.order_status_events (order_id, status, note, actor)
  values (o.id, p_status, nullif(trim(coalesce(p_note, '')), ''), 'admin');
end $$;

-- -----------------------------------------------------------------------------
-- RPC: adjust_stock (admin)
-- -----------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_variant_id uuid, p_delta integer, p_reason public.movement_reason, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.product_variants%rowtype;
  v_new integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if p_reason not in ('restock', 'correction', 'damaged', 'returned') then
    raise exception 'Reason must be restock, correction, damaged or returned.' using errcode = 'VA001';
  end if;
  if p_delta = 0 then
    raise exception 'Adjustment cannot be zero.' using errcode = 'VA001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  select * into v from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Variant not found.' using errcode = 'NF001';
  end if;
  v_new := v.stock + p_delta;
  if v_new < 0 then
    raise exception 'Stock cannot go below zero.' using errcode = 'VA001';
  end if;
  if v_new < v.reserved_stock then
    raise exception 'Stock cannot go below the % unit(s) reserved by open orders.', v.reserved_stock
      using errcode = 'VA001';
  end if;

  update public.product_variants set stock = v_new where id = v.id;
  insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor)
  values (v.id, p_delta, v_new, p_reason, coalesce(p_note, ''), public.current_actor());
  perform public.maybe_notify_low_stock(v.id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: mark_cod_payment_collected (admin)
-- -----------------------------------------------------------------------------
create or replace function public.mark_cod_payment_collected(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'NF001';
  end if;
  if o.payment_method <> 'cod' then
    raise exception 'Only cash-on-delivery payments can be recorded by hand.' using errcode = 'FB001';
  end if;
  if o.payment_status <> 'unpaid' then
    raise exception 'This order is already marked as %.', o.payment_status using errcode = 'CF001';
  end if;
  if o.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be marked paid.' using errcode = 'CF001';
  end if;

  update public.orders set payment_status = 'paid' where id = o.id;
  insert into public.order_status_events (order_id, status, note, actor)
  values (o.id, o.status, 'Cash collected on delivery', 'admin');
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cancel_my_order (buyer)
-- -----------------------------------------------------------------------------
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel an order.' using errcode = 'FB001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from auth.uid() then
    raise exception 'Order not found.' using errcode = 'NF001';
  end if;
  if o.status not in ('pending_payment', 'pending_confirmation') then
    raise exception 'This order can no longer be cancelled. Contact us for help.' using errcode = 'CF001';
  end if;

  perform public.release_order_reservations(o.id, public.current_actor());
  update public.orders
     set status = 'cancelled',
         payment_status = case
           when payment_status = 'paid' then 'refund_pending'::public.payment_status
           when payment_status = 'pending' then 'failed'::public.payment_status
           else payment_status end
   where id = o.id;
  insert into public.order_status_events (order_id, status, note, actor)
  values (o.id, 'cancelled', 'Cancelled by customer', 'customer');

  perform public.notify_admins(
    'order_issue',
    'Order ' || o.order_number || ' cancelled',
    o.customer_name || ' cancelled their order.',
    '/admin/orders/' || o.id
  );
end $$;

-- -----------------------------------------------------------------------------
-- RPC: save_product(p_product_id, p_payload) -> uuid (admin)
-- payload: { name, slug, description, details[], category_id, base_price, sale_price,
--            status, is_featured, images: [{id?, url, alt, is_primary, sort_order}],
--            variants: [{id?, sku, size, color_name, color_hex, stock, low_stock_threshold}] }
-- -----------------------------------------------------------------------------
create or replace function public.save_product(p_product_id uuid, p_payload jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid := coalesce(p_product_id, gen_random_uuid());
  v_actor   text := public.current_actor();
  img       jsonb;
  var       jsonb;
  v_vid     uuid;
  v_old     public.product_variants%rowtype;
  v_stock   integer;
  v_keep    uuid[] := '{}';
  v_removed record;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  if p_payload -> 'variants' is null or jsonb_array_length(p_payload -> 'variants') = 0 then
    raise exception 'A product needs at least one variant.' using errcode = 'VA001';
  end if;
  if p_payload -> 'images' is null or jsonb_array_length(p_payload -> 'images') = 0 then
    raise exception 'A product needs at least one image.' using errcode = 'VA001';
  end if;

  insert into public.products (
    id, name, slug, description, details, category_id, base_price, sale_price, status, is_featured
  ) values (
    v_id,
    trim(p_payload ->> 'name'),
    trim(p_payload ->> 'slug'),
    coalesce(p_payload ->> 'description', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'details', '[]'::jsonb)) x), '{}'),
    (p_payload ->> 'category_id')::uuid,
    (p_payload ->> 'base_price')::numeric,
    nullif(p_payload ->> 'sale_price', '')::numeric,
    coalesce((p_payload ->> 'status')::public.product_status, 'draft'),
    coalesce((p_payload ->> 'is_featured')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    details = excluded.details,
    category_id = excluded.category_id,
    base_price = excluded.base_price,
    sale_price = excluded.sale_price,
    status = excluded.status,
    is_featured = excluded.is_featured;

  -- Images are replaced wholesale; order_items keep their own image_url copy.
  delete from public.product_images where product_id = v_id;
  for img in select e from jsonb_array_elements(p_payload -> 'images') e loop
    insert into public.product_images (product_id, url, alt, is_primary, sort_order)
    values (
      v_id, img ->> 'url', coalesce(img ->> 'alt', ''),
      coalesce((img ->> 'is_primary')::boolean, false),
      coalesce((img ->> 'sort_order')::integer, 0)
    );
  end loop;

  -- Variants: upsert by id, stock deltas are audited as movements.
  for var in select e from jsonb_array_elements(p_payload -> 'variants') e loop
    v_vid := nullif(var ->> 'id', '')::uuid;
    v_stock := coalesce((var ->> 'stock')::integer, 0);
    select * into v_old from public.product_variants where id = v_vid and product_id = v_id for update;

    if found then
      if v_stock < v_old.reserved_stock then
        raise exception 'Stock for % cannot go below the % unit(s) reserved by open orders.',
          v_old.sku, v_old.reserved_stock using errcode = 'VA001';
      end if;
      update public.product_variants
         set sku = trim(var ->> 'sku'),
             size = var ->> 'size',
             color_name = trim(var ->> 'color_name'),
             color_hex = var ->> 'color_hex',
             stock = v_stock,
             low_stock_threshold = coalesce((var ->> 'low_stock_threshold')::integer, low_stock_threshold)
       where id = v_old.id;
      if v_stock <> v_old.stock then
        insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor)
        values (v_old.id, v_stock - v_old.stock, v_stock, 'correction', 'Set from product form', v_actor);
      end if;
      v_keep := array_append(v_keep, v_old.id);
    else
      insert into public.product_variants (product_id, sku, size, color_name, color_hex, stock, low_stock_threshold)
      values (
        v_id, trim(var ->> 'sku'), var ->> 'size', trim(var ->> 'color_name'), var ->> 'color_hex',
        v_stock, coalesce((var ->> 'low_stock_threshold')::integer, 5)
      )
      returning id into v_vid;
      if v_stock > 0 then
        insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, actor)
        values (v_vid, v_stock, v_stock, 'restock', 'Initial stock', v_actor);
      end if;
      v_keep := array_append(v_keep, v_vid);
    end if;
  end loop;

  -- Remove variants dropped from the form. Variants with order history cannot be
  -- deleted (FK restrict); surface a clear conflict instead.
  for v_removed in
    select pv.id, pv.sku from public.product_variants pv
     where pv.product_id = v_id and not (pv.id = any (v_keep))
  loop
    if exists (select 1 from public.order_items oi where oi.variant_id = v_removed.id) then
      raise exception 'Variant % has been ordered before and cannot be removed. Set its stock to 0 instead.',
        v_removed.sku using errcode = 'CF001';
    end if;
    delete from public.product_variants where id = v_removed.id;
  end loop;

  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- RPC: dashboard_summary(p_days) -> jsonb (admin)
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_summary(p_days integer)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;

  select jsonb_build_object(
    'kpis', (
      select jsonb_build_object(
        'total_sales', coalesce(sum(total) filter (where status <> 'cancelled' and created_at >= v_from), 0),
        'total_orders', count(*) filter (where created_at >= v_from),
        'pending_orders', count(*) filter (where status in ('pending_payment', 'pending_confirmation')),
        'processing_orders', count(*) filter (where status in ('confirmed', 'processing')),
        'delivered_orders', count(*) filter (where status = 'delivered' and created_at >= v_from),
        'total_products', (select count(*) from public.products where status <> 'archived'),
        'low_stock_products', (
          select count(distinct product_id) from public.inventory_rows
           where product_status = 'published' and stock_status <> 'in_stock'
        )
      ) from public.orders
    ),
    'sales_series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(d, 'YYYY-MM-DD'),
        'sales', coalesce((select sum(o.total) from public.orders o
                            where o.status <> 'cancelled' and date_trunc('day', o.created_at) = d), 0),
        'orders', coalesce((select count(*) from public.orders o
                             where date_trunc('day', o.created_at) = d), 0)
      ) order by d), '[]'::jsonb)
      from generate_series(v_from, date_trunc('day', now()), interval '1 day') d
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]'::jsonb)
      from (select * from public.order_summaries order by created_at desc limit 5) s
    ),
    'best_sellers', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.units_sold desc), '[]'::jsonb)
      from (
        select oi.product_id, p.name as product_name, p.slug as product_slug,
               (select i.url from public.product_images i where i.product_id = p.id
                  order by i.is_primary desc, i.sort_order limit 1) as image_url,
               sum(oi.quantity)::integer as units_sold,
               sum(oi.line_total) as revenue
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
          join public.products p on p.id = oi.product_id
         where o.status <> 'cancelled' and o.created_at >= v_from
         group by oi.product_id, p.name, p.slug, p.id
         order by units_sold desc
         limit 5
      ) b
    ),
    'low_stock', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.available_stock), '[]'::jsonb)
      from (
        select * from public.inventory_rows
         where product_status = 'published' and stock_status <> 'in_stock'
         order by available_stock, sku limit 5
      ) r
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (
        select e.id, 'order'::text as type,
               'Order ' || o.order_number || ' ' ||
                 case e.status
                   when 'pending_payment' then 'awaiting payment'
                   when 'pending_confirmation' then 'placed'
                   else replace(e.status::text, '_', ' ') end as message,
               '/admin/orders/' || o.id as href, e.created_at
          from public.order_status_events e join public.orders o on o.id = e.order_id
        union all
        select m.id, 'inventory', m.sku || ' ' || (case when m.delta >= 0 then '+' else '' end) || m.delta ||
               ' (' || replace(m.reason::text, '_', ' ') || ')',
               '/admin/inventory', m.created_at
          from public.inventory_movement_rows m
         where m.reason in ('restock', 'correction', 'damaged', 'returned')
        union all
        select p.id, 'product', 'Product "' || p.name || '" updated', '/admin/products/' || p.id || '/edit', p.updated_at
          from public.products p
        order by created_at desc
        limit 10
      ) a
    )
  ) into result;

  return result;
end $$;

-- -----------------------------------------------------------------------------
-- RPC: customer_summaries(p_search) -> jsonb (admin)
-- -----------------------------------------------------------------------------
create or replace function public.customer_summaries(p_search text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  q text := '%' || coalesce(trim(p_search), '') || '%';
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(c) order by c.last_order_at desc nulls last, c.created_at desc), '[]'::jsonb)
    from (
      select pr.id, pr.full_name, pr.email, pr.phone,
             (count(o.id) filter (where o.status <> 'cancelled'))::integer as total_orders,
             coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as total_spent,
             max(o.created_at) as last_order_at,
             pr.created_at
        from public.profiles pr
        left join public.orders o on o.user_id = pr.id
       where pr.role = 'buyer'
         and (p_search is null or trim(p_search) = ''
              or pr.full_name ilike q or pr.email ilike q or pr.phone ilike q)
       group by pr.id
    ) c
  );
end $$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.place_order(jsonb) from public;
revoke all on function public.update_order_status(uuid, public.order_status, text) from public;
revoke all on function public.adjust_stock(uuid, integer, public.movement_reason, text) from public;
revoke all on function public.mark_cod_payment_collected(uuid) from public;
revoke all on function public.cancel_my_order(uuid) from public;
revoke all on function public.save_product(uuid, jsonb) from public;
revoke all on function public.dashboard_summary(integer) from public;
revoke all on function public.customer_summaries(text) from public;
revoke all on function public.order_json(uuid) from public;
revoke all on function public.notify_admins(public.notification_type, text, text, text) from public;
revoke all on function public.maybe_notify_low_stock(uuid) from public;
revoke all on function public.release_order_reservations(uuid, text) from public;
revoke all on function public.fulfill_order_reservations(uuid, text) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, public.movement_reason, text) to authenticated;
grant execute on function public.mark_cod_payment_collected(uuid) to authenticated;
grant execute on function public.save_product(uuid, jsonb) to authenticated;
grant execute on function public.dashboard_summary(integer) to authenticated;
grant execute on function public.customer_summaries(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_events enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.notifications       enable row level security;
alter table public.store_settings      enable row level security;
alter table public.payment_sessions    enable row level security;

-- profiles: own row read/update (role change blocked by trigger); admins read all.
create policy profiles_select_own  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own  on public.profiles for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- addresses: owner full access; admins read.
create policy addresses_select on public.addresses for select using (user_id = auth.uid() or public.is_admin());
create policy addresses_insert on public.addresses for insert with check (user_id = auth.uid());
create policy addresses_update on public.addresses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_delete on public.addresses for delete using (user_id = auth.uid());

-- catalog: public read of published products (admins see everything), admin write.
create policy categories_select on public.categories for select using (true);
create policy categories_admin  on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy products_select on public.products for select
  using (status = 'published' or public.is_admin());
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy product_images_select on public.product_images for select
  using (public.is_admin() or exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy product_images_admin on public.product_images for all using (public.is_admin()) with check (public.is_admin());

create policy product_variants_select on public.product_variants for select
  using (public.is_admin() or exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'));
-- Admins may edit variant metadata directly; stock columns are guarded by trigger.
create policy product_variants_admin on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

-- orders: buyers read own; admins read all and update (guarded) non-state columns.
-- No INSERT policy: orders are created only by place_order().
create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_select on public.order_items for select
  using (public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy order_status_events_select on public.order_status_events for select
  using (public.is_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- inventory movements: admins read; writes only via functions.
create policy inventory_movements_select on public.inventory_movements for select using (public.is_admin());

-- notifications: admins read/update; inserts only via functions / backend.
create policy notifications_select on public.notifications for select using (public.is_admin());
create policy notifications_update on public.notifications for update using (public.is_admin()) with check (public.is_admin());

-- store settings: public read (storefront needs shipping rules), admin update (guarded).
create policy store_settings_select on public.store_settings for select using (true);
create policy store_settings_update on public.store_settings for update using (public.is_admin()) with check (public.is_admin());

-- payment_sessions: no client policies at all (service role only).

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- -----------------------------------------------------------------------------
-- Storage: product-images bucket (public read, admin write)
-- Path convention: products/<productId>/<uuid>.<ext>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are public" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
