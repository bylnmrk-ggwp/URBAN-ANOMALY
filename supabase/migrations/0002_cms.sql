-- =============================================================================
-- 0002_cms.sql — content management: documents, revisions, media, audit log
--
-- Contract: src/lib/supabase/database.types.ts (cms_* tables, view, RPCs) and
-- src/features/cms/domain/* (Zod schemas of the JSON stored in draft/published).
--
-- Conventions (same as 0001_schema.sql)
--   * Visitors read ONLY the view cms_published_documents. The base tables are
--     readable by admins and writable by nobody: every write is a SECURITY
--     DEFINER RPC that checks is_admin() first and bypasses RLS.
--   * Optimistic locking on cms_documents.draft_version (cms_save_draft).
--   * Custom SQLSTATE codes mapped by mappers.ts:
--       VA001 validation   NF001 not_found   CF001 conflict   FB001 forbidden
--   * Media ids are TEXT (default gen_random_uuid()::text) so the seeded assets
--     keep the ids referenced by the default documents ("mediaId": "media-...").
--   * Actor display names are denormalised (updated_by_name, created_by_name,
--     uploaded_by_name, actor_name) so admin reads never need to join profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.cms_document_kind as enum ('page', 'navigation', 'theme', 'announcement');
create type public.cms_audit_action as enum (
  'save_draft', 'publish', 'restore', 'media_upload', 'media_delete', 'create_page', 'delete_page'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
-- One row per editable document. key = 'page:<slug>' | 'global:<kind>'.
create table public.cms_documents (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique,
  kind               public.cms_document_kind not null,
  title              text not null,
  draft              jsonb not null,
  published          jsonb,
  draft_version      integer not null default 1,
  published_version  integer not null default 0,
  updated_by         uuid references public.profiles (id) on delete set null,
  updated_by_name    text not null default '',
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (draft_version >= published_version),
  check (draft_version >= 1 and published_version >= 0),
  check ((published is null) = (published_version = 0)),
  check ((published is null) = (published_at is null))
);
create index cms_documents_kind_idx on public.cms_documents (kind);

create trigger cms_documents_set_updated_at
  before update on public.cms_documents
  for each row execute function public.set_updated_at();

-- Snapshot taken at every publish. `version` is the published_version it produced.
create table public.cms_revisions (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.cms_documents (id) on delete cascade,
  version          integer not null,
  content          jsonb not null,
  note             text not null default '',
  created_by       uuid references public.profiles (id) on delete set null,
  created_by_name  text not null default '',
  created_at       timestamptz not null default now(),
  unique (document_id, version)
);
create index cms_revisions_document_created_idx on public.cms_revisions (document_id, created_at desc);

create table public.cms_media (
  id                text primary key default gen_random_uuid()::text,
  bucket            text not null default 'cms-media',
  path              text not null unique,
  url               text not null,
  alt               text not null default '',
  mime              text not null,
  size_bytes        integer not null check (size_bytes >= 0),
  width             integer check (width is null or width > 0),
  height            integer check (height is null or height > 0),
  uploaded_by       uuid references public.profiles (id) on delete set null,
  uploaded_by_name  text not null default '',
  created_at        timestamptz not null default now()
);
create index cms_media_created_idx on public.cms_media (created_at desc);

create table public.cms_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor         uuid references public.profiles (id) on delete set null,
  actor_name    text not null default '',
  action        public.cms_audit_action not null,
  document_key  text,
  media_id      text,
  details       text not null default '',
  created_at    timestamptz not null default now()
);
create index cms_audit_log_created_idx on public.cms_audit_log (created_at desc);

-- -----------------------------------------------------------------------------
-- View: the only CMS surface visitors can read. Definer rights on purpose so anon
-- can read published content while the base table stays admin-only.
-- -----------------------------------------------------------------------------
create view public.cms_published_documents with (security_invoker = false) as
select d.key, d.kind, d.published, d.published_version, d.published_at
from public.cms_documents d
where d.published is not null;

grant select on public.cms_published_documents to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
-- Display name for audit/revision rows: profile name, else email, else 'system'.
create or replace function public.cms_actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(trim(full_name), '') from public.profiles where id = auth.uid()),
    public.current_actor()
  );
$$;

create or replace function public.cms_audit(
  p_action public.cms_audit_action, p_document_key text, p_media_id text, p_details text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cms_audit_log (actor, actor_name, action, document_key, media_id, details)
  values (auth.uid(), public.cms_actor_name(), p_action, p_document_key, p_media_id, coalesce(p_details, ''));
end $$;

-- Document json consumed by mappers.ts (cmsDocumentJsonSchema).
create or replace function public.cms_document_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'key', d.key,
    'kind', d.kind,
    'title', d.title,
    'draft', d.draft,
    'published', d.published,
    'draft_version', d.draft_version,
    'published_version', d.published_version,
    'updated_by_name', d.updated_by_name,
    'updated_at', d.updated_at,
    'published_at', d.published_at
  )
  from public.cms_documents d where d.id = p_id;
$$;

create or replace function public.cms_media_json(p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(m) from public.cms_media m where m.id = p_id;
$$;

-- Mirrors RESERVED_PAGE_SLUGS in src/features/cms/domain/documents.ts
create or replace function public.cms_is_reserved_slug(p_slug text)
returns boolean language sql immutable as $$
  select p_slug in (
    'shop', 'cart', 'checkout', 'login', 'register', 'forgot-password',
    'account', 'admin', 'orders', 'products', 'collections'
  );
$$;

-- -----------------------------------------------------------------------------
-- RPC: cms_save_draft(p_key, p_content, p_expected_version) -> document json
-- -----------------------------------------------------------------------------
create or replace function public.cms_save_draft(p_key text, p_content jsonb, p_expected_version integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Content must be a JSON object.' using errcode = 'VA001';
  end if;

  select * into d from public.cms_documents where key = p_key for update;
  if not found then
    raise exception 'Document % not found.', p_key using errcode = 'NF001';
  end if;
  if d.draft_version <> p_expected_version then
    raise exception 'This document was changed by someone else (you have v%, server has v%). Reload and reapply your edits.',
      p_expected_version, d.draft_version using errcode = 'CF001';
  end if;

  update public.cms_documents
     set draft = p_content,
         draft_version = draft_version + 1,
         updated_by = auth.uid(),
         updated_by_name = public.cms_actor_name()
   where id = d.id;

  perform public.cms_audit('save_draft', d.key, null, 'Saved draft v' || (d.draft_version + 1));
  return public.cms_document_json(d.id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_publish(p_key, p_note) -> document json
-- Copies draft to published in one UPDATE and snapshots it as a revision.
-- -----------------------------------------------------------------------------
create or replace function public.cms_publish(p_key text, p_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
  v_note text := coalesce(trim(p_note), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;

  select * into d from public.cms_documents where key = p_key for update;
  if not found then
    raise exception 'Document % not found.', p_key using errcode = 'NF001';
  end if;
  if d.published_version = d.draft_version then
    raise exception 'There are no unpublished changes.' using errcode = 'CF001';
  end if;

  update public.cms_documents
     set published = draft,
         published_version = draft_version,
         published_at = now(),
         updated_by = auth.uid(),
         updated_by_name = public.cms_actor_name()
   where id = d.id;

  insert into public.cms_revisions (document_id, version, content, note, created_by, created_by_name)
  values (d.id, d.draft_version, d.draft, v_note, auth.uid(), public.cms_actor_name());

  perform public.cms_audit('publish', d.key, null,
    'Published v' || d.draft_version || case when v_note = '' then '' else ': ' || v_note end);
  return public.cms_document_json(d.id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_restore_revision(p_key, p_version) -> document json
-- Copies a snapshot into the draft; the admin publishes afterwards.
-- -----------------------------------------------------------------------------
create or replace function public.cms_restore_revision(p_key text, p_version integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
  r public.cms_revisions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;

  select * into d from public.cms_documents where key = p_key for update;
  if not found then
    raise exception 'Document % not found.', p_key using errcode = 'NF001';
  end if;
  select * into r from public.cms_revisions where document_id = d.id and version = p_version;
  if not found then
    raise exception 'Revision v% not found.', p_version using errcode = 'NF001';
  end if;

  update public.cms_documents
     set draft = r.content,
         draft_version = draft_version + 1,
         updated_by = auth.uid(),
         updated_by_name = public.cms_actor_name()
   where id = d.id;

  perform public.cms_audit('restore', d.key, null,
    'Restored v' || p_version || ' into draft v' || (d.draft_version + 1));
  return public.cms_document_json(d.id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_create_page(p_slug, p_title, p_content) -> document json
-- The new page starts unpublished (published null, published_version 0).
-- -----------------------------------------------------------------------------
create or replace function public.cms_create_page(p_slug text, p_title text, p_content jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if length(v_slug) < 2 or length(v_slug) > 60 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Use 2-60 lowercase letters, numbers and hyphens for the slug.' using errcode = 'VA001';
  end if;
  if public.cms_is_reserved_slug(v_slug) then
    raise exception 'The slug "%" is reserved by the storefront.', v_slug using errcode = 'VA001';
  end if;
  if v_title = '' then
    raise exception 'Enter a page title.' using errcode = 'VA001';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Content must be a JSON object.' using errcode = 'VA001';
  end if;
  if exists (select 1 from public.cms_documents where key = 'page:' || v_slug) then
    raise exception 'A page with the slug "%" already exists.', v_slug using errcode = 'CF001';
  end if;

  insert into public.cms_documents (key, kind, title, draft, updated_by, updated_by_name)
  values ('page:' || v_slug, 'page', v_title, p_content, auth.uid(), public.cms_actor_name())
  returning id into v_id;

  perform public.cms_audit('create_page', 'page:' || v_slug, null, 'Created page "' || v_title || '"');
  return public.cms_document_json(v_id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_delete_page(p_slug) -> void   (built-in pages cannot be deleted)
-- -----------------------------------------------------------------------------
create or replace function public.cms_delete_page(p_slug text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if p_slug in ('home', 'about') then
    raise exception 'The % page ships with the storefront and cannot be deleted.', p_slug using errcode = 'VA001';
  end if;

  select * into d from public.cms_documents where key = 'page:' || p_slug and kind = 'page' for update;
  if not found then
    raise exception 'Page % not found.', p_slug using errcode = 'NF001';
  end if;

  delete from public.cms_documents where id = d.id; -- revisions cascade
  perform public.cms_audit('delete_page', d.key, null, 'Deleted page "' || d.title || '"');
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_register_media(...) -> media json
-- Called after the client uploaded the object to storage bucket cms-media.
-- -----------------------------------------------------------------------------
create or replace function public.cms_register_media(
  p_path text, p_url text, p_alt text, p_mime text, p_size integer, p_width integer, p_height integer
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if nullif(trim(coalesce(p_path, '')), '') is null or nullif(trim(coalesce(p_url, '')), '') is null then
    raise exception 'Media path and URL are required.' using errcode = 'VA001';
  end if;
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/avif') then
    raise exception 'Only JPEG, PNG, WebP and AVIF images are allowed.' using errcode = 'VA001';
  end if;
  if p_size is null or p_size < 0 or p_size > 5242880 then
    raise exception 'Images must be 5 MB or smaller.' using errcode = 'VA001';
  end if;
  if exists (select 1 from public.cms_media where path = p_path) then
    raise exception 'A media asset already exists at %.', p_path using errcode = 'CF001';
  end if;

  insert into public.cms_media (path, url, alt, mime, size_bytes, width, height, uploaded_by, uploaded_by_name)
  values (
    p_path, p_url, left(coalesce(p_alt, ''), 160), p_mime, p_size,
    nullif(p_width, 0), nullif(p_height, 0), auth.uid(), public.cms_actor_name()
  )
  returning id into v_id;

  perform public.cms_audit('media_upload', null, v_id, 'Uploaded ' || p_path);
  return public.cms_media_json(v_id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_update_media_alt(p_id, p_alt) -> media json
-- -----------------------------------------------------------------------------
create or replace function public.cms_update_media_alt(p_id text, p_alt text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  update public.cms_media set alt = left(trim(coalesce(p_alt, '')), 160) where id = p_id;
  if not found then
    raise exception 'Media asset not found.' using errcode = 'NF001';
  end if;
  return public.cms_media_json(p_id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_media_usages(p_id) -> text[]  (document keys referencing the asset)
-- Section JSON stores images as { "mediaId": "<id>", "url": ..., "alt": ... }
-- at any depth, so a recursive jsonpath match is used (independent of how
-- jsonb::text happens to be spaced).
-- -----------------------------------------------------------------------------
create or replace function public.cms_media_usages(p_id text)
returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  vars jsonb := jsonb_build_object('id', p_id);
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  return coalesce((
    select array_agg(d.key order by d.key)
      from public.cms_documents d
     where jsonb_path_exists(d.draft, '$.** ? (@.mediaId == $id)', vars)
        or (d.published is not null
            and jsonb_path_exists(d.published, '$.** ? (@.mediaId == $id)', vars))
  ), '{}'::text[]);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_delete_media(p_id) -> void
-- Refuses while any document references the asset. The client removes the
-- storage object after this succeeds.
-- -----------------------------------------------------------------------------
create or replace function public.cms_delete_media(p_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  m public.cms_media%rowtype;
  v_usages text[];
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;

  select * into m from public.cms_media where id = p_id for update;
  if not found then
    raise exception 'Media asset not found.' using errcode = 'NF001';
  end if;
  v_usages := public.cms_media_usages(p_id);
  if coalesce(array_length(v_usages, 1), 0) > 0 then
    raise exception 'This image is used by %. Remove it from those documents first.',
      array_to_string(v_usages, ', ') using errcode = 'CF001';
  end if;

  delete from public.cms_media where id = m.id;
  perform public.cms_audit('media_delete', null, m.id, 'Deleted ' || m.path);
end $$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.cms_actor_name() from public;
revoke all on function public.cms_audit(public.cms_audit_action, text, text, text) from public;
revoke all on function public.cms_document_json(uuid) from public;
revoke all on function public.cms_media_json(text) from public;
revoke all on function public.cms_is_reserved_slug(text) from public;
revoke all on function public.cms_save_draft(text, jsonb, integer) from public;
revoke all on function public.cms_publish(text, text) from public;
revoke all on function public.cms_restore_revision(text, integer) from public;
revoke all on function public.cms_create_page(text, text, jsonb) from public;
revoke all on function public.cms_delete_page(text) from public;
revoke all on function public.cms_register_media(text, text, text, text, integer, integer, integer) from public;
revoke all on function public.cms_update_media_alt(text, text) from public;
revoke all on function public.cms_media_usages(text) from public;
revoke all on function public.cms_delete_media(text) from public;

grant execute on function public.cms_save_draft(text, jsonb, integer) to authenticated;
grant execute on function public.cms_publish(text, text) to authenticated;
grant execute on function public.cms_restore_revision(text, integer) to authenticated;
grant execute on function public.cms_create_page(text, text, jsonb) to authenticated;
grant execute on function public.cms_delete_page(text) to authenticated;
grant execute on function public.cms_register_media(text, text, text, text, integer, integer, integer) to authenticated;
grant execute on function public.cms_update_media_alt(text, text) to authenticated;
grant execute on function public.cms_media_usages(text) to authenticated;
grant execute on function public.cms_delete_media(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security: admins read; nobody writes directly (RPCs only).
-- Visitors never touch these tables — they read cms_published_documents.
-- -----------------------------------------------------------------------------
alter table public.cms_documents enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_media     enable row level security;
alter table public.cms_audit_log enable row level security;

create policy cms_documents_select on public.cms_documents for select using (public.is_admin());
create policy cms_revisions_select on public.cms_revisions for select using (public.is_admin());
create policy cms_media_select     on public.cms_media     for select using (public.is_admin());
create policy cms_audit_log_select on public.cms_audit_log for select using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage: cms-media bucket (public read, admin write, 5 MB, images only)
-- Path convention: uploads/<yyyy>/<uuid>.<ext>; seeded rows use seed/<name>.jpg
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-media', 'cms-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "cms media is public" on storage.objects for select
  using (bucket_id = 'cms-media');
create policy "admins upload cms media" on storage.objects for insert
  with check (bucket_id = 'cms-media' and public.is_admin());
create policy "admins update cms media" on storage.objects for update
  using (bucket_id = 'cms-media' and public.is_admin());
create policy "admins delete cms media" on storage.objects for delete
  using (bucket_id = 'cms-media' and public.is_admin());

-- -----------------------------------------------------------------------------
-- Seed: default documents (draft = published = defaults, v1) and library media.
-- Generated from src/features/cms/domain/defaults/*.ts and verified by
-- src/features/cms/infrastructure/seedParity.test.ts — change the TS, then this.
-- -----------------------------------------------------------------------------
insert into public.cms_documents (key, kind, title, draft, published, draft_version, published_version, updated_by_name, published_at)
select 'page:home', 'page', 'Home', c, c, 1, 1, 'Store Admin', now()
from (select $json$
{
  "title": "Home",
  "seoTitle": "URBAN ANOMALY",
  "seoDescription": "Washable EVA clogs, slides and loafer mules, made in Marikina for Manila streets.",
  "sections": [
    {
      "id": "home-hero",
      "type": "hero",
      "visible": true,
      "anchor": "",
      "eyebrow": "New drop",
      "title": "Clogs built for Manila streets.",
      "subtitle": "Single-piece EVA foam, a removable heel strap and a sole that grips wet tile. Rinse them off and wear them again tomorrow.",
      "image": {
        "mediaId": "media-hero-lava",
        "url": "https://images.pexels.com/photos/12368079/pexels-photo-12368079.jpeg?auto=compress&cs=tinysrgb&w=1800",
        "alt": "Pair of EVA clogs resting on a concrete step"
      },
      "slides": [
        {
          "image": {
            "mediaId": "media-hero-ice",
            "url": "https://images.pexels.com/photos/13698233/pexels-photo-13698233.jpeg?auto=compress&cs=tinysrgb&w=1800",
            "alt": "Cushioned slides beside a swimming pool"
          },
          "eyebrow": "Restock",
          "title": "Lava & Ice are back.",
          "subtitle": "Our two best-selling colourways return in every size from 5 to 12, with matching replacement straps.",
          "cta": {
            "label": "Shop the restock",
            "href": "/collections/clogs"
          }
        },
        {
          "image": {
            "mediaId": "media-hero-street",
            "url": "https://images.pexels.com/photos/18188523/pexels-photo-18188523.jpeg?auto=compress&cs=tinysrgb&w=1800",
            "alt": "Matte clogs worn on a Manila sidewalk"
          },
          "eyebrow": "Soft Tones",
          "title": "Made for Manila streets.",
          "subtitle": "Sand, Sage and Lilac: chalky matte colourways that shrug off scuffs and pair with everything in your closet.",
          "cta": {
            "label": "Shop Soft Tones",
            "href": "/shop?sort=newest"
          }
        }
      ],
      "autoplaySeconds": 6,
      "primaryCta": {
        "label": "Shop Clogs",
        "href": "/collections/clogs"
      },
      "secondaryCta": {
        "label": "New Drop",
        "href": "/shop?sort=newest"
      },
      "align": "left",
      "height": "default"
    },
    {
      "id": "home-categories",
      "type": "category_tiles",
      "visible": true,
      "anchor": "",
      "eyebrow": "Browse",
      "title": "Shop by category",
      "categoryIds": [],
      "limit": 5
    },
    {
      "id": "home-new-drop",
      "type": "product_collection",
      "visible": true,
      "anchor": "",
      "eyebrow": "Just landed",
      "title": "New Drop",
      "source": "new_arrivals",
      "productIds": [],
      "limit": 8,
      "viewAllHref": "/shop?sort=newest"
    },
    {
      "id": "home-promo",
      "type": "promo_banner",
      "visible": true,
      "anchor": "",
      "image": {
        "mediaId": "media-promo-slide",
        "url": "https://images.pexels.com/photos/13698233/pexels-photo-13698233.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "alt": "Two-strap slide on a wet boat deck"
      },
      "eyebrow": "Island ready",
      "title": "Two straps. Zero fuss.",
      "body": "The Island Two-Strap Slide locks on for boat decks and jeepney steps, then rinses clean of sand in seconds.",
      "cta": {
        "label": "Shop the slide",
        "href": "/products/island-two-strap-slide"
      },
      "imageSide": "left"
    },
    {
      "id": "home-best-sellers",
      "type": "product_collection",
      "visible": true,
      "anchor": "",
      "eyebrow": "Customer favourites",
      "title": "Best Sellers",
      "source": "best_sellers",
      "productIds": [],
      "limit": 8,
      "viewAllHref": "/shop?sort=best_selling"
    },
    {
      "id": "home-marquee",
      "type": "image_marquee",
      "visible": true,
      "anchor": "",
      "images": [
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/12320132/pexels-photo-12320132.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Clogs on a concrete step"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/12349148/pexels-photo-12349148.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Pale clogs by the pool"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/13836590/pexels-photo-13836590.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Slides on a city sidewalk"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/14187813/pexels-photo-14187813.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Two-strap slide on a boat deck"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/12368097/pexels-photo-12368097.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Clogs lined up in the workshop"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/14544746/pexels-photo-14544746.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Platform clog, side view"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/11883902/pexels-photo-11883902.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Court slide in Lava"
        },
        {
          "mediaId": null,
          "url": "https://images.pexels.com/photos/10117809/pexels-photo-10117809.jpeg?auto=compress&cs=tinysrgb&w=900",
          "alt": "Loafer mule on a wooden floor"
        }
      ],
      "speed": 45,
      "tileHeight": "md",
      "pauseOnHover": true
    },
    {
      "id": "home-values",
      "type": "value_props",
      "visible": true,
      "anchor": "",
      "eyebrow": "Why us",
      "title": "Shoes you can stand behind.",
      "items": [
        {
          "icon": "heart",
          "title": "Made in the Philippines",
          "body": "Moulded, finished and strapped in our partner workshop in Marikina, the shoe capital of the country."
        },
        {
          "icon": "shield-check",
          "title": "Washable & waterproof",
          "body": "Closed-cell EVA soaks up nothing. Rinse with soap and water after the flood and they dry in minutes."
        },
        {
          "icon": "refresh-cw",
          "title": "14-day exchanges",
          "body": "Wrong size? Fourteen days to swap any unworn pair for another size or colour. We cover the pickup."
        }
      ],
      "columns": 3,
      "bordered": true
    },
    {
      "id": "home-newsletter",
      "type": "newsletter",
      "visible": true,
      "anchor": "",
      "title": "Hear about the next drop first",
      "body": "One email a month: new colourways, restocks and the occasional honest sale. No spam.",
      "buttonLabel": "Subscribe"
    }
  ]
}
$json$::jsonb as c) seed;

insert into public.cms_documents (key, kind, title, draft, published, draft_version, published_version, updated_by_name, published_at)
select 'page:about', 'page', 'About', c, c, 1, 1, 'Store Admin', now()
from (select $json$
{
  "title": "About",
  "seoTitle": "About — URBAN ANOMALY",
  "seoDescription": "Washable EVA clogs and slides, moulded in Marikina. Our story, sizing help and policies.",
  "sections": [
    {
      "id": "about-story",
      "type": "rich_text",
      "visible": true,
      "anchor": "",
      "eyebrow": "Our story",
      "title": "Clogs moulded in Marikina, worn all over Manila.",
      "description": "",
      "body": "We started with one aluminium mould, a borrowed injection press in Marikina and a simple question: why do the comfortable, washable clogs everyone wears cost so much and take six weeks to arrive?\n\nThree drops later, the answer is a small range of clogs, slides and loafer mules in a lightweight closed-cell EVA, moulded a few kilometres from where they are worn. Every pair has a removable strap, a contoured footbed and a sole that grips wet tile — and every colourway is named after something we see on the way to the workshop.",
      "width": "wide",
      "background": "none",
      "image": {
        "mediaId": "media-story-workshop",
        "url": "https://images.pexels.com/photos/12368097/pexels-photo-12368097.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "alt": "Finished clogs lined up on a rack in the Marikina workshop"
      },
      "cta": {
        "label": "Shop the range",
        "href": "/shop"
      },
      "showSizeGuide": false
    },
    {
      "id": "about-values",
      "type": "value_props",
      "visible": true,
      "anchor": "",
      "eyebrow": "What we stand for",
      "title": "Three promises",
      "items": [
        {
          "icon": "heart",
          "title": "Made in the Philippines",
          "body": "Every pair is moulded and finished by our partner workshop in Marikina. We visit weekly and pay on delivery, not on net-90 terms."
        },
        {
          "icon": "shield-check",
          "title": "Washable & waterproof",
          "body": "Closed-cell EVA does not absorb water or odour. Soap, water and a soft brush bring any pair back to new."
        },
        {
          "icon": "refresh-cw",
          "title": "14-day exchanges",
          "body": "Fourteen days to exchange any unworn pair for another size or colour. We book and cover the courier pickup."
        }
      ],
      "columns": 3,
      "bordered": true
    },
    {
      "id": "about-size-guide",
      "type": "rich_text",
      "visible": true,
      "anchor": "size-guide",
      "eyebrow": "Help",
      "title": "Finding your size",
      "description": "All styles use US unisex sizes 5–12. Kids styles use the low end of the same run (5–8) as a kids run.",
      "body": "Stand on a sheet of paper with your heel against a wall and mark the tip of your longest toe. Measure heel to mark in centimetres, do the same for the other foot, and use the longer measurement with the chart below.\n\nClogs have a roomy toe box and **run true to size**. If you plan to wear them with socks, or you are between sizes, size up. Slides run half a size large; size down if between sizes.",
      "width": "narrow",
      "background": "none",
      "image": {
        "mediaId": null,
        "url": "",
        "alt": ""
      },
      "cta": {
        "label": "",
        "href": ""
      },
      "showSizeGuide": true
    },
    {
      "id": "about-shipping",
      "type": "rich_text",
      "visible": true,
      "anchor": "shipping",
      "eyebrow": "Help",
      "title": "Shipping",
      "description": "",
      "body": "Orders over ₱2,500 ship free. Below that a flat ₱150 fee applies. We dispatch within one business day from our Makati studio.\n\nMetro Manila deliveries arrive in 2–3 business days; Luzon in 3–5; Visayas and Mindanao in 5–7. You will receive a tracking number by email once your order ships.\n\nCash on delivery is available nationwide. Online payment via GCash, Maya and cards is coming soon.",
      "width": "narrow",
      "background": "none",
      "image": {
        "mediaId": null,
        "url": "",
        "alt": ""
      },
      "cta": {
        "label": "",
        "href": ""
      },
      "showSizeGuide": false
    },
    {
      "id": "about-returns",
      "type": "rich_text",
      "visible": true,
      "anchor": "returns",
      "eyebrow": "Help",
      "title": "Returns & exchanges",
      "description": "",
      "body": "Not quite right? You have 14 days from delivery to exchange or return any unworn pair in its box. Email us with your order number and we will book a free pickup.\n\nRefunds go back to your original payment method within 5–7 business days of the pair reaching us. Cash-on-delivery orders are refunded via GCash or bank transfer.",
      "width": "narrow",
      "background": "muted",
      "image": {
        "mediaId": null,
        "url": "",
        "alt": ""
      },
      "cta": {
        "label": "",
        "href": ""
      },
      "showSizeGuide": false
    },
    {
      "id": "about-contact",
      "type": "contact",
      "visible": true,
      "anchor": "contact",
      "title": "Talk to us",
      "body": "Questions about an order, a size or a strap swap? We reply within one business day.",
      "email": "hello@urbananomaly.demo",
      "phone": "+63 917 123 0000",
      "address": "Legazpi Village, Makati City"
    }
  ]
}
$json$::jsonb as c) seed;

insert into public.cms_documents (key, kind, title, draft, published, draft_version, published_version, updated_by_name, published_at)
select 'global:navigation', 'navigation', 'Navigation', c, c, 1, 1, 'Store Admin', now()
from (select $json$
{
  "primaryLinks": [
    {
      "id": "nav-home",
      "label": "Home",
      "href": "/"
    },
    {
      "id": "nav-shop",
      "label": "Shop",
      "href": "/shop"
    }
  ],
  "secondaryLinks": [
    {
      "id": "nav-about",
      "label": "About",
      "href": "/about"
    }
  ],
  "showCollectionsMenu": true,
  "showCategoryColumn": true,
  "footerColumns": [
    {
      "id": "footer-help",
      "title": "Help",
      "links": [
        {
          "id": "f-shipping",
          "label": "Shipping & Returns",
          "href": "/about#shipping"
        },
        {
          "id": "f-size",
          "label": "Size Guide",
          "href": "/about#size-guide"
        },
        {
          "id": "f-track",
          "label": "Track order",
          "href": "/track"
        },
        {
          "id": "f-contact",
          "label": "Contact",
          "href": "/about#contact"
        }
      ]
    },
    {
      "id": "footer-company",
      "title": "Company",
      "links": [
        {
          "id": "f-about",
          "label": "About",
          "href": "/about"
        },
        {
          "id": "f-careers",
          "label": "Careers",
          "href": "/about#contact"
        }
      ]
    }
  ],
  "newsletterTitle": "Newsletter",
  "newsletterBody": "New drops and restocks, once a month. (Demo: signup is not connected.)",
  "paymentLine": "COD · GCash · Cards via PayMongo (coming soon)",
  "legalLine": "All rights reserved."
}
$json$::jsonb as c) seed;

insert into public.cms_documents (key, kind, title, draft, published, draft_version, published_version, updated_by_name, published_at)
select 'global:announcement', 'announcement', 'Announcement bar', c, c, 1, 1, 'Store Admin', now()
from (select $json$
{
  "text": "Free shipping over ₱2,500 · COD nationwide · New drop every month",
  "href": "",
  "visible": true
}
$json$::jsonb as c) seed;

insert into public.cms_documents (key, kind, title, draft, published, draft_version, published_version, updated_by_name, published_at)
select 'global:theme', 'theme', 'Theme', c, c, 1, 1, 'Store Admin', now()
from (select $json$
{
  "season": "default",
  "colors": {
    "primary": "#5c7454",
    "primaryForeground": "#ffffff",
    "background": "#ffffff",
    "foreground": "#0f120e",
    "muted": "#f1f3ef",
    "mutedForeground": "#5a6356",
    "border": "#dde2d8"
  },
  "fontFamily": "Inter",
  "radius": "md",
  "buttonStyle": "rounded",
  "sectionSpacing": "default"
}
$json$::jsonb as c) seed;

insert into public.cms_media (id, bucket, path, url, alt, mime, size_bytes, width, height, uploaded_by_name, created_at)
select x.id, x.bucket, x.path, x.url, x.alt, x.mime, x."sizeBytes", x.width, x.height, x."uploadedBy", x."createdAt"
from jsonb_to_recordset($media$
[
  {
    "id": "media-hero-lava",
    "bucket": "cms-media",
    "path": "seed/hero-lava.jpg",
    "url": "https://images.pexels.com/photos/12368079/pexels-photo-12368079.jpeg?auto=compress&cs=tinysrgb&w=1800",
    "alt": "Pair of EVA clogs resting on a concrete step",
    "mime": "image/jpeg",
    "sizeBytes": 412000,
    "width": 1800,
    "height": 1200,
    "uploadedBy": "Store Admin",
    "createdAt": "2026-09-01T08:00:00.000Z"
  },
  {
    "id": "media-hero-ice",
    "bucket": "cms-media",
    "path": "seed/hero-ice.jpg",
    "url": "https://images.pexels.com/photos/13698233/pexels-photo-13698233.jpeg?auto=compress&cs=tinysrgb&w=1800",
    "alt": "Cushioned slides beside a swimming pool",
    "mime": "image/jpeg",
    "sizeBytes": 388000,
    "width": 1800,
    "height": 1200,
    "uploadedBy": "Store Admin",
    "createdAt": "2026-09-01T08:05:00.000Z"
  },
  {
    "id": "media-hero-street",
    "bucket": "cms-media",
    "path": "seed/hero-street.jpg",
    "url": "https://images.pexels.com/photos/18188523/pexels-photo-18188523.jpeg?auto=compress&cs=tinysrgb&w=1800",
    "alt": "Matte clogs worn on a Manila sidewalk",
    "mime": "image/jpeg",
    "sizeBytes": 401000,
    "width": 1800,
    "height": 1200,
    "uploadedBy": "Store Admin",
    "createdAt": "2026-09-01T08:10:00.000Z"
  },
  {
    "id": "media-promo-slide",
    "bucket": "cms-media",
    "path": "seed/promo-slide.jpg",
    "url": "https://images.pexels.com/photos/13698233/pexels-photo-13698233.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "alt": "Two-strap slide on a wet boat deck",
    "mime": "image/jpeg",
    "sizeBytes": 268000,
    "width": 1200,
    "height": 1500,
    "uploadedBy": "Store Admin",
    "createdAt": "2026-09-02T09:00:00.000Z"
  },
  {
    "id": "media-story-workshop",
    "bucket": "cms-media",
    "path": "seed/story-workshop.jpg",
    "url": "https://images.pexels.com/photos/12368097/pexels-photo-12368097.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "alt": "Finished clogs lined up on a rack in the Marikina workshop",
    "mime": "image/jpeg",
    "sizeBytes": 301000,
    "width": 1200,
    "height": 1500,
    "uploadedBy": "Store Admin",
    "createdAt": "2026-09-02T09:05:00.000Z"
  }
]
$media$::jsonb) as x(
  id text, bucket text, path text, url text, alt text, mime text,
  "sizeBytes" integer, width integer, height integer, "uploadedBy" text, "createdAt" timestamptz
);
