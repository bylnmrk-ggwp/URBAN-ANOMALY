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

4. Auth settings (_Authentication > Providers > Email_): enable email/password. If
   "Confirm email" is on, sign-up returns no session and the UI tells the user to confirm first.
   Set _Site URL_ and add `http://localhost:5173/login` to the redirect allow-list so password
   reset links return to the app.

5. Create the first admin. Sign up through the app (or the dashboard), then in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

   Roles live only in `profiles.role`; the client never writes it and `is_admin()` reads it on
   every privileged query. Sign out and back in so the app refreshes the profile.

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

The payload also carries `discount_code: string | null`. The function must look the code up in
a `discount_codes` table (not yet migrated — see section 11), apply `discountIneligibleReason`
semantics server-side (active, window, usage limit, minimum subtotal), set `orders.discount`,
compute `total = subtotal + shipping_fee - discount` and increment `used_count` in the same
transaction. An invalid code raises `VA001` with the user-facing reason. Until the table exists
the function should ignore the key (or raise `VA001 'That code is not valid.'` when non-null).

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

Client mapping (`toAuthUser`): `adminRole = role === 'admin' ? (admin_role ?? 'owner') : null`.
`database.types.ts` declares the column optional so a project still on 0001 type-checks.
`ROLE_PERMISSIONS` in `src/features/team/domain/entities.ts` only hides UI; RLS is the
enforcement point.

### `supabase/migrations/0003_products_seo.sql`

Adds `products.seo_title` (<= 70) and `products.seo_description` (<= 160), both `not null
default ''`. `save_product` must copy `seo_title` / `seo_description` from the payload (the
client already sends them); the mapper falls back to `''` when the columns are absent.

### Not yet implemented in Supabase mode

- Discount codes: no table/RPCs yet. `SupabaseDiscountRepository` throws
  `AppError('unknown', 'Discounts are not available in Supabase mode yet.')`. Suggested schema:
  `discount_codes(id, code unique, type, value, min_subtotal, max_uses, used_count, starts_at,
ends_at, is_active, created_at)` with a public `validate_discount(code, subtotal)` RPC and
  admin CRUD via RLS (`is_owner()`).
- Team management: `SupabaseTeamRepository` throws the same way. Invites need an Edge Function
  (service role) to create the auth user and set `profiles.admin_role`.
