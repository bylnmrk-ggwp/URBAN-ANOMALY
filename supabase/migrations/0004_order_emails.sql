-- EmailJS order notifications.
--
-- The emails themselves are sent from the browser by `src/lib/email` (EmailJS is a
-- browser SDK), so nothing here sends mail. What the database owns is the in-app
-- record of the second flow:
--
--   Flow 1  customer places an order -> `place_order` already inserts the
--           `new_order` admin notification; the browser sends the admin email.
--   Flow 2  admin changes an order status -> the browser emails the customer and
--           then calls `record_order_update_notification` so staff can see in-app
--           that the mail went out (or why it did not). `notifications` has no
--           client insert policy, hence the SECURITY DEFINER RPC.

alter type public.notification_type add value if not exists 'order_update';

create or replace function public.record_order_update_notification(
  p_order_id uuid,
  p_emailed  boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  o        public.orders%rowtype;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can record order update notifications.';
  end if;

  select * into o from public.orders where id = p_order_id;
  if not found then return; end if;

  v_status := initcap(replace(o.status::text, '_', ' '));

  perform public.notify_admins(
    'order_update',
    'Order ' || o.order_number || ' updated',
    case
      when p_emailed then
        o.customer_name || ' was emailed at ' || o.customer_email || ': ' || v_status || '.'
      else
        'Status is now ' || v_status || '. No email was sent.'
    end,
    '/admin/orders/' || o.id::text
  );
end $$;

revoke all on function public.record_order_update_notification(uuid, boolean) from public;
grant execute on function public.record_order_update_notification(uuid, boolean) to authenticated;
