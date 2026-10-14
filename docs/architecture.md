# Architecture Brief

This document is the shared contract for everyone working on the codebase. Read it before adding files.

## Stack

React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Vite 8, Tailwind CSS v4 (`@theme inline` tokens in `src/styles/globals.css`), shadcn/ui (`src/components/ui`, imports `radix-ui` single package), React Router v7 (declarative `<Routes>`), TanStack Query v5, Zustand v5, React Hook Form + Zod v4 (`zod` import; use `z.email()`, `z.url()` top-level helpers), lucide-react, sonner toasts, recharts (admin only). ESLint flat config, Prettier (no semicolons, single quotes, width 100), Vitest + Testing Library, Playwright.

Path alias: `@/` -> `src/`. Use `import type` for type-only imports (lint rule). Never use `any`.

## Layers

```
src/features/<feature>/
  domain/          entities, pure rules, zod schemas, repository interface  (no React, no Supabase)
  application/     TanStack Query hooks + small use-case functions          (imports repositories from @/config/repositories)
  infrastructure/  Mock*Repository and Supabase*Repository implementations  (NOT imported by presentation)
  presentation/    feature components                                        (hooks only, no repositories)
src/pages/         route components, compose presentation components
src/components/ui       shadcn primitives
src/components/common   EmptyState, ErrorState, LoadingState, ConfirmDialog, PageHeader, StatusBadge family
src/components/layout   StorefrontLayout, Header, Footer, MobileNavigation, AdminLayout, AdminSidebar, AdminTopbar
src/stores         cartStore (persisted, versioned), uiStore (theme, sidebar)
src/config         env.ts, repositories.ts (composition root)
src/mocks          seed data + createMockRepositories()
src/lib            utils, format, errors, queryKeys, supabase/
```

Rules: presentation never imports from `infrastructure` or `@/lib/supabase`. Application hooks read `repositories` from `@/config/repositories` and use `queryKeys` from `@/lib/queryKeys`. Mutations invalidate the related key family.

## Composition root

`src/config/repositories.ts` exports `repositories: Repositories` with members `products, categories, orders, inventory, customers, notifications, settings, auth, dashboard`. It selects `createMockRepositories()` (from `@/mocks/createMockRepositories`) when `env.isMock`, otherwise `createSupabaseRepositories()` (from `@/lib/supabase/createSupabaseRepositories`). Both factories return the full `Repositories` object.

## Domain modules (already written; do not change signatures without updating callers)

- Sizes: `PRODUCT_SIZES` is one US unisex footwear union `'5'`–`'12'` shared by every product (kids styles use `'5'`–`'8'` as a kids run); the Supabase check constraint, CSV import, size guide and `sizeRecommendation.ts` (foot length in cm) all derive from it.
- `features/products/domain/{entities,rules,repository,schema}.ts` — `Product`, `ProductVariant`, `ProductFilters`, `AdminProductFilters`, `ProductInput`, `ProductRepository`; rules: `availableStock`, `totalAvailableStock`, `getDisplayPrice`, `isOnSale`, `getDiscountPercent`, `getProductBadge`, `getPrimaryImage`, `uniqueColors`, `uniqueSizes`, `findVariant`, `isSizeAvailable`, `isColorAvailable`, `clampQuantity`, `generateSku`; `productFormSchema`, `ProductFormValues`.
- `features/categories/domain/{entities,repository,schema}.ts` — `Category`, `CategoryInput`, `CategoryRepository`, `categoryFormSchema`.
- `features/cart/domain/{entities,rules}.ts` — `CartItem`, `ResolvedCartLine`, `CartTotals`; `resolveCartLines(items, products)`, `calculateTotals(lines)`, `hasBlockingIssues`, `calculateShippingFee`, `FREE_SHIPPING_THRESHOLD`, `FLAT_SHIPPING_FEE`, `MAX_QUANTITY_PER_LINE`.
- `stores/cartStore.ts` — `useCartStore` with `items, addItem({productId, variantId, quantity, maxQuantity}), setQuantity(variantId, qty, max?), removeItem(variantId), clearCart(), announce(msg), lastAnnouncement`; `selectCartCount`.
- `features/orders/domain/{entities,rules,repository}.ts` — `Order`, `OrderSummary`, `OrderItem`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `PlaceOrderInput`, `PlaceOrderResult`, `AdminOrderFilters`, `OrderRepository`; rules: label maps, `ORDER_STATUS_TRANSITIONS`, `canTransition`, `getAvailableAdminActions(order)`, `canCustomerCancel`, `ORDER_PROGRESS_STEPS`, `getProgressIndex`, `initialStatusFor`, `initialPaymentStatusFor`, `isPrepaidMethod`, `isValidGcashReference`, `ORDER_STATUS_TONE`, `PAYMENT_STATUS_TONE`, `generateOrderNumber`. `PaymentMethod` is `'cod' | 'online' | 'gcash'`; `Order.paymentReference` holds the buyer's GCash reference.
- `features/checkout/domain/schema.ts` — `checkoutSchema`, `CheckoutFormValues`, `checkoutDefaults`.
- `features/inventory/domain/{entities,repository}.ts` — `InventoryRow`, `InventoryMovement`, `StockAdjustmentInput`, `InventoryFilters`, `deriveStockStatus`, label maps, `InventoryRepository`.
- `features/customers/domain/entities.ts` — `Customer`, `CustomerDetail`, `CustomerRepository`.
- `features/notifications/domain/entities.ts` — `AppNotification`, `NotificationRepository` (with `subscribe`).
- `features/settings/domain/entities.ts` — `StoreSettings`, `storeSettingsSchema`, `SettingsRepository`.
- `features/auth/domain/entities.ts` — `AuthUser`, `AuthSession`, `AuthStatus`, `SavedAddress`, `AuthRepository`, `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `profileSchema`, `addressSchema`.
- `features/dashboard/domain/entities.ts` — `DashboardSummary`, `DashboardRepository`.
- `types/common.ts` — `PaginatedResult<T>`, `paginate()`. `lib/errors.ts` — `AppError`, `getErrorMessage`. `lib/format.ts` — `formatPrice` (PHP), `formatDate`, `formatDateTime`, `formatRelative`, `slugify`, `pluralize`.

## Shared hooks contract (owned by the named area; others import them)

- `features/auth/application/useAuth.ts` (app shell): `useAuth()` returns `{ status: AuthStatus, user: AuthUser | null, isAdmin: boolean, signIn, signUp, signOut, requestPasswordReset, updateProfile, saveAddress, removeAddress }` where mutators are TanStack mutation objects (`mutateAsync`, `isPending`, `error`). Provided through `AuthProvider` context.
- `features/categories/application/hooks.ts` (storefront): `useCategories()` query returning `Category[]`; `useCategoryMutations()` (admin) in the same file returning `{ create, update, remove }` mutations.
- `features/notifications/application/hooks.ts` (app shell): `useNotifications()` -> `{ notifications, unreadCount, markRead, markAllRead, isLoading }`.

## Routes

Storefront (`StorefrontLayout`): `/`, `/shop`, `/collections/:slug` (ShopPage with category preset), `/products/:slug`, `/cart`, `/checkout`, `/orders/confirmation/:orderNumber`, `/about`, `/login`, `/register`, `/forgot-password`, `/account` (ProtectedRoute), `/account/orders`, `/account/orders/:id`.

Admin (`AdminRoute` + `AdminLayout`, lazy chunk): `/admin` -> redirect `/admin/dashboard`, `/admin/dashboard`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories`, `/admin/inventory`, `/admin/orders`, `/admin/orders/:id`, `/admin/customers`, `/admin/settings`.

All pages are default-exported from `src/pages/storefront/*.tsx` and `src/pages/admin/*.tsx` with the file names from the spec (`HomePage`, `ShopPage`, `ProductDetailsPage`, `CartPage`, `CheckoutPage`, `OrderConfirmationPage`, `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `AccountPage`, `MyOrdersPage`, `OrderDetailsPage`, `AboutPage`, `NotFoundPage`; admin: `DashboardPage`, `ProductsPage`, `ProductFormPage`, `CategoriesPage`, `InventoryPage`, `OrdersPage`, `AdminOrderDetailsPage`, `CustomersPage`, `SettingsPage`). Router lazy-loads each page.

## Design system

Neutral palette tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary text-primary-foreground`. Semantic: `success`, `warning`, `info`, `destructive`. Radius 6px. Font Inter. Container utility: `container-x`. Storefront is editorial and spacious (large type, generous whitespace, no shadows); admin is dense but calm (cards with `border`, no gradients). Every data view implements loading (Skeleton), empty (`EmptyState`), error (`ErrorState` with retry). Status is always text + colour (`StatusBadge`). Touch targets >= 44px on mobile. Images: `loading="lazy"`, explicit aspect ratio containers (`aspect-[3/4]` for product images), `object-cover`.

## Mock mode

Demo accounts: `admin@demo.local` / `password` (admin), `buyer@demo.local` / `password` (buyer). Mock repositories keep state in module memory, simulate 150–400 ms latency, and share one store so orders created at checkout appear in admin pages. Role is resolved by the auth repository, never read from localStorage.

## CMS (added 2026-10-11)

Design spec: `docs/superpowers/specs/2026-10-11-cms-design.md`. Implementation contract: `docs/cms-contract.md`.

- `features/cms/domain`: section schemas (`sections.ts`), navigation/announcement/theme schemas, document model with draft/published/versions (`documents.ts`), restricted Markdown parser, media constraints, repository interfaces, and `defaults/` holding today's storefront as data.
- `features/cms/application`: `usePublishedDocument` (storefront read, defaults as synchronous fallback, preview override), `useDraftDocument` (editor state, optimistic version locking), `useCmsDocuments`, `useMedia`, `previewBridge` (postMessage protocol gated by origin + per-session token).
- `features/cms/presentation`: `PageRenderer` and one renderer per section (storefront), `editor/` (visual editor), `media/`, `navigation/`, `theme/`, `announcement/`, `globals/` (shared draft form shell).
- Storefront pages `HomePage`, `AboutPage`, `CustomPage` and the layout chrome read published documents; `ThemeApplier` writes only the CSS variables listed in `themeToCssVariables`.
- Supabase: `cms_documents`, `cms_revisions`, `cms_media`, `cms_audit_log`, view `cms_published_documents` (the only thing visitors can read), RPCs for every write, bucket `cms-media`.
