-- 0003_products_seo.sql — per-product SEO title / meta description
-- Apply after 0001_schema.sql. Idempotent.

alter table public.products
  add column if not exists seo_title       text not null default '',
  add column if not exists seo_description text not null default '';

alter table public.products drop constraint if exists products_seo_title_len;
alter table public.products drop constraint if exists products_seo_description_len;
alter table public.products
  add constraint products_seo_title_len       check (char_length(seo_title) <= 70),
  add constraint products_seo_description_len check (char_length(seo_description) <= 160);

-- `save_product(p_product_id, p_payload)` must copy `seo_title` / `seo_description` from the
-- payload into the row. Minimal patch (keeps the rest of the function from 0001 intact):
--
--   update public.products set
--     ...,
--     seo_title       = coalesce(p_payload->>'seo_title', ''),
--     seo_description = coalesce(p_payload->>'seo_description', '')
--   where id = v_id;
--
-- Re-run the full `create or replace function public.save_product` from 0001 with those two
-- assignments added to both the insert and the update branches.
