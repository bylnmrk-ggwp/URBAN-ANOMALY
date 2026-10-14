import type {
  AuditEntry,
  CmsDocument,
  ContentFor,
  DocumentKey,
  DocumentKind,
  DocumentSummary,
  Revision,
} from '@/features/cms/domain/documents'
import { pageSlugSchema, parseContent, RESERVED_PAGE_SLUGS } from '@/features/cms/domain/documents'
import type { CmsRepository, PublishedDocument } from '@/features/cms/domain/repository'
import type { PageContent } from '@/features/cms/domain/sections'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import {
  cmsDocumentJsonSchema,
  cmsDocumentRowToJson,
  parseRpcJson,
  toAuditEntry,
  toCmsDocument,
  toDocumentSummary,
  toRevision,
  unwrap,
} from '@/lib/supabase/mappers'
import type { ISODateString } from '@/types/common'

/** Content objects are plain JSON by construction (Zod-validated); PostgREST wants `Json`. */
function asJson(value: unknown): Json {
  return value as Json
}

/**
 * Storefront reads go through the `cms_published_documents` view (anon-readable, published
 * JSON only). Admin reads use the RLS-protected tables; every write is a SECURITY DEFINER RPC.
 */
export class SupabaseCmsRepository implements CmsRepository {
  private readonly warnedKeys = new Set<string>()

  private get db() {
    return getSupabaseClient()
  }

  // ---------------------------------------------------------------------------
  // Public (storefront)
  // ---------------------------------------------------------------------------

  async getPublished<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
  ): Promise<PublishedDocument<K> | null> {
    const row = unwrap(
      await this.db
        .from('cms_published_documents')
        .select('key, kind, published, published_version')
        .eq('key', key)
        .eq('kind', kind)
        .maybeSingle(),
    )
    if (!row) return null

    const content = parseContent(kind, row.published)
    if (!content) {
      // Stored JSON no longer matches the schema (e.g. after a schema change). Callers fall
      // back to defaults; warn once per key so the console is not flooded on every render.
      if (!this.warnedKeys.has(key)) {
        this.warnedKeys.add(key)
        console.warn(`[cms] Published content for ${key} is invalid; showing defaults.`)
      }
      return null
    }
    return { key, kind, content, publishedVersion: row.published_version ?? 0 }
  }

  async listPublishedPageSlugs(): Promise<string[]> {
    const rows = unwrap(
      await this.db.from('cms_published_documents').select('key').eq('kind', 'page'),
    )
    return rows
      .map((r) => r.key ?? '')
      .filter((k) => k.startsWith('page:'))
      .map((k) => k.slice('page:'.length))
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listDocuments(): Promise<DocumentSummary[]> {
    const rows = unwrap(
      await this.db.from('cms_documents').select('*').order('kind').order('title'),
    )
    return rows.map(toDocumentSummary)
  }

  async getDocument<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
  ): Promise<CmsDocument<K> | null> {
    const row = unwrap(
      await this.db.from('cms_documents').select('*').eq('key', key).eq('kind', kind).maybeSingle(),
    )
    return row ? toCmsDocument(kind, cmsDocumentRowToJson(row)) : null
  }

  async saveDraft<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    content: ContentFor<K>,
    expectedVersion: number,
  ): Promise<CmsDocument<K>> {
    const data = unwrap(
      await this.db.rpc('cms_save_draft', {
        p_key: key,
        p_content: asJson(content),
        p_expected_version: expectedVersion,
      }),
    )
    return toCmsDocument(kind, parseRpcJson(cmsDocumentJsonSchema, data, 'cms_save_draft'))
  }

  async publish<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    note: string,
  ): Promise<CmsDocument<K>> {
    const data = unwrap(await this.db.rpc('cms_publish', { p_key: key, p_note: note }))
    return toCmsDocument(kind, parseRpcJson(cmsDocumentJsonSchema, data, 'cms_publish'))
  }

  async schedulePublish<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    at: ISODateString,
  ): Promise<CmsDocument<K>> {
    const data = unwrap(await this.db.rpc('cms_schedule_publish', { p_key: key, p_at: at }))
    return toCmsDocument(kind, parseRpcJson(cmsDocumentJsonSchema, data, 'cms_schedule_publish'))
  }

  async cancelSchedule<K extends DocumentKind>(kind: K, key: DocumentKey): Promise<CmsDocument<K>> {
    const data = unwrap(await this.db.rpc('cms_cancel_schedule', { p_key: key }))
    return toCmsDocument(kind, parseRpcJson(cmsDocumentJsonSchema, data, 'cms_cancel_schedule'))
  }

  async listRevisions(key: DocumentKey): Promise<Revision[]> {
    const documentId = await this.documentId(key)
    const rows = unwrap(
      await this.db
        .from('cms_revisions')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false }),
    )
    return rows.map((row) => toRevision(row, key))
  }

  async getRevisionContent<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<ContentFor<K>> {
    const documentId = await this.documentId(key)
    const row = unwrap(
      await this.db
        .from('cms_revisions')
        .select('content')
        .eq('document_id', documentId)
        .eq('version', version)
        .maybeSingle(),
    )
    if (!row) throw AppError.notFound(`Revision v${version} of ${key}`)
    const content = parseContent(kind, row.content)
    if (!content) {
      throw new AppError(
        'unknown',
        `Revision v${version} of ${key} no longer matches the ${kind} schema.`,
      )
    }
    return content
  }

  async restoreRevision<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<CmsDocument<K>> {
    const data = unwrap(
      await this.db.rpc('cms_restore_revision', { p_key: key, p_version: version }),
    )
    return toCmsDocument(kind, parseRpcJson(cmsDocumentJsonSchema, data, 'cms_restore_revision'))
  }

  async createPage(slug: string, title: string): Promise<CmsDocument<'page'>> {
    // The RPC re-validates; checking here gives the form a precise message without a round trip.
    const parsedSlug = pageSlugSchema.safeParse(slug)
    if (!parsedSlug.success) {
      throw new AppError('validation', parsedSlug.error.issues[0]?.message ?? 'Invalid slug.')
    }
    if (RESERVED_PAGE_SLUGS.has(parsedSlug.data)) {
      throw new AppError('validation', `The slug "${parsedSlug.data}" is reserved.`)
    }
    const cleanTitle = title.trim()
    if (!cleanTitle) throw new AppError('validation', 'Enter a page title.')

    const content: PageContent = {
      title: cleanTitle.slice(0, 120),
      seoTitle: cleanTitle.slice(0, 70),
      seoDescription: '',
      sections: [],
    }
    const data = unwrap(
      await this.db.rpc('cms_create_page', {
        p_slug: parsedSlug.data,
        p_title: cleanTitle,
        p_content: asJson(content),
      }),
    )
    return toCmsDocument('page', parseRpcJson(cmsDocumentJsonSchema, data, 'cms_create_page'))
  }

  async deletePage(slug: string): Promise<void> {
    unwrap(await this.db.rpc('cms_delete_page', { p_slug: slug }))
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)))
    const rows = unwrap(
      await this.db
        .from('cms_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(safeLimit),
    )
    return rows.map(toAuditEntry)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async documentId(key: DocumentKey): Promise<string> {
    const row = unwrap(
      await this.db.from('cms_documents').select('id').eq('key', key).maybeSingle(),
    )
    if (!row) throw AppError.notFound(`Document ${key}`)
    return row.id
  }
}
