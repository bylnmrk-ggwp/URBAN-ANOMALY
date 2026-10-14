# URBAN ANOMALY — Footwear E-Commerce Frontend

A mobile-first storefront for a Manila footwear brand (washable EVA clogs, slides, loafer mules, straps and kids sizes) with a protected admin dashboard. React 19 + TypeScript (strict) + Vite, Tailwind CSS v4 + shadcn/ui, React Router v7, TanStack Query, Zustand, React Hook Form + Zod. Designed to run against Supabase (PostgreSQL, Auth, Storage) through a repository abstraction; ships with an in-memory mock mode so the full UI works without a backend.

> **Status:** UI and application layer complete in **mock mode**. Supabase adapters, SQL schema and RLS policies are written but not yet verified against a live project. Payments (PayMongo) and transactional email (Resend) are integration contracts only. Do not treat this as production-ready until the items under [Not yet implemented](#not-yet-implemented) are done.

## Quick start

```bash
npm install
cp .env.example .env      # mock mode works with the defaults
npm run dev               # http://localhost:5173 (use `npm run dev -- --port 5174` if 5173 is taken)
```

Demo accounts (mock mode only):

| Role  | Email              | Password   |
| ----- | ------------------ | ---------- |
| Admin | `admin@demo.local` | `password` |
| Buyer | `buyer@demo.local` | `password` |

The admin area lives at `/admin`. Buyers who open it see a 403 page, not a redirect.

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Vite dev server                                   |
| `npm run build`     | Type-check (`tsc -b`) and production build        |
| `npm run preview`   | Serve the production build on port 4173           |
| `npm run typecheck` | `tsc -b` across app, node and test configs        |
| `npm run lint`      | ESLint (flat config, typescript-eslint, hooks)    |
| `npm run format`    | Prettier write (`format:check` to verify)         |
| `npm test`          | Vitest unit + component tests (jsdom)             |
| `npm run test:e2e`  | Playwright end-to-end (builds and serves preview) |
| `npm run validate`  | typecheck + lint + unit tests                     |

First Playwright run needs browsers: `npx playwright install chromium`.

## Environment

```env
VITE_DATA_MODE=mock                 # "mock" | "supabase"
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Only the Supabase publishable (anon) key may appear in `VITE_` variables. Service-role keys, PayMongo secrets and Resend keys belong in Supabase Edge Function secrets. See [docs/supabase.md](docs/supabase.md) for the full connection guide.

## Architecture

See [docs/architecture.md](docs/architecture.md). In short:

```
presentation  (pages, components)        -> calls hooks only
application   (TanStack hooks, use-cases) -> calls repositories from src/config/repositories.ts
domain        (entities, rules, zod, repository interfaces) -> no React, no Supabase
infrastructure (Mock*Repository, Supabase*Repository)
```

Switching from mock data to Supabase is an environment change; no page or component imports Supabase directly.

Key decisions:

- **Cart** stores only `productId`, `variantId`, `quantity` (versioned localStorage). Prices and stock are always re-read from the catalog, and the server recomputes totals at checkout.
- **Order vs payment state** are separate enums. COD delivery never implies payment; online payments can only become `paid` through the provider webhook. The admin UI only offers transitions from `ORDER_STATUS_TRANSITIONS`, and the backend must re-validate them.
- **Inventory** changes go through audited movements (`adjust_stock` RPC); the UI never overwrites a stock number.
- **Roles** come from the backend profile (`profiles.role`), never from client storage. Public registration creates buyers only. In Supabase mode RLS enforces every admin check.

## CMS

Administrators edit the storefront without touching code. Everything below runs in mock mode today and is backed by `supabase/migrations/0002_cms.sql` in Supabase mode.

| Area          | Route                         | What you can change                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content       | `/admin/content`              | Pages (Home, About, custom `/pages/:slug`), draft and published status, revision history, recent activity.                                                                                                                                                          |
| Visual editor | `/admin/editor?doc=page:home` | Add, reorder, hide and edit sections (hero, category tiles, product collection, promo banner, value props, text block, newsletter, contact). Live preview of the real storefront at desktop, tablet and mobile widths. Click a section in the preview to select it. |
| Media         | `/admin/media`                | Upload JPEG/PNG/WebP/AVIF up to 5 MB, edit alt text, see where an image is used. Deleting a referenced image is refused.                                                                                                                                            |
| Navigation    | `/admin/navigation`           | Header links, Collections menu toggle, footer columns, newsletter copy, payment and legal lines.                                                                                                                                                                    |
| Theme         | `/admin/theme`                | Colours, font, corner radius, button style, section spacing. Only enumerated tokens are written as CSS variables.                                                                                                                                                   |
| Announcement  | `/admin/announcement`         | Bar text, link, visibility.                                                                                                                                                                                                                                         |

Draft and publish: every document has a draft and a published copy. Visitors only ever see the published copy. Publishing is a single atomic update that also records a revision; any revision can be restored into the draft. Concurrent edits are detected by version and surfaced with a reload prompt. Rich text is a restricted Markdown subset rendered to React elements, never raw HTML.

Built-in defaults describe the demo footwear storefront (hero slideshow, category tiles, New Drop, promo banner, Best Sellers, image marquee, value props, newsletter), so an untouched CMS renders the full site.

## Storefront look and motion

The storefront follows the Shopify Spotlight/Dawn conventions: uppercase tracked headings, square product cards with a dual-image crossfade and 1.03 scale on hover, full-width outline "Choose options" buttons, horizontal product carousels with prev/next arrows and a `1 / N` counter, an autoplaying hero slideshow with dots, a continuous image marquee, scroll-reveal (2rem rise + fade) on every section after the hero, a sticky blurred header with animated nav underlines, and a right-side cart drawer that opens from the bag icon and after adding an item. All motion respects `prefers-reduced-motion`. Tokens and keyframes live in `src/styles/globals.css`; reusable pieces are `src/components/motion/{Reveal,Marquee}.tsx`, `src/hooks/useScrollReveal.ts`, `src/features/products/presentation/ProductCarousel.tsx`, and `src/features/cart/presentation/CartDrawer.tsx`.

The demo brand is **URBAN ANOMALY**, a Marikina-made clog and slide label. Sizes are US unisex 5–12; the size guide recommends by foot length. Demo images come from Pexels and show no third-party logos.

## Round 2 features (UI, mock mode)

| Area                                                                       | Where                                                                              | Notes                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Wishlist                                                                   | heart on cards and product page, header icon, `/wishlist`                          | Guest wishlist persists in localStorage.                                                                   |
| Recently viewed, complete the look, size recommendation                    | product page, size guide dialog                                                    | Pure client logic; foot-length (cm) to US 5–12 chart in `sizeRecommendation.ts`.                           |
| Back-in-stock alerts                                                       | product page when a variant is sold out; `/admin/stock-alerts`                     | Email delivery is a backend concern. Supabase mode notifies admins when a waited-for variant is restocked. |
| Guest order tracking                                                       | `/track` (order number + email), footer link                                       | Supabase needs the `track_order` RPC in `0003_track_order.sql`.                                            |
| Reviews with photos                                                        | product page, rating on cards, `/admin/reviews` moderation                         | Verified badge from delivered orders.                                                                      |
| Returns and exchanges                                                      | buyer order page (delivered, within 14 days), `/admin/returns`, order details card | Refund updates payment status in mock mode.                                                                |
| Discount codes                                                             | checkout summary, `/admin/discounts`                                               | Demo codes: `WELCOME10`, `FREESHIP`, `SUMMER500`.                                                          |
| Products CSV import/export                                                 | `/admin/products` toolbar                                                          | Column set documented in `src/features/products/domain/csv.ts`.                                            |
| Packing slip                                                               | `/admin/orders/:id/packing-slip`                                                   | Print stylesheet.                                                                                          |
| Team roles                                                                 | `/admin/team`; staff account `staff@demo.local` / `password`                       | Owner vs staff permissions hide Settings, Theme, Discounts, Team for staff. Supabase RPCs are owner-only.  |
| Product SEO fields                                                         | product form SEO card                                                              | Sets page title and meta description.                                                                      |
| CMS: FAQ and gallery sections, scheduled publishing, collection intro text | editor, `/admin/content`, `/admin/categories`                                      | Scheduled publish needs `cms_run_scheduled()` driven by pg_cron or an Edge Function in Supabase mode.      |

Responsiveness is verified by `node scripts/responsive-sweep.mjs` across every route at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px.

## Project layout

```
src/
  app/            App, router (lazy routes, ProtectedRoute, AdminRoute), providers
  components/     ui (shadcn), common (states, badges, DataTable), layout
  features/       auth, products, categories, cart, checkout, orders, inventory, customers,
                  notifications, dashboard, settings, cms, wishlist, reviews, returns,
                  discounts, stock-alerts, team  (domain/application/infrastructure/presentation)
  pages/          storefront/*, admin/*
  stores/         cartStore, uiStore (Zustand)
  mocks/          seed data + createMockRepositories
  lib/            utils, format, errors, queryKeys, supabase/
  config/         env, repositories (composition root)
supabase/         migrations/0001_schema.sql, 0002_cms.sql, 0003_*.sql, 0004_order_emails.sql,
                  0006_features_round2.sql (discounts, reviews, stock alerts, returns, team), functions/README.md
docs/             architecture.md, supabase.md
e2e/              Playwright specs
```

## Testing

- **Unit**: domain rules (stock, pricing, badges, cart totals, status transitions), formatters, zod schemas.
- **Component**: product card, cart line, checkout form, status badges, admin order table.
- **Integration** (mock repositories): product listing and filters, add to cart, cart updates, checkout validation, admin product creation, admin order status updates.
- **E2E**: buyer browses the clogs, selects a colourway and US size, adds to cart, completes a mock COD checkout; admin signs in, finds the order, advances its status. Runs on desktop and mobile viewports.

Mock tests exercise simulated repositories; they prove UI and application logic, not backend persistence.

## Not yet implemented

- Live verification of the Supabase migrations (0001 through 0006), RLS policies and RPCs.
- Edge Functions: `create-payment-session`, `paymongo-webhook`, `send-order-email`.
- Outbound mail for team invitations and back-in-stock alerts (rows are recorded; sending is a backend concern).
- Supabase Storage uploads from the product form (URLs and local previews only today).
- Real email delivery (Resend) and realtime notification fan-out in production.
