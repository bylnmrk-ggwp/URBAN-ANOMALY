# Edge Functions (not yet implemented)

These functions complete the payment and email flows. They run server-side with the service
role key and provider secrets; **none of these secrets may ever reach the Vite bundle**.

Each function lives in `supabase/functions/<name>/index.ts` (Deno). Deploy with
`supabase functions deploy <name>` and set secrets with `supabase secrets set`.

## `create-payment-session`

Trigger: called by the storefront right after `place_order` returns an order with
`payment_method = 'online'` (or by a database webhook on `payment_sessions` INSERT).

1. Verify the caller's JWT (or that the order is a fresh guest order) and load the order.
2. Create a PayMongo Checkout Session (`POST https://api.paymongo.com/v1/checkout_sessions`)
   using `PAYMONGO_SECRET_KEY`, with line items from `order_items`, amount in centavos,
   `success_url = <SITE_URL>/orders/confirmation/<order_number>`,
   `cancel_url = <SITE_URL>/checkout`, and `metadata.order_id`.
3. Update `payment_sessions` (`provider_session_id`, `redirect_url`, `status = 'created'`).
4. Return `{ redirect_url }` to the client, which navigates to it.

Secrets: `PAYMONGO_SECRET_KEY`, `SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## `paymongo-webhook`

Trigger: PayMongo webhook (`checkout_session.payment.paid`, `payment.failed`, refunds).

1. Verify the `Paymongo-Signature` header with `PAYMONGO_WEBHOOK_SECRET`; reject otherwise.
2. Look up the order through `payment_sessions.provider_session_id` (or metadata).
3. On paid, in one transaction with `app.bypass_guard = on`:
   - `orders.payment_status = 'paid'`, `status = 'pending_confirmation'`
     (only if the order is still `pending_payment`; a cancelled order gets `refund_pending`),
   - insert an `order_status_events` row (actor `system`),
   - insert a `notifications` row of type `payment_confirmed` when
     `store_settings.notify_payment_events` is true,
   - mark the `payment_sessions` row `paid`.
4. On failure set `payment_status = 'failed'`; on refund set `refunded`/`partially_refunded`.
5. Must be idempotent: ignore events whose session is already in the target state.

Secrets: `PAYMONGO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

## `send-order-email`

Trigger: Supabase Database Webhook on `orders` INSERT and on `order_status_events` INSERT.

1. Load order + items with the service role.
2. Render the email (order placed, payment confirmed, shipped with tracking, delivered,
   cancelled) and send with Resend (`RESEND_API_KEY`, `FROM_EMAIL`) to `customer_email`;
   copy `store_settings.contact_email` on new orders.
3. Never fail the webhook on a soft error; log and return 200.

Secrets: `RESEND_API_KEY`, `FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Configuration flags

After secrets are verified, the functions (or an operator in the SQL editor) set
`store_settings.online_payment_configured` / `email_notifications_configured` to `true` using
`set_config('app.bypass_guard', 'on', true)`; clients cannot change those columns.
