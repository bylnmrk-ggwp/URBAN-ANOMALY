-- Guest order tracking.
--
-- RLS on public.orders only lets the owning buyer (or an admin) read a row, so an anonymous
-- visitor cannot select by order number. This SECURITY DEFINER function performs the lookup
-- server-side and only returns an order when BOTH the order number and the customer email
-- match, which keeps guessable order numbers from leaking anything on their own.

create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_order_id uuid;
begin
  if coalesce(trim(p_order_number), '') = '' or coalesce(trim(p_email), '') = '' then
    return null;
  end if;

  select o.id into v_order_id
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and lower(o.customer_email) = lower(trim(p_email))
  limit 1;

  if v_order_id is null then
    return null;
  end if;

  return public.order_json(v_order_id);
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
