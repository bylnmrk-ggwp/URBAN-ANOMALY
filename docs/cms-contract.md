# CMS implementation contract (for parallel work)

Read `docs/superpowers/specs/2026-10-11-cms-design.md` first, then this file, then `docs/architecture.md`.

## Already written (do not change signatures)

- `src/features/cms/domain/common.ts` — `safeHrefSchema`, `imageRefSchema` (`{ mediaId, url, alt }`), `ctaSchema`, `isCtaSet`, `isExternalHref`, `emptyImage`.
- `src/features/cms/domain/sections.ts` — section Zod schemas, `Section`, `SectionType`, `SectionOf<T>`, `PageContent`, `SECTION_META`, `createSection(type)`, `newSectionId()`, `VALUE_ICONS`.
- `src/features/cms/domain/navigation.ts` — `NavigationContent`, `AnnouncementContent`, `NavLink`, `FooterColumn` + schemas.
- `src/features/cms/domain/theme.ts` — `ThemeContent`, `themeContentSchema`, `themeToCssVariables()`, `THEME_CSS_KEYS`, `THEME_FONTS`.
- `src/features/cms/domain/documents.ts` — `DocumentKind`, `DocumentKey`, `GLOBAL_KEYS`, `pageKey()`, `parseDocumentKey()`, `CONTENT_SCHEMAS`, `ContentFor<K>`, `CmsDocument<K>`, `DocumentSummary`, `Revision`, `AuditEntry`, `parseContent()`, `pageSlugSchema`, `RESERVED_PAGE_SLUGS`.
- `src/features/cms/domain/media.ts` — `MediaAsset`, `MediaUploadInput`, `MediaFilters`, `validateMediaFile()`, `formatBytes()`, `MEDIA_BUCKET`, limits.
- `src/features/cms/domain/markdown.ts` — `parseMarkdown()` -> `BlockNode[]`, `parseInline()`, `plainText()`.
- `src/features/cms/domain/repository.ts` — `CmsRepository`, `MediaRepository`, `PublishedDocument<K>`.
- `src/features/cms/domain/defaults/{home,about,globals,index}.ts` — `DEFAULT_DOCUMENTS`, `DEFAULT_MEDIA`, `BUILT_IN_PAGE_SLUGS`, `defaultContentFor()`, per-doc constants.
- `src/features/cms/application/previewBridge.ts` — storefront side: `installPreviewReceiver()`, `usePreviewOverride()`, `useSelectedPreviewSection()`, `reportSectionClick()`, `isPreviewMode()`; editor side: `postDraftToPreview()`, `postSelectionToPreview()`, `previewPathFor()`, `createPreviewToken()`, `PREVIEW_PARAM`.
- `src/features/cms/application/usePublishedDocument.ts` — `usePublishedDocument(kind, key)` -> `{ content, isFallback, isPreview, isError }`; `usePublishedPage(slug)`.
- `src/lib/queryKeys.ts` — `queryKeys.cms.*`, `queryKeys.media.*`.
- `src/config/repositories.ts` — `Repositories` now has `cms: CmsRepository` and `media: MediaRepository`.

## Ownership

| Owner                   | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storefront agent**    | `src/features/cms/presentation/sections/**`, `SectionRenderer.tsx`, `PageRenderer.tsx`, `ThemeApplier.tsx`, `MarkdownBlocks.tsx`; edits to `HomePage.tsx`, `AboutPage.tsx`, `AnnouncementBar.tsx`, `Header.tsx`, `MobileNavigation.tsx`, `CollectionsMenu.tsx`, `storefrontNav.ts`, `Footer.tsx`, `StorefrontLayout.tsx`; new `src/pages/storefront/CustomPage.tsx`; mock repos `src/features/cms/infrastructure/Mock*.ts`; wiring in `src/mocks/createMockRepositories.ts`. |
| **Editor agent**        | `src/features/cms/application/useDraftDocument.ts`, `useCmsDocuments.ts`; `src/features/cms/presentation/editor/**`; `src/pages/admin/{ContentPage,EditorPage,RevisionsPage}.tsx`; routes + adminNav + breadcrumbs entries for content/editor; `DashboardPage` content card.                                                                                                                                                                                                 |
| **Media/globals agent** | `src/features/cms/application/useMedia.ts`; `src/features/cms/presentation/media/**`, `navigation/**`, `theme/**`, `announcement/**`; `src/pages/admin/{MediaPage,NavigationPage,ThemePage,AnnouncementPage}.tsx`; routes + adminNav entries for those; `ImageUploadField` "Choose from library" button.                                                                                                                                                                     |
| **Supabase agent**      | `supabase/migrations/0002_cms.sql`, `src/lib/supabase/database.types.ts` additions, `src/features/cms/infrastructure/Supabase*.ts`, `createSupabaseRepositories.ts` wiring, `docs/supabase.md` CMS section.                                                                                                                                                                                                                                                                  |

Shared files with multiple owners (`routes.ts`, `router/index.tsx`, `adminNav.ts`, `AdminBreadcrumbs.tsx`): each agent adds only its own lines; keep additions append-style to avoid conflicts.

## Shared contracts (agents import these from each other)

- Editor agent writes `useDraftDocument(kind, key)` returning `{ document, isLoading, error, draft, setDraft, isDirty, save, publish, restore, revisions, conflict, reload }` (mutations as TanStack objects). Media/globals agent uses it for navigation/theme/announcement editors.
- Media agent writes `MediaLibraryDialog` in `src/features/cms/presentation/media/MediaLibraryDialog.tsx` with props `{ open, onOpenChange, onSelect(asset: MediaAsset) }` and `ImagePickerField` (`{ value: ImageRef, onChange(ref: ImageRef), label }`) in the same folder. Editor agent uses `ImagePickerField` in section forms.
- Storefront agent writes `PageRenderer` (`{ content: PageContent, editable?: boolean }`) and `SectionRenderer`. Editor agent does NOT render sections itself; the preview iframe loads the real storefront route.
- Routes (editor agent adds): `routes.admin.content = '/admin/content'`, `routes.admin.editor(key) = '/admin/editor?doc=<key>'`, `routes.admin.revisions(key)`. Media agent adds: `routes.admin.media`, `routes.admin.navigation`, `routes.admin.theme`, `routes.admin.announcement`. Storefront agent adds `routes.page(slug) = '/pages/<slug>'`.
- Mock `MockCmsRepository` and `MockMediaRepository` constructors take the shared `MockStore` (`src/mocks/MockStore.ts`); add CMS state to the store (documents map, revisions, media, audit) — storefront agent owns this.

## Rules

Strict TS, no `any`, `import type`, Prettier (no semicolons, single quotes, width 100). Components under ~200 lines. Every data view: skeleton, EmptyState, ErrorState. Run `npx tsc -b --noEmit` filtered to your files; ignore errors in files owned by others (they are in flight). Do not run `npm install`.
