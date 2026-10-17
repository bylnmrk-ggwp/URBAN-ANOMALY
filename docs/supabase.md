# Supabase Integration

The app runs against in-memory mocks by default (`VITE_DATA_MODE=mock`). This document explains
how to point it at a real Supabase project, what the schema looks like, and what is still
missing.

## 1. Connect a project

1. Create a project at <https://supabase.com/dashboard>. Note the **Project URL** and the
   **publishable (anon) key** from _Settings > API_. Never copy the service-role key anywhere
   near this repository.
2. Apply the schema. Either paste `supabase/migrations/0001_schema.sql` into the SQL editor, or
   with the CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

3. Configure the storefront in `.env.local`:

   ```bash
   VITE_DATA_MODE=supabase
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

   `src/config/env.ts` refuses to start in `supabase` mode without both values.

4. Auth settings (_Authentication > Providers > Email_): enable email/password and leave
   **Confirm signup** on. Sign-up then returns no session and the app sends the buyer to the
   verification screen to type the emailed code; section 14 covers the email template and SMTP
   settings that flow also needs. Set _Site URL_ and add `http://localhost:5173/login` to the
   redirect allow-list so password reset links return to the app.

5. Create the first admin. Sign up through the app (or the dashboard), then in the SQL editor
   run both statements together (one run = one transaction):

   ```sql
   select set_config('app.bypass_guard', 'on', true);
   update public.profiles set role = 'admin', admin_role = 'owner' where email = 'you@example.com';
   ```

   Roles live only in `profiles.role`; the client never writes it and `is_admin()` reads it on
   every privileged query. From 0006 on, `role` changes outside an owner session need the
   `app.bypass_guard` setting and every admin must carry an `admin_role` (section 12). Sign out
   and back in so the app refreshes the profile.

6. Seed categories/products through the admin UI (`/admin/products/new`) or with SQL.

## 2. Storage: `product-images`

The migration creates a public bucket `product-images` with read-for-everyone and
insert/update/delete for admins only.

- Upload path convention: `products/<productId>/<uuid>.<ext>`; store the resulting public URL
  (`https://<ref>.supabase.co/storage/v1/object/public/product-images/products/...`) in
  `product_images.url`.
- The admin product form currently stores **URLs** typed or pasted by the admin. Direct uploads
  are the next step: add a small `StorageAdapter` (`upload(file, path) => Promise<url>`) in
  `src/lib/supabase/` backed by `getSupabaseClient().storage.from('product-images')` and call it
  from the image field before submitting the form. No schema change is required.

## 3. Regenerating types

`src/lib/supabase/database.types.ts` is hand-written in the exact shape the CLI emits so it can
be replaced wholesale after schema changes:

```bash
supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
```

Then run `npx tsc -p tsconfig.app.json --noEmit`; the repositories and mappers will flag any
drift between SQL and TypeScript.

## 4. Code map

| File                                                   | Purpose                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `src/lib/supabase/client.ts`                           | Lazy singleton `SupabaseClient<Database>` (publishable key only).                         |
| `src/lib/supabase/database.types.ts`                   | Generated-style `Database` type: tables, views, functions, enums.                         |
| `src/lib/supabase/mappers.ts`                          | Row -> domain mappers, zod schemas for `jsonb` RPC results, `mapSupabaseError`, `unwrap`. |
| `src/lib/supabase/createSupabaseRepositories.ts`       | Factory used by `src/config/repositories.ts` when `VITE_DATA_MODE=supabase`.              |
| `src/features/*/infrastructure/Supabase*Repository.ts` | One class per domain repository interface.                                                |
| `supabase/migrations/0001_schema.sql`                  | Schema, RLS, triggers, SQL functions, realtime, storage bucket.                           |
| `supabase/migrations/0006_features_round2.sql`         | Discounts, reviews, back-in-stock alerts, returns and team (section 12).                  |
| `supabase/functions/README.md`                         | Spec for the Edge Functions that are not written yet.                                     |

Presentation code never imports from `@/lib/supabase`; everything goes through
`repositories` from `@/config/repositories`.

## 5. Table -> domain mapping

| Table / view                                                      | Domain type                                 | Mapper                            | Notes                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `profiles` + `addresses`                                          | `AuthUser`, `SavedAddress`                  | `toAuthUser`                      | Profile row is created by the `handle_new_user` trigger with role `buyer`.                                  |
| `categories` (+ `products(count)`)                                | `Category`                                  | `toCategory`                      | `productCount` counts published products.                                                                   |
| `products` + `product_images` + `product_variants` + `categories` | `Product`, `ProductImage`, `ProductVariant` | `toProduct` / `toProductFromJoin` | Fetched with one PostgREST embed. `display_price` is a generated column used for price filters and sorting. |
| `orders` + `order_items` + `order_status_events`                  | `Order`, `OrderItem`, `OrderStatusEvent`    | `toOrder` / `toOrderFromJoin`     | `tracking` is derived from `courier` + `tracking_number`.                                                   |
| view `order_summaries`                                            | `OrderSummary`                              | `toOrderSummary`                  | Adds `item_count`; `security_invoker` so RLS of `orders` applies.                                           |
| view `inventory_rows`                                             | `InventoryRow`                              | `toInventoryRow`                  | Adds product info, primary image, `available_stock`, `stock_status`.                                        |
| view `inventory_movement_rows`                                    | `InventoryMovement`                         | `toInventoryMovement`             | Joins SKU, product name and referenced order number.                                                        |
| `notifications`                                                   | `AppNotification`                           | `toNotification`                  | Admin-only; realtime INSERTs feed `subscribe()`.                                                            |
| `store_settings` (single row, id = 1)                             | `StoreSettings`                             | `toSettings`                      | `*_configured` flags are backend-owned.                                                                     |
| RPC `dashboard_summary`                                           | `DashboardSummary`                          | `toDashboardSummary`              | `isDemoData: false`.                                                                                        |
| RPC `customer_summaries`                                          | `Customer`                                  | `toCustomer`                      | Registered buyers only; guest orders are not customers.                                                     |
| `payment_sessions`                                                | -                                           | -                                 | Edge Functions only; no client policies.                                                                    |

### Storefront filters

- Search: `or(name.ilike.%q%,description.ilike.%q%)`; commas/parentheses are stripped first.
- Category: `categories!inner` + `eq('categories.slug', ...)`.
- Sizes/colours: a second aliased embed `variant_filter:product_variants!inner(id)` with
  `in('variant_filter.size', ...)`, so the full variant list is still returned.
- Price: `gte/lte` on `display_price`. Sorting by price also uses `display_price`.
- Pagination: `.range()` with `count: 'exact'`.
- Admin `stock_asc` sort is applied client-side within the fetched page (aggregate ordering is
  not expressible in PostgREST).

## 6. SQL functions (RPC)

All state transitions are `SECURITY DEFINER` functions. They set the transaction-local GUC
`app.bypass_guard = on`; triggers block direct client writes to `product_variants.stock /
reserved_stock`, `orders.status / payment_status / totals` and the settings `*_configured`
flags unless that GUC is set.

| Function                                                | Who                 | What                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `place_order(payload jsonb) -> jsonb`                   | anon, authenticated | Validates payload, locks variants `FOR UPDATE` in a deterministic order, checks `stock - reserved_stock >= qty`, prices from `display_price`, shipping from `store_settings`, inserts order + items + event, reserves stock, writes movements, notifies admins, inserts a pending `payment_sessions` row for online payment. Returns `{ order_id, order_number, payment_redirect_url, order }`. |
| `cancel_my_order(p_order_id)`                           | buyer (owner)       | Only while `pending_payment` / `pending_confirmation`; releases reservations, sets `refund_pending` if already paid, notifies admins.                                                                                                                                                                                                                                                           |
| `update_order_status(p_order_id, p_status, p_note)`     | admin               | Enforces `ORDER_STATUS_TRANSITIONS`; `shipped` fulfils stock and bumps `sales_count`; `cancelled` releases reservations; `pending_payment -> pending_confirmation` is reserved for the webhook.                                                                                                                                                                                                 |
| `mark_cod_payment_collected(p_order_id)`                | admin               | COD + `unpaid` only.                                                                                                                                                                                                                                                                                                                                                                            |
| `mark_gcash_payment_verified(p_order_id)`               | admin               | GCash + `pending` only (0005). Sets `paid`, appends a history event with the reference, raises `payment_confirmed`. See section 13.                                                                                                                                                                                                                                                             |
| `adjust_stock(p_variant_id, p_delta, p_reason, p_note)` | admin               | Manual reasons only; refuses to drop below reserved units; writes a movement; low-stock notification.                                                                                                                                                                                                                                                                                           |
| `save_product(p_product_id, p_payload) -> uuid`         | admin               | Transactional product + images + variants upsert; stock changes recorded as `correction`/`restock` movements; refuses to delete variants with order history.                                                                                                                                                                                                                                    |
| `dashboard_summary(p_days) -> jsonb`                    | admin               | KPIs, daily series, recent orders, best sellers, low stock, activity.                                                                                                                                                                                                                                                                                                                           |
| `customer_summaries(p_search) -> jsonb`                 | admin               | Buyers with order aggregates.                                                                                                                                                                                                                                                                                                                                                                   |
| `is_admin() -> boolean`                                 | everyone            | `profiles.role = 'admin'` for `auth.uid()`.                                                                                                                                                                                                                                                                                                                                                     |

Custom SQLSTATE codes raised by these functions map to `AppError` codes in `mapSupabaseError`:
`OS001` out_of_stock, `VA001` validation, `NF001` not_found, `CF001` conflict, `FB001` forbidden.
Standard codes are mapped too (`PGRST116` not_found, `23505` conflict, `42501`/`PGRST301`
forbidden, `invalid_credentials` -> unauthorized "Incorrect email or password.", fetch failures
-> network).

### `place_order` payload (round 2)

The payload also carries `discount_code: string | null`. `place_order` itself ignores the key.
When a code is present the client calls `place_order_with_discount(payload)` instead
(`0006_features_round2.sql`): it locks the `discount_codes` row, sets the transaction-local
GUC `app.discount_id` and calls `place_order`. The `BEFORE INSERT` trigger
`orders_apply_pending_discount` on `orders` reads the GUC, applies `discountIneligibleReason`
semantics against the server-computed subtotal (active, window, usage limit, minimum
subtotal), and writes `orders.discount` and `total = subtotal + shipping_fee - discount`
before the row lands, so the returned `order` already carries the discount. The wrapper then
increments `used_count` and inserts a `discount_redemptions` row. An invalid code raises
`VA001` with the user-facing reason and nothing is written. `place_order` is never redefined,
so later overrides of it (same signature) are picked up automatically. The only visible
difference from the mock is cosmetic: the admin "New order" notification text, written inside
`place_order`, quotes the pre-discount total.

### Guest checkout

RLS lets only the owning buyer (or an admin) read an order, so the order returned by
`place_order` is cached in `sessionStorage` under `guest-order:<orderNumber>`. The confirmation
page therefore works for guests in the browser that placed the order, without making orders
readable by anyone who guesses an order number. Guests cannot revisit an order from another
device; a magic-link lookup is the natural follow-up.

## 7. Edge Functions

Specified in `supabase/functions/README.md`, **not implemented**:

- `create-payment-session` - creates the PayMongo checkout session and fills
  `payment_sessions.redirect_url`.
- `paymongo-webhook` - verifies the signature, sets `payment_status = paid` and
  `status = pending_confirmation`, inserts a `payment_confirmed` notification.
- `send-order-email` - Resend emails on order insert / status change via database webhook.

## 8. Not yet implemented

- Online payments: `place_order` returns `payment_redirect_url: null`; the checkout should
  call `create-payment-session` after placing an online order once the function exists. Until
  then keep `store_settings.online_payment_enabled = false`.
- Transactional emails (Resend).
- Image uploads from the admin form (see Storage above).
- Guest order lookup after the session ends.
- Refund processing: cancellations of paid orders stop at `refund_pending`.

## 9. Security notes

- Only the publishable key is in the Vite bundle. The service-role key and provider secrets
  belong exclusively to Edge Functions / server environments.
- RLS is enabled on every table. Buyers see their own rows; admins are identified by
  `is_admin()`; `payment_sessions` has no client policies at all.
- Clients cannot insert orders, items, events, movements or notifications; cannot change stock,
  reserved stock, order status, payment status or totals except through the functions above.
- Payment status for online orders changes only in the webhook (service role). Admins can only
  record COD cash collection.
- Role changes are blocked by trigger unless the caller is already an admin.
- Realtime on `notifications` respects RLS, so buyers never receive admin notifications.

## 10. CMS (`supabase/migrations/0002_cms.sql`)

Editable storefront content (pages, navigation, theme, announcement bar) lives in four tables,
one view and a storage bucket. Domain types and the Zod schemas of the stored JSON are in
`src/features/cms/domain/`; adapters are `SupabaseCmsRepository` and `SupabaseMediaRepository`
in `src/features/cms/infrastructure/`.

### Apply

Run `0001_schema.sql` first (the CMS reuses `is_admin()`, `current_actor()`, `set_updated_at`
and `profiles`), then paste `supabase/migrations/0002_cms.sql` into the SQL editor or
`supabase db push`. The migration seeds the five default documents (`page:home`, `page:about`,
`global:navigation`, `global:announcement`, `global:theme`) with `draft = published = defaults`
(v1, already published) plus the five library images referenced by them. The seed is a copy of
`src/features/cms/domain/defaults/*.ts`; `src/features/cms/infrastructure/seedParity.test.ts`
fails when the two drift. Regenerate types afterwards exactly as in section 3.

### Tables and view

| Object                         | Purpose                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cms_documents`                | One row per document: `key` (`page:<slug>` or `global:<kind>`), `kind`, `title`, `draft` jsonb, `published` jsonb (null until first publish), `draft_version`, `published_version`, `updated_by` + `updated_by_name`, `published_at`. Check: `draft_version >= published_version`.        |
| `cms_revisions`                | Snapshot per publish: `document_id`, `version` (= the `published_version` it produced), `content`, `note`, `created_by` + `created_by_name`. Unique `(document_id, version)`; cascades on page delete.                                                                                    |
| `cms_media`                    | Library index for bucket `cms-media`: `id` **text** (so seeded assets keep the ids the default documents reference, e.g. `media-hero-rack`), `path` unique, `url`, `alt`, `mime`, `size_bytes`, `width`, `height`, `uploaded_by` + `uploaded_by_name`.                                    |
| `cms_audit_log`                | `actor` + `actor_name`, `action` enum (`save_draft`, `publish`, `restore`, `media_upload`, `media_delete`, `create_page`, `delete_page`), `document_key`, `media_id`, `details`.                                                                                                          |
| view `cms_published_documents` | `key, kind, published, published_version, published_at` where `published is not null`. `security_invoker = false` and `grant select to anon, authenticated`: this is the **only** CMS surface visitors can read. The storefront parses it with the Zod schema and falls back to defaults. |

Actor display names are denormalised onto the rows so admin lists never join `profiles`.

### RPCs (all `SECURITY DEFINER`, first statement `is_admin()` else `FB001`)

| Function                                                                      | What                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cms_save_draft(p_key, p_content, p_expected_version) -> jsonb`               | Locks the row `FOR UPDATE`; `CF001` when `draft_version <> p_expected_version` (optimistic locking, nothing written); otherwise replaces `draft`, bumps `draft_version`, records the actor, writes an audit row. Returns the document json. |
| `cms_publish(p_key, p_note) -> jsonb`                                         | One `UPDATE`: `published = draft`, `published_version = draft_version`, `published_at = now()`; inserts the `cms_revisions` snapshot and an audit row. `CF001` when there is nothing unpublished.                                           |
| `cms_restore_revision(p_key, p_version) -> jsonb`                             | Copies the revision content into `draft` and bumps `draft_version`. Does **not** publish; the admin reviews and publishes.                                                                                                                  |
| `cms_create_page(p_slug, p_title, p_content) -> jsonb`                        | Validates the slug (`^[a-z0-9]+(-[a-z0-9]+)*$`, 2-60 chars), rejects reserved slugs (`VA001`, list mirrors `RESERVED_PAGE_SLUGS`) and duplicates (`CF001`). New pages start unpublished.                                                    |
| `cms_delete_page(p_slug) -> void`                                             | Refuses `home` / `about` (`VA001`); deletes the document (revisions cascade).                                                                                                                                                               |
| `cms_register_media(p_path, p_url, p_alt, p_mime, p_size, p_width, p_height)` | Called after the client uploaded the object. Re-checks mime (jpeg/png/webp/avif) and size (5 MB); `CF001` on duplicate path. Returns the media row as json.                                                                                 |
| `cms_update_media_alt(p_id, p_alt) -> jsonb`                                  | Alt text only.                                                                                                                                                                                                                              |
| `cms_media_usages(p_id) -> text[]`                                            | Keys of documents whose `draft` or `published` contains `{ "mediaId": "<id>" }` at any depth (`jsonb_path_exists` with `$.** ? (@.mediaId == $id)`).                                                                                        |
| `cms_delete_media(p_id) -> void`                                              | `CF001` with the referencing keys while usages are non-empty; otherwise deletes the row and audits. The client then removes the storage object (`storage.remove([path])`); a missing object is logged, not surfaced.                        |
| `cms_document_json(p_id) -> jsonb`                                            | Helper: `{ key, kind, title, draft, published, draft_version, published_version, updated_by_name, updated_at, published_at }`, validated client-side by `cmsDocumentJsonSchema`.                                                            |

### Scheduled publishing (`supabase/migrations/0003_cms_schedule.sql`)

Adds `cms_documents.scheduled_at timestamptz` and three admin RPCs: `cms_schedule_publish(p_key,
p_at) -> jsonb` (`VA001` when there are no unpublished changes or `p_at <= now()`),
`cms_cancel_schedule(p_key) -> jsonb`, and `cms_run_scheduled() -> integer`, which publishes every
row whose `scheduled_at` has passed through the shared `cms_publish_internal(p_key, p_note,
p_actor_name)` step (actor `system`, note "Scheduled publish") and returns how many it published.
`cms_publish` now delegates to the same internal function. `cms_document_json` gains
`scheduled_at`; the client treats it as optional so a database still on 0002 keeps working.

**The database does not run anything by itself.** Something must call `cms_run_scheduled()`
every minute, as the `postgres` role or the service role (it is not granted to `authenticated`):

- pg_cron (enable the extension in Database -> Extensions, then):
  `select cron.schedule('cms-scheduled', '* * * * *', $$select public.cms_run_scheduled()$$);`
- or a scheduled Edge Function that runs `select public.cms_run_scheduled()` with the service key.

Mock mode needs neither: `MockCmsRepository` publishes due rows lazily at the start of every call.

Apply `0003_categories_intro.sql` as well (adds `categories.intro_title` / `intro_body`, both
`text not null default ''`, used by the collection page header). Regenerate types afterwards.

### Storage: `cms-media`

Public bucket, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg, image/png,
image/webp, image/avif}`; policies mirror `product-images` (public select, admin
insert/update/delete). Upload path: `uploads/<yyyy>/<uuid>.<ext>`; seeded rows use
`seed/<name>.jpg` and point at external URLs (no object exists for them). Upload flow in
`SupabaseMediaRepository.upload`: `validateMediaFile` -> `storage.upload` -> `getPublicUrl` ->
`cms_register_media` (the object is removed again if registration fails).

### Security notes

- Visitors never read `cms_documents`; drafts are reachable only by admins (RLS `select using
(is_admin())` on all four tables) and the published copy is exposed solely through the view.
- There are **no** insert/update/delete policies on the CMS tables. Every write is one of the
  RPCs above, which bypass RLS as `SECURITY DEFINER` after checking `is_admin()`.
- Conflicting saves cannot overwrite each other: `cms_save_draft` requires the version the
  editor loaded. The client maps `CF001` to `AppError('conflict')` and offers reload.
- Media cannot be deleted while referenced; the guard runs inside the RPC, not in the client.
- Stored JSON is re-validated with the same Zod schemas on every read (`parseContent`); an
  invalid published row makes the storefront show the built-in default and logs one warning.
- Storage errors are mapped in `mapSupabaseError` (403 forbidden, 409 conflict, 413/415
  validation, network).

## 11. Admin ops (Agent C, round 2)

### `supabase/migrations/0003_admin_roles.sql`

Adds the `admin_role` enum (`owner` | `staff`) and a nullable `profiles.admin_role` column.
Existing admins are backfilled to `owner`; buyers must keep it `null` (check constraint).
`is_owner()` mirrors `is_admin()` and should guard owner-only RPCs/policies (store settings,
theme document, discounts, team). A trigger lets only owners change `admin_role`.
0006 tightens this (section 12): `is_owner()` requires `admin_role = 'owner'` explicitly, an
admin row can no longer have a null `admin_role`, and `role` changes need an owner too.

Client mapping (`toAuthUser`): `adminRole = role === 'admin' ? (admin_role ?? 'owner') : null`.
`database.types.ts` declares the column optional so a project still on 0001 type-checks.
`ROLE_PERMISSIONS` in `src/features/team/domain/entities.ts` only hides UI; RLS is the
enforcement point.

### `supabase/migrations/0003_products_seo.sql`

Adds `products.seo_title` (<= 70) and `products.seo_description` (<= 160), both `not null
default ''`. `save_product` must copy `seo_title` / `seo_description` from the payload (the
client already sends them); the mapper falls back to `''` when the columns are absent.

Discount codes and team management are implemented in `0006_features_round2.sql`; see
section 12.

## 12. Round 2 features (`supabase/migrations/0006_features_round2.sql`)

Discount codes, product reviews, back-in-stock alerts, returns/exchanges and team management.
Apply after `0001_schema.sql`, `0003_admin_roles.sql` (`is_owner()`, `profiles.admin_role`) and
`0004_order_emails.sql`; the file is idempotent and can be re-run. It adds the enums
`discount_type`, `review_status`, `stock_alert_status`, `return_status`, `return_resolution`,
`return_reason`, the notification type `back_in_stock`, and one storage bucket. Regenerate
types afterwards exactly as in section 3. The `Mock*Repository` of each feature is the
behavioural specification: the RPCs raise the same messages with the custom SQLSTATE codes
from section 6.

### Tables and views

| Table / view            | Domain type                     | Mapper                       | Notes                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discount_codes`        | `DiscountCode`                  | `toDiscountCode`             | `code` unique, `^[A-Z0-9-]{3,20}$`; `type` percent/fixed (`value <= 100` for percent); `min_subtotal`, `max_uses` (null = unlimited), `used_count`, `starts_at`/`ends_at`, `is_active`. RLS: admins select, owners insert/update/delete. Visitors never read it: they call `validate_discount_code`.                                                 |
| `discount_redemptions`  | -                               | -                            | One row per order that used a code (`order_id` unique, `amount`). Admin read only; written by `place_order_with_discount`. Keeps `used_count` auditable.                                                                                                                                                                                             |
| `reviews`               | `Review`                        | `toReview` (via view)        | `product_id`, `user_id`, denormalised `author_name` ("Maria S."), `rating` 1-5, `title` 3-80, `body` 10-1000, `photo_urls text[]` (max 3), `is_verified_purchase`, `status` (default `pending`). Unique `(product_id, user_id)`. RLS select: approved, or own, or admin. No client write policies.                                                   |
| view `review_rows`      | `Review`                        | `toReview`                   | `reviews` joined with `products.name` / `slug` (`security_invoker`). Storefront reads `status = approved`; the admin table searches `product_name`, `author_name`, `title`, `body`.                                                                                                                                                                  |
| `stock_alerts`          | `StockAlert`                    | `toStockAlert` (via view)    | `variant_id`, `email`, `status` waiting/notified, `notified_at`. Partial unique `(variant_id, lower(email)) where status = 'waiting'` so a duplicate subscription resolves to the existing row. Admin read only.                                                                                                                                     |
| view `stock_alert_rows` | `StockAlert`                    | `toStockAlert`               | Alerts joined with product name/slug, SKU, size and colour for the grouped admin page.                                                                                                                                                                                                                                                               |
| `return_requests`       | `ReturnRequest`                 | `toReturnRequest` (RPC json) | `order_id`, `user_id`, `reason`, `resolution`, `note` (<= 500), `status` (default `requested`), `admin_note`, `refund_amount`. Partial unique on `order_id` while the status is `requested`/`approved`/`received` (one open request per order). RLS select: owner or admin.                                                                          |
| `return_items`          | `ReturnItem`                    | `toReturnRequest`            | Snapshot of the returned lines: `order_item_id`, `product_name`, `size`, `color_name`, `quantity`, `unit_price`, `sort_order`. Unique `(return_id, order_item_id)`.                                                                                                                                                                                  |
| `team_invites`          | `TeamMember` (status `invited`) | `toTeamMember` (RPC json)    | `email` (partial unique while `accepted_at is null`), `full_name`, `role` (`admin_role`), `invited_by`, `accepted_at`. Active members are `profiles` rows with `role = 'admin'`; the `auth.users` trigger `on_auth_user_team_invite` promotes the profile once the invited address is **confirmed** (`email_confirmed_at`) and stamps `accepted_at`. |

### RPCs

All `SECURITY DEFINER`; the first statement checks `auth.uid()`, `is_admin()` or `is_owner()`
as noted. JSON results are validated client-side by the `*JsonSchema` exports in `mappers.ts`.

| Function                                                               | Who                 | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate_discount_code(p_code, p_subtotal) -> jsonb`                  | anon, authenticated | `{ code, type, value, amount }` or `VA001` with the reason (`That code is not valid.`, `This code has expired.`, ...). `amount` mirrors `computeDiscountAmount` (capped at the subtotal, 2 dp).                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `place_order_with_discount(payload) -> jsonb`                          | anon, authenticated | Same payload and result as `place_order`; see section 6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `save_discount_code(p_id, p_payload) -> jsonb`                         | owner               | Create (`p_id` null) or update. Normalises the code to upper case, validates like `discountFormSchema`, `CF001 'A discount with this code already exists.'`, `NF001` on an unknown id.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `delete_discount_code(p_id)`                                           | owner               | `NF001` when missing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `submit_review(p_product_id, p_rating, p_title, p_body, p_photo_urls)` | authenticated       | `FB001 'Sign in to write a review.'`, `NF001` product, `VA001` for the `reviewFormSchema` rules and more than 3 photos, `CF001 'You have already reviewed this product.'`. Every photo URL must be the caller's own upload: `https://<ref>.supabase.co/storage/v1/object/public/review-photos/reviews/<auth.uid()>/<file>` **and** present in `storage.objects` (`VA001 'Photos must be uploaded to your own review folder first.'` / `'One of the photos was not found. Please upload it again.'`). Sets `is_verified_purchase` when a delivered order of the caller contains the product. Status starts `pending`. |
| `review_summary(p_product_id) -> jsonb`                                | anon, authenticated | `{ product_id, average (1 dp), count, distribution[5] }` over approved reviews.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `set_review_status(p_id, p_status) -> jsonb`                           | admin               | Moderation; returns the review json.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `delete_review(p_id) -> text[]`                                        | admin               | Deletes the row and returns only the photo URLs under the author's own folder (`reviews/<user_id>/`; none when `user_id` is null); the client then removes those storage objects (best effort).                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `subscribe_stock_alert(p_variant_id, p_email) -> jsonb`                | anon, authenticated | `VA001 'Enter a valid email address.'`, `NF001 'Variant was not found.'` unless the product is published; a duplicate waiting subscription returns the existing alert.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `mark_stock_alerts_notified(p_variant_id) -> integer`                  | admin               | Marks the variant's waiting alerts notified and returns how many.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `request_return(p_order_id, p_items, p_reason, p_resolution, p_note)`  | authenticated       | `p_items = [{ order_item_id, quantity }]`. Owner of the order only (`NF001` otherwise), `status = delivered`, within 14 days of the `delivered` status event (else `updated_at`), one open request per order (`CF001`), items must belong to the order with `quantity <= ordered`. Computes `refund_amount`; notifies admins.                                                                                                                                                                                                                                                                                        |
| `order_return_request(p_order_id) -> jsonb`                            | authenticated       | Latest request for the order, or `null` when there is none or the caller is neither the owner nor an admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `list_return_requests(p_status) -> jsonb`                              | admin               | `'all'` or a `return_status`; newest first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `update_return_status(p_id, p_status, p_admin_note) -> jsonb`          | admin               | Enforces `RETURN_STATUS_TRANSITIONS` (`VA001 'Invalid return status transition.'`). On `refunded` sets the order's `payment_status` to `refunded` (amount >= total) or `partially_refunded` and appends an order status event with the refund note (order status unchanged).                                                                                                                                                                                                                                                                                                                                         |
| `team_members() -> jsonb`                                              | admin               | Admin profiles (`status: active`, `last_active_at` from `auth.users.last_sign_in_at`) plus pending invites (`status: invited`), oldest first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `invite_team_member(p_email, p_full_name, p_role) -> jsonb`            | owner               | `FB001 'Only owners can manage the team.'`; `CF001 'That person is already on the team.'`. An existing **confirmed** account (`auth.users.email_confirmed_at is not null`; `profiles.email` is never consulted) is promoted immediately (`active`); otherwise a `team_invites` row is stored and applied once that address is confirmed. Sending the invitation e-mail is a backend concern.                                                                                                                                                                                                                         |
| `update_team_member_role(p_id, p_role) -> jsonb`                       | owner               | Profile or invite id. Demoting the last active owner raises `CF001 'A store needs at least one owner. Promote someone else first.'`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `remove_team_member(p_id)`                                             | owner               | Demotes an active member to buyer (account and order history stay) or deletes an invite; same last-owner guard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Triggers

- `orders_apply_pending_discount` (`BEFORE INSERT` on `orders`): applies the code set by
  `place_order_with_discount` (section 6).
- `product_variants_notify_back_in_stock` (`AFTER UPDATE OF stock, reserved_stock`): when
  available stock goes from 0 to > 0 and waiting alerts exist, inserts a `back_in_stock` admin
  notification linking to `/admin/stock-alerts`.
- `on_auth_user_team_invite` (`AFTER INSERT OR UPDATE OF email_confirmed_at, email` on
  `auth.users`): when `email_confirmed_at` is set and a pending invite matches `lower(email)`,
  promotes that user's `profiles` row (`role = 'admin'`, `admin_role = invite.role`, name
  filled in when empty) under `app.bypass_guard` and stamps `accepted_at`. Identities that are
  confirmed at insert time (confirmations disabled, OAuth, admin-created users) are covered by
  the INSERT event; a later confirmation, or a confirmed e-mail change to an invited address,
  arrives as an UPDATE. The trigger name sorts after `on_auth_user_created`, so the profile
  from `handle_new_user` already exists. It replaces the former `BEFORE INSERT` trigger on
  `profiles`, which fired at sign-up before any confirmation (anyone who knew an invited
  address could register with it and become staff).
- `profiles_guard_email` (`BEFORE UPDATE` on `profiles`): `FB001 'Email can only be changed
through account settings.'` when `email` changes and the caller is neither an admin nor a
  bypass path. `profiles_update_own` (0001) otherwise lets a buyer rewrite it.
- `on_auth_user_email_changed` (`AFTER UPDATE OF email` on `auth.users`): mirrors a confirmed
  e-mail change (Supabase Auth `updateUser`) into `profiles.email` under the bypass.
- Overrides of 0001 / 0003 guards: `is_owner()` requires `admin_role = 'owner'` explicitly;
  `guard_profile_role` (the 0001 trigger `profiles_guard_role`) now requires `is_owner()` or
  the bypass (`FB001 'Only owners can change roles.'`), so staff admins cannot promote anyone;
  `profiles_guard_admin_role` (0003) gains the bypass. The file backfills
  `admin_role = 'owner'` for admins without one and adds the constraint
  `profiles_admin_requires_admin_role` (`role <> 'admin' or admin_role is not null`); the
  team RPCs always set both columns.

### Storage: `review-photos`

## 13. GCash QR payments (`supabase/migrations/0005_gcash.sql`)

A manual prepaid method that needs no payment provider: the owner shows their GCash QR, the
buyer pays from the GCash app and types the reference number, and an admin verifies it. Apply
`0005_gcash.sql` after `0004_order_emails.sql`, then regenerate types (section 3).

### Schema

| Object                                                                              | Change                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| enum `payment_method`                                                               | `+ 'gcash'` (added first in the file; nothing else in the migration _uses_ the value, only function bodies mention it, so it is safe in one transaction).                                                                                                                                                                                                                                                                             |
| `orders.payment_reference text`                                                     | The reference the buyer typed; `null` for COD / online.                                                                                                                                                                                                                                                                                                                                                                               |
| `store_settings.gcash_enabled boolean default false`                                | Owner toggle (Settings → GCash).                                                                                                                                                                                                                                                                                                                                                                                                      |
| `store_settings.gcash_account_name text default ''`, `gcash_number text default ''` | Shown next to the QR at checkout. The client validates `^09\d{9}$` for the number while enabled.                                                                                                                                                                                                                                                                                                                                      |
| `store_settings.gcash_qr_url text`                                                  | Public URL of the QR image. Uploaded through the shared `ImageUploadField` (single-image mode), i.e. into the **`cms-media`** bucket (`uploads/<yyyy>/<uuid>.<ext>`), no new bucket.                                                                                                                                                                                                                                                  |
| unique index `orders_gcash_reference_unique`                                        | On `upper(payment_reference)` where `payment_reference is not null and status <> 'cancelled'`: one receipt pays one live order. The predicate deliberately avoids the `'gcash'` enum literal (unusable in the same transaction as `add value`); only the GCash branch of `place_order` ever writes the column.                                                                                                                        |
| `guard_store_settings()`                                                            | Re-created: keeps the 0001 provider-flag check and raises `FB001` "Only owners can change GCash payment details." when `gcash_enabled` / `gcash_account_name` / `gcash_number` / `gcash_qr_url` change and `is_owner()` is false (`app.bypass_guard` still skips it).                                                                                                                                                                 |
| view `order_summaries`                                                              | `payment_reference` appended as the last column.                                                                                                                                                                                                                                                                                                                                                                                      |
| `place_order`                                                                       | Re-created: accepts `payment_reference`, rejects GCash when disabled / no QR / bad reference / reference already on a live order (`VA001`, "This GCash reference number has already been used." - a race on the unique index is translated to the same error), stores it, starts GCash orders in `pending_confirmation` + `pending`, and quotes the stored `total` in the admin notification (so 0006's discount rewrite is a no-op). |
| `update_order_status`                                                               | Re-created: `confirmed` now also requires `paid` for `gcash` (same rule as `online`).                                                                                                                                                                                                                                                                                                                                                 |
| `mark_gcash_payment_verified(p_order_id)`                                           | New admin RPC, see section 6.                                                                                                                                                                                                                                                                                                                                                                                                         |
| function privileges                                                                 | Explicit for everything the file creates, 0006 style: `place_order` → anon + authenticated; `update_order_status`, `mark_gcash_payment_verified` → authenticated; `guard_store_settings` → nobody.                                                                                                                                                                                                                                    |

`order_json(uuid)` is built with `to_jsonb(o)`, so `place_order`'s returned order and `track_order`
pick up `payment_reference` without changes. `database.types.ts` and the mappers treat the new
columns as optional so a project still on 0004 keeps type-checking and reads GCash as "off".

### Flow

1. Owner (permission `settings.edit`) opens `/admin/settings` → **GCash**, turns it on, enters the
   account name and 11-digit number, uploads the QR. Checkout offers GCash only when
   `gcash_enabled` **and** `gcash_qr_url` are set.
2. Buyer picks GCash, sees the QR (`alt="GCash QR code"`), the copyable account name / number and
   the amount, pays in the app and enters the 8–20 character reference. `place_order` validates
   the same pattern server-side.
3. The order lands in `pending_confirmation` / `pending`. Admin opens it, finds the reference in
   the GCash app, and clicks **Mark as paid** (Payment card) → `mark_gcash_payment_verified`
   → `paid`. Only then does **Confirm Order** appear. Cancelling before verification sets
   `failed`; after verification `refund_pending`, exactly like online orders.
4. Both EmailJS templates receive `payment_reference` (empty when not GCash).

Settings edits stay behind the existing `store_settings_update` policy (`is_admin()`) and the UI
hides the page from staff via `settings.edit`, but the four GCash columns are owner-only at the
trigger level (`guard_store_settings`, `FB001`), so a staff session cannot redirect payouts
through the REST API. Tightening the whole policy to `is_owner()` is the same follow-up as for
the other owner-only settings (section 11).
Public bucket, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg, image/png,
image/webp, image/avif, image/gif}`. Path convention `reviews/<userId>/<uuid>.<ext>`; the insert
policy requires the second folder to equal `auth.uid()`, delete is allowed for the owner folder
or admins. Flow in `SupabaseReviewRepository.submit`: `validateReviewPhoto` -> `storage.upload`
-> `getPublicUrl` -> `isOwnReviewPhotoUrl` -> `submit_review` (uploaded objects are removed
again when either check or the RPC fails). `submit_review` accepts a URL only when it is the
hosted project's public object URL under the caller's folder (`is_own_review_photo_url`, the
same pattern as `isOwnReviewPhotoUrl` in `reviewPhotos.ts`) and the object exists in
`storage.objects`; URLs of a local Supabase stack (`http://127.0.0.1:54321/...`) do not match.
`delete_review` hands back only URLs under the author's folder and `reviewPhotoStoragePath`
keeps only `reviews/<folder>/<file>` paths, so a deletion never targets a foreign object.

### Security notes

- Discount codes are not enumerable: no `anon`/buyer select policy; validation and redemption
  happen inside RPCs that lock the code row. Owner-only writes mirror `ROLE_PERMISSIONS`
  (`discounts.manage` and `team.manage` are owner permissions; the mock only checks for admin).
- Reviews, stock alerts, returns and invites have **no** client insert/update/delete policies;
  every write is one of the RPCs above.
- A buyer can only review as themselves (`user_id = auth.uid()` is set server-side) and only
  return orders they own; `is_verified_purchase` is computed from their delivered orders.
- The last-owner rule counts **active** owners only (pending invites do not keep a store
  owned), which is stricter than the mock.
- Team invites bind to **confirmed identities**: `invite_team_member` resolves existing
  accounts from `auth.users` (confirmed only), never from the user-editable `profiles.email`,
  and pending invites are applied by the `auth.users` trigger once the address is confirmed.
- Role changes are **owner-only**. `is_owner()` no longer treats a null `admin_role` as owner,
  `role` and `admin_role` changes both require `is_owner()` (or the `app.bypass_guard` path the
  SECURITY DEFINER functions use), and every admin row carries an explicit `admin_role`.
- `place_order_with_discount` rewrites the PHP amount of the `new_order` admin notification
  that `place_order` inserted, so it shows the discounted `orders.total`; the returned `order`
  (from `order_json`) already carried it because the discount trigger runs `BEFORE INSERT`.
- Function privileges: Supabase's default privileges grant EXECUTE on every new function to
  `anon` / `authenticated`, and `revoke ... from public` leaves those intact. The end of the
  file therefore revokes EXECUTE from `public, anon, authenticated` on every function it
  creates (internal `*_json` helpers, trigger functions, guards) and grants back only the RPCs
  listed above (plus `is_plausible_email`, used by CHECK constraints, and `is_owner`, used by
  policies). A comment block there classifies each function.

## 14. Email verification and account emails

Sign-up is a two-step flow. `auth.signUp` creates the account but returns no session, Supabase
Auth mails a 6-digit code, and the verification screen the app opens after sign-up exchanges
that code for the first session. `AuthRepository.signUp` therefore returns a `SignUpResult`
(`verification_required`, or `session` on a project with confirmation switched off) rather than
throwing, and `SupabaseAuthRepository` implements the two new methods with
`auth.verifyOtp({ email, token, type: 'signup' })` and `auth.resend({ type: 'signup', email })`.

The code deliberately does **not** go out through EmailJS. EmailJS is a browser SDK, so a code
the browser already knows proves nothing about who owns the mailbox; only a server may generate
and mail it. The welcome message is the opposite case - it carries no secret - so it is the
app's own EmailJS send (`AuthEmailGateway` with the `welcome` template id from
`VITE_EMAILJS_TEMPLATE_WELCOME`) and has no Supabase template at all. It is fired once
`verifyOtp` succeeds and its failures are swallowed, because a courtesy mail must never undo an
address that was just confirmed.

Branded HTML for both messages lives in the top-level `emails/` directory, whose own README says
which file belongs to which message.

### Dashboard settings

Manual, per project, and the flow does not work without them.

1. _Authentication > Providers > Email_: **Confirm signup** must be **enabled**. With it off
   Supabase hands back a session straight from `signUp` and nobody ever proves they own the
   address.
2. _Authentication > Emails > Confirm signup_: the template must contain `{{ .Token }}`, which
   is what makes Supabase mail a 6-digit code. The stock link-only template
   (`{{ .ConfirmationURL }}`) leaves the in-app code screen with nothing to type; keeping both
   is fine, the app only reads the code.
3. _Authentication > Emails_: the email OTP expiry (one hour by default) is how long a code
   stays usable. An expired code comes back as `otp_expired`, which `mapSupabaseError` turns
   into `validation` with "That code has expired. Send yourself a new one."; the screen's resend
   action mails a fresh code and the previous one stops working.
4. _Authentication > Emails > SMTP Settings_: set the sender display name to **Urban Anomaly
   Official**, the same string as `EMAIL_SENDER_NAME` in `src/lib/email/branding.ts`, so the
   Supabase message and the EmailJS message read as one brand. This needs **custom SMTP**:
   Supabase's built-in sender is rate-limited to a few emails an hour, is not production-grade,
   and does not let you choose the name. SMTP credentials stay in the dashboard - like every
   other provider secret they never belong in a `VITE_` variable (section 9).

A sign-in attempt on an account that was never confirmed returns `email_not_confirmed`, which
`mapSupabaseError` maps to the new `AppError` code `email_unverified`, so the login form can
offer the verification screen instead of only showing the message.
