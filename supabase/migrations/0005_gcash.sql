-- 0005_gcash.sql — GCash via QR code
-- Apply after 0004_order_emails.sql. Idempotent.
--
-- The store owner uploads their GCash QR image (it goes to the `cms-media` bucket like every
-- other admin upload) and enters the account name and number in Store Settings. At checkout
-- the buyer scans the QR, pays from the GCash app and types the reference number printed on
-- the receipt. The order is created in `pending_confirmation` with `payment_status =
-- 'pending'`; an admin matches the reference in the GCash app, calls
-- `mark_gcash_payment_verified`, and only then can the order be confirmed.
--
-- `alter type ... add value` must come first and the new value must not be *used* by any
-- other statement in this transaction. Only function bodies below mention 'gcash', and
-- plpgsql resolves those literals when the function runs, not when it is created (the same
-- pattern 0004 relies on for the `order_update` notification type).

alter type public.payment_method add value if not exists 'gcash';

alter table public.orders
  add column if not exists payment_reference text;

alter table public.store_settings
  add column if not exists gcash_enabled      boolean not null default false,
  add column if not exists gcash_account_name text    not null default '',
  add column if not exists gcash_number       text    not null default '',
  add column if not exists gcash_qr_url       text;

-- -----------------------------------------------------------------------------
-- Views: `order_summaries` gains `payment_reference` (appended; `create or replace view`
-- only allows new trailing columns). `order_json(uuid)` is `to_jsonb(o)`-based, so
-- `place_order`'s return value and `track_order` already include the new column.
-- -----------------------------------------------------------------------------
create or replace view public.order_summaries with (security_invoker = true) as
select
  o.id, o.order_number, o.user_id, o.customer_name, o.customer_email,
  coalesce((select sum(i.quantity) from public.order_items i where i.order_id = o.id), 0)::integer as item_count,
  o.total, o.payment_method, o.payment_status, o.status, o.created_at,
  o.payment_reference
from public.orders o;

-- -----------------------------------------------------------------------------
-- RPC: place_order(payload jsonb) -> jsonb
-- payload: {
--   customer: { full_name, email, phone },
--   shipping_address: { address_line, barangay, city, province, postal_code, delivery_instructions },
--   payment_method: 'cod' | 'online' | 'gcash',
--   payment_reference: text | null      -- required for 'gcash', ignored otherwise
--   items: [{ product_id, variant_id, quantity }],
--   customer_note,
--   discount_code: text | null          -- still ignored until the discounts migration lands
-- }
-- returns { order_id, order_number, payment_redirect_url, order }
-- Identical to 0001 apart from the GCash validation, initial state and stored reference.
-- -----------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s            public.store_settings%rowtype;
  v_user       uuid := auth.uid();
  v_method     public.payment_method;
  v_reference  text := null;
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
  if v_method = 'gcash' then
    -- The option is only shown once the owner enabled it and uploaded the QR.
    if not s.gcash_enabled or coalesce(s.gcash_qr_url, '') = '' then
      raise exception 'GCash is currently unavailable.' using errcode = 'VA001';
    end if;
    -- Mirrors GCASH_REFERENCE_PATTERN in src/features/orders/domain/rules.ts.
    v_reference := trim(coalesce(payload ->> 'payment_reference', ''));
    if v_reference !~ '^[A-Za-z0-9]{8,20}$' then
      raise exception 'Enter the 8-20 character reference number from your GCash receipt.'
        using errcode = 'VA001';
    end if;
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
  elsif v_method = 'gcash' then
    -- The buyer has already sent the money; an admin verifies the reference before confirming.
    v_status := 'pending_confirmation'; v_pay_status := 'pending';
  else
    v_status := 'pending_payment'; v_pay_status := 'pending';
  end if;

  insert into public.orders (
    id, order_number, user_id, customer_name, customer_email, customer_phone,
    address_line, barangay, city, province, postal_code, delivery_instructions,
    subtotal, shipping_fee, discount, total, payment_method, payment_status, payment_reference,
    status, customer_note
  ) values (
    v_order_id, v_number, v_user,
    trim(v_cust ->> 'full_name'), lower(trim(v_cust ->> 'email')), trim(v_cust ->> 'phone'),
    trim(v_addr ->> 'address_line'), trim(v_addr ->> 'barangay'), trim(v_addr ->> 'city'),
    trim(v_addr ->> 'province'), trim(v_addr ->> 'postal_code'),
    coalesce(v_addr ->> 'delivery_instructions', ''),
    v_subtotal, v_shipping, 0, v_total, v_method, v_pay_status, v_reference, v_status,
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
-- Identical to 0001 except that GCash, like online payment, must be `paid` before an
-- admin can confirm the order (mirrors `getAvailableAdminActions` / `isPrepaidMethod`).
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
  if p_status = 'confirmed' and o.payment_method in ('online', 'gcash') and o.payment_status <> 'paid' then
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
-- RPC: mark_gcash_payment_verified (admin)
-- The GCash counterpart of `mark_cod_payment_collected`: the admin found the buyer's
-- reference in the store's GCash transactions, so `pending` becomes `paid`. Raises the
-- `payment_confirmed` admin notification (subject to the "Payment events" toggle).
-- -----------------------------------------------------------------------------
create or replace function public.mark_gcash_payment_verified(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  s public.store_settings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  perform set_config('app.bypass_guard', 'on', true);

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'NF001';
  end if;
  if o.payment_method <> 'gcash' then
    raise exception 'Only GCash payments can be verified by hand.' using errcode = 'FB001';
  end if;
  if o.payment_status <> 'pending' then
    raise exception 'This order is already marked as %.', o.payment_status using errcode = 'CF001';
  end if;
  if o.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be marked paid.' using errcode = 'CF001';
  end if;

  update public.orders set payment_status = 'paid' where id = o.id;
  insert into public.order_status_events (order_id, status, note, actor)
  values (
    o.id, o.status,
    'GCash payment verified (ref. ' || coalesce(o.payment_reference, 'n/a') || ').',
    'admin'
  );

  select * into s from public.store_settings where id = 1;
  if s.notify_payment_events then
    perform public.notify_admins(
      'payment_confirmed',
      'Payment received for ' || o.order_number,
      'GCash payment of PHP ' || to_char(o.total, 'FM999,999,990.00') || ' verified for ' || o.customer_name || '.',
      '/admin/orders/' || o.id::text
    );
  end if;
end $$;

revoke all on function public.mark_gcash_payment_verified(uuid) from public;
grant execute on function public.mark_gcash_payment_verified(uuid) to authenticated;
