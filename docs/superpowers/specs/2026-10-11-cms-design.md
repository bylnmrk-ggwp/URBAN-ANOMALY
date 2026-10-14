# CMS Design: Editable Storefront for ATELIER MNL

Date: 2026-10-11. Status: approved and implemented.

## 1. Existing codebase assessment

| Area         | Finding                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | React 19, TS strict, Vite 8, Tailwind v4 (`@theme inline` tokens in `src/styles/globals.css`), shadcn/ui, React Router v7, TanStack Query v5, Zustand v5, RHF + Zod v4, Supabase JS.                                    |
| Architecture | Feature modules with `domain / application / infrastructure / presentation`. Composition root `src/config/repositories.ts` selects mock or Supabase factories by `VITE_DATA_MODE`. Presentation never imports Supabase. |
| Auth         | `AuthProvider` + `useAuth()`. Role resolved by the auth repository (profile row). `AdminRoute` renders 403 for non-admins. Supabase RLS uses `public.is_admin()`.                                                       |
| Admin        | `/admin` exists: Dashboard, Products (full variant form), Categories, Inventory, Orders, Customers, Settings. Sidebar in `src/components/layout/adminNav.ts`.                                                           |
| Supabase     | `supabase/migrations/0001_schema.sql` (13 tables, RPCs, RLS), bucket `product-images`, hand-written `database.types.ts`. **No live project is connected**; the app runs in mock mode.                                   |
| Tests        | 114 Vitest, 26 Playwright, all green.                                                                                                                                                                                   |

The product/category/order managers already satisfy Phase 2 "Product Management", "Category Management", "Order Management", and "Website Settings". They are reused as-is.

## 2. Hardcoded content to make editable

| Location                                    | Content                                                                                                                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/AnnouncementBar.tsx` | Announcement text.                                                                                                                                                                                                   |
| `src/components/layout/storefrontNav.ts`    | Brand name, header links.                                                                                                                                                                                            |
| `src/components/layout/Footer.tsx`          | Help and Company link labels, newsletter copy, payment line, copyright.                                                                                                                                              |
| `src/pages/storefront/HomePage.tsx`         | Hero (eyebrow, title, subtitle, image, two CTAs), category tiles heading, New Arrivals and Best Sellers headings/limits, promo banner (image, eyebrow, title, body, CTA), values section (3 items), newsletter band. |
| `src/pages/storefront/AboutPage.tsx`        | Brand story, values, shipping, returns, size guide intro, contact block.                                                                                                                                             |
| `src/styles/globals.css`                    | Colour, radius, font tokens (`:root` CSS variables).                                                                                                                                                                 |

Products, categories, store settings, and orders are already database-driven and stay the single source of truth. The CMS references products/categories by id; it never copies them.

## 3. Reusable pieces

`AdminLayout`, `AdminSidebar`, `PageHeader`, `DataTable`, `ConfirmDialog`, `EmptyState/ErrorState/LoadingState`, `StatusBadge`, shadcn `Form/Dialog/Sheet/Tabs/Select/Switch`, `ImageUploadField` (becomes a thin wrapper over the new Media Library picker), `useIsDesktop`, `useDebouncedValue`, `UnsavedChangesGuard`, `slugify`, `AppError`, query-key conventions, the mock/Supabase repository pattern, `is_admin()` and the storage policy pattern.

## 4. Proposed CMS architecture

### 4.1 Core model: schema-driven sections

A **page** is an ordered list of **sections**. Each section has a `type` from a fixed registry and typed `props` validated by a Zod schema. The registry maps each type to its schema, defaults, editor fields, and the existing presentational component that renders it. The current homepage and about page are expressed as section lists whose defaults equal today's markup, so the storefront looks identical before anyone edits anything.

Section types (v1):

| Type                 | Renders with               | Editable props                                                                                                                                            |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero`               | existing hero markup       | eyebrow, title, subtitle, image (media ref), primary + secondary CTA (label, href), text alignment (`left`/`center`), height (`compact`/`default`/`tall`) |
| `category_tiles`     | `CategoryTiles`            | eyebrow, title, category ids (empty = all), max                                                                                                           |
| `product_collection` | `ProductCollectionSection` | eyebrow, title, source (`new_arrivals`/`best_sellers`/`featured`/`manual`), product ids for manual, limit, "view all" href                                |
| `promo_banner`       | existing promo section     | image, eyebrow, title, body, CTA, image side (`left`/`right`)                                                                                             |
| `value_props`        | existing values grid       | eyebrow, title, items[] (icon name from an allowed list, title, body), columns (2/3)                                                                      |
| `rich_text`          | new, sanitised             | heading, body (restricted Markdown subset rendered to safe HTML), width (`narrow`/`wide`), background (`none`/`muted`)                                    |
| `newsletter`         | existing band              | title, body, button label                                                                                                                                 |
| `contact`            | existing contact block     | heading, body, email, phone, address, hours                                                                                                               |

Every section also has `visible: boolean` and an optional `anchor` (used for `#shipping`, `#returns`, `#size-guide`, `#contact` so existing links keep working).

Global (non-page) content:

- **Announcement bar**: text, href, visible.
- **Navigation**: header links, footer columns (label + links), each link `{ label, href, kind: 'internal' | 'external' | 'category' }`.
- **Theme**: tokens that map 1:1 onto existing CSS variables: `primary`, `primaryForeground`, `background`, `foreground`, `muted`, `mutedForeground`, `border`, `radius` (`none/sm/md/lg`), `fontFamily` (from an allow-list), `buttonStyle` (`square/rounded/pill`), `sectionSpacing` (`compact/default/spacious`). Applied by setting `style` custom properties on `<html>` at runtime; no arbitrary CSS is ever generated.
- **Brand**: store name reuses `store_settings.store_name`; logo reuses `store_settings.logo_url`. Not duplicated.

### 4.2 Draft / publish / revisions

Every editable document (`page`, `navigation`, `theme`, `announcement`) is a **document** with a key (e.g. `page:home`, `global:navigation`). A document row holds `draft` (JSON), `published` (JSON), `draft_version`, `published_version`, `updated_by`, timestamps. Publishing copies `draft` to `published` and inserts a `cms_revisions` row (document, version, content snapshot, actor, note). Restore copies a revision's content into `draft` (then the admin publishes). Two JSON columns on one row make publish atomic by construction: a single `UPDATE`.

Concurrency: optimistic locking on `draft_version`. Save sends the version it loaded; the RPC rejects a stale version with a `conflict` error, and the editor offers "reload and reapply".

Visitors read `published` only. RLS: anonymous `select` is allowed only through a view `cms_published_documents(key, content, published_version)`; the base table is admin-only.

### 4.3 Media library

Table `cms_media` (id, bucket, path, url, alt, width, height, size_bytes, mime, uploaded_by, created_at). Bucket `cms-media` (public read, admin write), same policy pattern as `product-images`. Upload validation: `image/jpeg|png|webp|avif|svg` refused for svg, max 5 MB, dimensions read client-side for the record. Delete is refused by the RPC when the media id appears in any document's `published` or `draft` JSON (`jsonb` containment search on `"mediaId"`). Product images continue to use `product-images`; the product form's `ImageUploadField` gains a "Choose from library" action that copies the public URL (no migration of existing product images).

### 4.4 Visual editor

Route `/admin/editor?doc=page:home`. Layout: left panel (section list with drag handles, add-section menu, per-section form), right panel (live preview). Preview renders the **real storefront page component** inside an iframe pointed at `/?preview=<token>` with `postMessage` carrying the draft document, so the preview is pixel-identical to production and responsiveness is real. Device switcher sets the iframe width to 390 / 768 / 1280. Clicking a section in the preview posts its id back to select it in the panel ("click to edit"). Reordering uses up/down buttons plus keyboard-accessible drag via `@dnd-kit/sortable` (new dependency, 12 kB, justified: shadcn has no sortable primitive). Drag reorders the section list only; no free positioning.

Preview token: a random session value held in the editor; the storefront accepts draft content from `postMessage` only when the message origin matches `window.location.origin` and the token matches the one in the URL. Ordinary visitors never receive draft data because nothing posts it.

### 4.5 Modules

```
src/features/cms/
  domain/
    documents.ts        DocumentKey, CmsDocument<T>, Revision, PublishResult
    sections.ts         section type union, Zod schemas, defaults, SECTION_REGISTRY metadata
    navigation.ts       NavigationContent schema
    theme.ts            ThemeContent schema + toCssVariables()
    media.ts            MediaAsset, upload constraints
    repository.ts       CmsRepository, MediaRepository interfaces
    markdown.ts         restricted Markdown -> safe HTML (no raw HTML pass-through)
    defaults/           home.ts, about.ts, navigation.ts, theme.ts (today's content as data)
  application/
    usePublishedDocument.ts   storefront read (published, with preview override)
    useDraftDocument.ts       editor read/save/publish/restore/revisions
    useMedia.ts               list/upload/delete
    previewBridge.ts          postMessage protocol (editor side + storefront side)
  infrastructure/
    MockCmsRepository.ts, MockMediaRepository.ts (seeded from domain/defaults)
    SupabaseCmsRepository.ts, SupabaseMediaRepository.ts
  presentation/
    sections/           one renderer per section type, wrapping existing components
    SectionRenderer.tsx, PageRenderer.tsx
    editor/             EditorShell, SectionList, SectionForm (per type), AddSectionMenu,
                        PreviewFrame, DeviceSwitcher, PublishBar, RevisionsSheet
    media/              MediaLibraryDialog, MediaGrid, UploadDropzone
    navigation/         NavigationEditor
    theme/              ThemeEditor, ThemeApplier (reads published theme, sets CSS vars)
    announcement/       AnnouncementEditor
src/pages/admin/
  ContentPage.tsx       lists documents with draft/published status, "Edit" -> editor
  EditorPage.tsx        visual editor
  MediaPage.tsx, NavigationPage.tsx, ThemePage.tsx, RevisionsPage.tsx (document history)
```

`HomePage` and `AboutPage` become `PageRenderer` calls for `page:home` / `page:about`. `AnnouncementBar`, `Header`, `Footer` read published global documents through `usePublishedDocument`, falling back to the defaults while loading so there is no layout shift. `ThemeApplier` mounts once in `StorefrontLayout`.

Admin sidebar gains: Content, Media, Navigation, Theme (between Dashboard and Products). Dashboard overview gains a "Content" card (unpublished drafts count).

### 4.6 Supabase schema (`supabase/migrations/0002_cms.sql`)

```
cms_documents   id, key text unique, kind enum(page|navigation|theme|announcement),
                title, draft jsonb, published jsonb null, draft_version int, published_version int,
                updated_by uuid, published_at, created_at, updated_at
cms_revisions   id, document_id fk, version int, content jsonb, note text, created_by uuid, created_at;
                unique(document_id, version); index(document_id, created_at desc)
cms_media       id, bucket, path unique, url, alt, mime, size_bytes, width, height,
                uploaded_by uuid, created_at
cms_audit_log   id, actor uuid, action text, document_key text null, media_id uuid null,
                details jsonb, created_at
view cms_published_documents (security_invoker=false, anon select) -> key, kind, published, published_version
RPCs (security definer, is_admin() checked):
  cms_save_draft(p_key, p_content, p_expected_version) -> new version | raises CF001 on mismatch
  cms_publish(p_key, p_note) -> copies draft to published, inserts revision, audit row
  cms_restore_revision(p_key, p_version) -> copies revision content into draft (bumps draft_version)
  cms_delete_media(p_id) -> refuses when referenced (NF/CF errors)
RLS: base tables admin-only for all; view grants select to anon + authenticated.
Storage: bucket cms-media, policies mirror product-images.
Seed: inserts the four default documents with draft = published = defaults.
```

`database.types.ts` gains the new tables, view, and RPCs. `docs/supabase.md` gains a CMS section.

The content JSON stored in Supabase is validated by the same Zod schemas on read; invalid rows fall back to defaults and surface an admin warning rather than crashing the storefront.

### 4.7 Security

- All writes go through RPCs that call `is_admin()`; RLS denies direct writes.
- Rich text: restricted Markdown (headings, paragraphs, bold, italic, links with `https?` only, lists). No raw HTML, no `dangerouslySetInnerHTML` with unsanitised input. Rendered to React elements, not HTML strings.
- Links in nav/CTAs: `href` must be a relative path or `https://` URL (Zod refinement).
- Media: type and size validated client-side and by bucket policy (`allowed_mime_types`, `file_size_limit`).
- Audit log rows on save, publish, restore, media upload/delete.
- Preview isolation as in 4.4.

### 4.8 Mock mode

`MockCmsRepository` keeps documents in memory seeded from `domain/defaults`, implements version checks and revisions identically. `MockMediaRepository` stores object URLs for uploaded files (session only) plus the seeded Pexels assets. Everything is verifiable without a Supabase project, which matches the current state of the repo.

## 5. File-by-file impact (existing files)

| File                                                                                          | Change                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/storefront/HomePage.tsx`                                                           | Replace body with `<PageRenderer docKey="page:home" />`; hero/promo/values markup moves into `cms/presentation/sections/*` unchanged. |
| `src/pages/storefront/AboutPage.tsx`                                                          | Same for `page:about`; anchors preserved via section `anchor`.                                                                        |
| `src/components/layout/AnnouncementBar.tsx`                                                   | Read `global:announcement`.                                                                                                           |
| `src/components/layout/Header.tsx`, `MobileNavigation.tsx`, `storefrontNav.ts`                | Links from `global:navigation`; `BRAND_NAME` from store settings.                                                                     |
| `src/components/layout/Footer.tsx`                                                            | Columns from `global:navigation`; newsletter copy from it too.                                                                        |
| `src/components/layout/StorefrontLayout.tsx`                                                  | Mount `ThemeApplier` and the storefront preview bridge.                                                                               |
| `src/components/layout/adminNav.ts`, `AdminBreadcrumbs` labels                                | New items.                                                                                                                            |
| `src/app/router/routes.ts`, `router/index.tsx`                                                | New admin routes.                                                                                                                     |
| `src/config/repositories.ts` + both factories                                                 | Add `cms`, `media`.                                                                                                                   |
| `src/lib/queryKeys.ts`                                                                        | `cms.*`, `media.*`.                                                                                                                   |
| `src/components/common/ImageUploadField.tsx`                                                  | "Choose from library" button.                                                                                                         |
| `src/pages/admin/DashboardPage.tsx`                                                           | Content status card.                                                                                                                  |
| `src/lib/supabase/database.types.ts`, `docs/supabase.md`, `docs/architecture.md`, `README.md` | Documentation and types.                                                                                                              |
| `package.json`                                                                                | Add `@dnd-kit/core`, `@dnd-kit/sortable`; remove the stray `cn` package (installed by mistake during shadcn setup, unused).           |

Untouched: products, categories, inventory, orders, customers, settings, cart, checkout, auth flows, order RPCs, existing tests.

## 6. Risks and compatibility

- **Visual parity**: defaults are copied verbatim from today's markup; a Playwright screenshot comparison of `/` and `/about` before and after guards this.
- **Loading flash**: storefront renders defaults synchronously while the published document loads; mock latency is masked, Supabase latency shows defaults for ~200 ms then swaps only if content differs. Acceptable; documents are small and cached.
- **Anchors**: About page ids are preserved through section anchors; a test asserts `#shipping` etc. exist.
- **Theme safety**: only enumerated tokens; invalid hex rejected by Zod.
- **Scope**: page creation is limited to the two existing pages plus new `rich_text` pages at `/pages/:slug` (Phase "Page Management"); product/category pages stay code-driven.
- **No live Supabase**: SQL is reviewed, not executed. Same caveat as migration 0001.

## 7. Phases

1. Domain + defaults + mock repositories + `PageRenderer`; swap Home/About/Announcement/Nav/Footer to read documents. Screenshot parity check. Tests for schemas and renderer.
2. Admin Content list + visual editor (section list, forms, preview iframe, device switcher, publish bar, revisions, conflict handling). Tests for draft/publish/restore/conflict.
3. Media library (page, dialog, upload, delete guard) + product form integration.
4. Navigation editor, Theme editor + `ThemeApplier`, Announcement editor, custom pages at `/pages/:slug`.
5. Supabase: migration 0002, types, adapters, docs.
6. QA: typecheck, lint, Vitest, Playwright (editor flow + parity + mobile preview), responsive probes.
