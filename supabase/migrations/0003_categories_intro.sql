-- =============================================================================
-- 0003_categories_intro.sql — collection landing intro text per category
--
-- Contract: Category.introTitle / introBody (src/features/categories/domain/entities.ts),
-- mapped by toCategory in src/lib/supabase/mappers.ts. Both are plain text; intro_body
-- is restricted Markdown rendered by MarkdownBlocks on the collection page.
-- =============================================================================

alter table public.categories
  add column if not exists intro_title text not null default '',
  add column if not exists intro_body  text not null default '';

alter table public.categories
  add constraint categories_intro_title_len check (char_length(intro_title) <= 120),
  add constraint categories_intro_body_len  check (char_length(intro_body) <= 600);
