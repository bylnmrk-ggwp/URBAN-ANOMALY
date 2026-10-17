-- 0007_restore_function_grants.sql
--
-- Restores the function privileges that migrations 0001-0004 intended to set.
--
-- Those migrations guard each RPC with
--
--     revoke all on function public.f(...) from public;
--     grant execute on function public.f(...) to authenticated;
--
-- which does not do what it reads like. Supabase ships default privileges on
-- the `public` schema that grant EXECUTE directly to `anon`, `authenticated`
-- and `service_role` on every function created there:
--
--     pg_default_acl: nspname=public, objtype=f
--       {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
--        service_role=X/postgres}
--
-- `PUBLIC` therefore never holds the privilege that those statements revoke,
-- and `anon` keeps an explicit grant of its own. The result on a live project
-- is that every function in `public` is callable through
-- `/rest/v1/rpc/<name>` without signing in. Most of them open with
-- `if not public.is_admin() then raise exception` and so merely fail noisily,
-- but the unguarded `SECURITY DEFINER` helpers (`notify_admins`,
-- `cms_publish_internal`, `cms_audit`, `cms_run_scheduled`, `order_json`,
-- `cms_document_json`, `cms_media_json`, `release_order_reservations`,
-- `fulfill_order_reservations`, `maybe_notify_low_stock`) run with the
-- definer's rights for anyone who asks.
--
-- 0005 and 0006 already use the correct form (`from public, anon,
-- authenticated`), so this migration re-establishes the whole intended surface
-- in one place: revoke EXECUTE from both client roles on everything in
-- `public`, then grant back exactly the calls the app makes. Anything added
-- later needs its own explicit grant here or in its own migration, and must
-- name `anon` and `authenticated` when it revokes.
--
-- `service_role` and `postgres` keep their privileges: the service role is the
-- server-side key and is never exposed to a browser.

-- 1. Clear the inherited grants from every function in the schema, including
--    the trigger functions and internal helpers that no client should reach.
do $$
declare
  fn text;
begin
  for fn in
    select format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from anon, authenticated', fn);
  end loop;
end
$$;

-- 2. Storefront calls, reachable before sign-in.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;
grant execute on function public.is_plausible_email(text) to anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.place_order_with_discount(jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.validate_discount_code(text, numeric) to anon, authenticated;
grant execute on function public.review_summary(uuid) to anon, authenticated;
grant execute on function public.subscribe_stock_alert(uuid, text) to anon, authenticated;

-- 3. Buyer account calls.
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.submit_review(uuid, integer, text, text, text[]) to authenticated;
grant execute on function public.request_return(uuid, jsonb, text, text, text) to authenticated;
grant execute on function public.order_return_request(uuid) to authenticated;

-- 4. Admin calls. Each one still checks `is_admin()` or `is_owner()` itself;
--    the grant only keeps unauthenticated callers off the endpoint.
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, public.movement_reason, text) to authenticated;
grant execute on function public.mark_cod_payment_collected(uuid) to authenticated;
grant execute on function public.mark_gcash_payment_verified(uuid) to authenticated;
grant execute on function public.save_product(uuid, jsonb) to authenticated;
grant execute on function public.dashboard_summary(integer) to authenticated;
grant execute on function public.customer_summaries(text) to authenticated;
grant execute on function public.record_order_update_notification(uuid, boolean) to authenticated;
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

-- 5. CMS authoring calls.
grant execute on function public.cms_save_draft(text, jsonb, integer) to authenticated;
grant execute on function public.cms_publish(text, text) to authenticated;
grant execute on function public.cms_restore_revision(text, integer) to authenticated;
grant execute on function public.cms_create_page(text, text, jsonb) to authenticated;
grant execute on function public.cms_delete_page(text) to authenticated;
grant execute on function public.cms_register_media(text, text, text, text, integer, integer, integer) to authenticated;
grant execute on function public.cms_update_media_alt(text, text) to authenticated;
grant execute on function public.cms_media_usages(text) to authenticated;
grant execute on function public.cms_delete_media(text) to authenticated;
grant execute on function public.cms_schedule_publish(text, timestamptz) to authenticated;
grant execute on function public.cms_cancel_schedule(text) to authenticated;
