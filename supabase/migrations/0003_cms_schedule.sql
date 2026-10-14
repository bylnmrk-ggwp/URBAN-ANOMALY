-- =============================================================================
-- 0003_cms_schedule.sql — scheduled publishing for CMS documents
--
-- Contract: CmsRepository.schedulePublish / cancelSchedule (src/features/cms/domain/repository.ts),
-- SupabaseCmsRepository, mappers.ts (cmsDocumentJsonSchema.scheduled_at).
--
-- Conventions (same as 0002_cms.sql): admin-only SECURITY DEFINER RPCs, custom SQLSTATE
-- codes VA001 validation / NF001 not_found / CF001 conflict / FB001 forbidden.
--
-- Scheduling only stores a timestamp. Something must call cms_run_scheduled() regularly:
--   * pg_cron:  select cron.schedule('cms-scheduled', '* * * * *', $$select public.cms_run_scheduled()$$);
--   * or an Edge Function on a schedule that runs `select public.cms_run_scheduled()` with the
--     service role.
-- See docs/supabase.md section 10.
-- =============================================================================

alter table public.cms_documents add column if not exists scheduled_at timestamptz;

create index if not exists cms_documents_scheduled_at_idx
  on public.cms_documents (scheduled_at) where scheduled_at is not null;

-- cms_document_json now carries scheduled_at (mappers.ts treats it as optional for 0002 databases).
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
    'published_at', d.published_at,
    'scheduled_at', d.scheduled_at
  )
  from public.cms_documents d where d.id = p_id;
$$;

-- -----------------------------------------------------------------------------
-- cms_publish_internal(p_key, p_note, p_actor_name) -> document json
-- The publish step without the admin check, so the interactive RPC and the
-- scheduler share one implementation. Not granted to any role.
-- -----------------------------------------------------------------------------
create or replace function public.cms_publish_internal(p_key text, p_note text, p_actor_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
  v_note text := coalesce(trim(p_note), '');
begin
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
         scheduled_at = null,
         updated_by = auth.uid(),
         updated_by_name = p_actor_name
   where id = d.id;

  -- Re-publishing replaces the snapshot for that version (unique per document).
  delete from public.cms_revisions where document_id = d.id and version = d.draft_version;
  insert into public.cms_revisions (document_id, version, content, note, created_by, created_by_name)
  values (d.id, d.draft_version, d.draft, v_note, auth.uid(), p_actor_name);

  insert into public.cms_audit_log (actor, actor_name, action, document_key, media_id, details)
  values (auth.uid(), p_actor_name, 'publish', d.key, null,
    'Published v' || d.draft_version || case when v_note = '' then '' else ': ' || v_note end);
  return public.cms_document_json(d.id);
end $$;

-- cms_publish keeps its signature; it now delegates to the internal step.
create or replace function public.cms_publish(p_key text, p_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  return public.cms_publish_internal(p_key, p_note, public.cms_actor_name());
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_schedule_publish(p_key, p_at) -> document json
-- Requires unpublished changes and a future time. Replaces an earlier schedule.
-- -----------------------------------------------------------------------------
create or replace function public.cms_schedule_publish(p_key text, p_at timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;
  if p_at is null then
    raise exception 'Enter a valid date and time.' using errcode = 'VA001';
  end if;
  if p_at <= now() then
    raise exception 'Pick a time in the future.' using errcode = 'VA001';
  end if;

  select * into d from public.cms_documents where key = p_key for update;
  if not found then
    raise exception 'Document % not found.', p_key using errcode = 'NF001';
  end if;
  if d.published_version = d.draft_version then
    raise exception 'There are no unpublished changes to schedule.' using errcode = 'VA001';
  end if;

  update public.cms_documents
     set scheduled_at = p_at,
         updated_by = auth.uid(),
         updated_by_name = public.cms_actor_name()
   where id = d.id;

  perform public.cms_audit('save_draft', d.key, null, 'Scheduled publish for ' || p_at::text);
  return public.cms_document_json(d.id);
end $$;

-- -----------------------------------------------------------------------------
-- RPC: cms_cancel_schedule(p_key) -> document json
-- -----------------------------------------------------------------------------
create or replace function public.cms_cancel_schedule(p_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.cms_documents%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = 'FB001';
  end if;

  select * into d from public.cms_documents where key = p_key for update;
  if not found then
    raise exception 'Document % not found.', p_key using errcode = 'NF001';
  end if;

  if d.scheduled_at is not null then
    update public.cms_documents
       set scheduled_at = null,
           updated_by = auth.uid(),
           updated_by_name = public.cms_actor_name()
     where id = d.id;
    perform public.cms_audit('save_draft', d.key, null, 'Cancelled scheduled publish');
  end if;
  return public.cms_document_json(d.id);
end $$;

-- -----------------------------------------------------------------------------
-- cms_run_scheduled() -> integer (number of documents published)
-- Publishes every document whose scheduled_at has passed. Called by pg_cron or
-- an Edge Function with the service role; not exposed to authenticated users.
-- Rows whose draft was already published only get their schedule cleared.
-- -----------------------------------------------------------------------------
create or replace function public.cms_run_scheduled()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select key, draft_version, published_version
      from public.cms_documents
     where scheduled_at is not null and scheduled_at <= now()
     order by scheduled_at
  loop
    if r.draft_version = r.published_version then
      update public.cms_documents set scheduled_at = null where key = r.key;
    else
      perform public.cms_publish_internal(r.key, 'Scheduled publish', 'system');
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.cms_publish_internal(text, text, text) from public;
revoke all on function public.cms_schedule_publish(text, timestamptz) from public;
revoke all on function public.cms_cancel_schedule(text) from public;
revoke all on function public.cms_run_scheduled() from public;

grant execute on function public.cms_schedule_publish(text, timestamptz) to authenticated;
grant execute on function public.cms_cancel_schedule(text) to authenticated;
-- cms_run_scheduled is executed by the cron job (postgres / service role), never by clients.
