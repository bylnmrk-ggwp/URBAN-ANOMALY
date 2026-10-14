import { AppError } from '@/lib/errors'
import type { MockCmsRow, MockStore } from '@/mocks/MockStore'
import { clone, nowIso } from '@/mocks/helpers'

import { BUILT_IN_PAGE_SLUGS } from '../domain/defaults'
import type {
  AuditEntry,
  CmsDocument,
  ContentFor,
  DocumentKey,
  DocumentKind,
  DocumentSummary,
  Revision,
} from '../domain/documents'
import {
  CONTENT_SCHEMAS,
  pageKey,
  pageSlugSchema,
  parseContent,
  RESERVED_PAGE_SLUGS,
} from '../domain/documents'
import type { CmsRepository, PublishedDocument } from '../domain/repository'
import type { PageContent } from '../domain/sections'
import { createSection } from '../domain/sections'

import type { ISODateString } from '@/types/common'

const CONFLICT_MESSAGE = 'Someone else saved this document. Reload to see their changes.'

function toSummary(row: MockCmsRow): DocumentSummary {
  return {
    key: row.key,
    kind: row.kind,
    title: row.title,
    draftVersion: row.draftVersion,
    publishedVersion: row.publishedVersion,
    hasUnpublishedChanges: row.draftVersion !== row.publishedVersion,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    scheduledAt: row.scheduledAt,
  }
}

export class MockCmsRepository implements CmsRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async getPublished<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
  ): Promise<PublishedDocument<K> | null> {
    await this.store.delay()
    this.runDue()
    const row = this.store.cmsDocuments.get(key)
    if (!row || row.kind !== kind || row.published === null) return null
    const content = parseContent(kind, row.published)
    if (!content) return null
    return { key, kind, content: clone(content), publishedVersion: row.publishedVersion }
  }

  async listPublishedPageSlugs(): Promise<string[]> {
    await this.store.delay()
    this.runDue()
    return [...this.store.cmsDocuments.values()]
      .filter((row) => row.kind === 'page' && row.published !== null)
      .map((row) => row.key.slice('page:'.length))
  }

  async listDocuments(): Promise<DocumentSummary[]> {
    await this.store.delay()
    this.runDue()
    this.requireAdmin()
    return [...this.store.cmsDocuments.values()].map(toSummary)
  }

  async getDocument<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
  ): Promise<CmsDocument<K> | null> {
    await this.store.delay()
    this.runDue()
    this.requireAdmin()
    const row = this.store.cmsDocuments.get(key)
    return row && row.kind === kind ? this.toDocument(kind, row) : null
  }

  async saveDraft<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    content: ContentFor<K>,
    expectedVersion: number,
  ): Promise<CmsDocument<K>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const row = this.requireRow(kind, key)
    if (expectedVersion !== row.draftVersion) throw new AppError('conflict', CONFLICT_MESSAGE)
    const parsed = CONTENT_SCHEMAS[kind].safeParse(content)
    if (!parsed.success) {
      throw new AppError('validation', parsed.error.issues[0]?.message ?? 'Invalid content.')
    }
    row.draft = clone(parsed.data)
    row.draftVersion += 1
    row.updatedBy = actor
    row.updatedAt = nowIso()
    this.audit(actor, 'save_draft', key, `Saved draft v${row.draftVersion}`)
    return this.toDocument(kind, row)
  }

  async publish<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    note: string,
  ): Promise<CmsDocument<K>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const row = this.requireRow(kind, key)
    this.publishRow(row, note, actor)
    return this.toDocument(kind, row)
  }

  async schedulePublish<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    at: ISODateString,
  ): Promise<CmsDocument<K>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const row = this.requireRow(kind, key)
    if (row.draftVersion === row.publishedVersion) {
      throw new AppError('validation', 'There are no unpublished changes to schedule.')
    }
    const time = new Date(at).getTime()
    if (!Number.isFinite(time)) throw new AppError('validation', 'Enter a valid date and time.')
    if (time <= Date.now()) throw new AppError('validation', 'Pick a time in the future.')
    row.scheduledAt = new Date(time).toISOString()
    row.updatedBy = actor
    row.updatedAt = nowIso()
    this.audit(actor, 'save_draft', key, `Scheduled publish for ${row.scheduledAt}`)
    return this.toDocument(kind, row)
  }

  async cancelSchedule<K extends DocumentKind>(kind: K, key: DocumentKey): Promise<CmsDocument<K>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const row = this.requireRow(kind, key)
    if (row.scheduledAt !== null) {
      row.scheduledAt = null
      row.updatedBy = actor
      row.updatedAt = nowIso()
      this.audit(actor, 'save_draft', key, 'Cancelled scheduled publish')
    }
    return this.toDocument(kind, row)
  }

  async listRevisions(key: DocumentKey): Promise<Revision[]> {
    await this.store.delay()
    this.runDue()
    this.requireAdmin()
    return this.store.cmsRevisions
      .filter((r) => r.key === key)
      .sort((a, b) => b.version - a.version)
      .map((r) => clone(r))
  }

  async getRevisionContent<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<ContentFor<K>> {
    await this.store.delay()
    this.runDue()
    this.requireAdmin()
    return this.revisionContent(kind, key, version)
  }

  async restoreRevision<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<CmsDocument<K>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const row = this.requireRow(kind, key)
    const content = this.revisionContent(kind, key, version)
    row.draft = clone(content)
    row.draftVersion += 1
    row.updatedBy = actor
    row.updatedAt = nowIso()
    this.audit(actor, 'restore', key, `Restored v${version} into draft v${row.draftVersion}`)
    return this.toDocument(kind, row)
  }

  async createPage(slug: string, title: string): Promise<CmsDocument<'page'>> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    const parsedSlug = pageSlugSchema.safeParse(slug)
    if (!parsedSlug.success) {
      throw new AppError('validation', parsedSlug.error.issues[0]?.message ?? 'Invalid slug.')
    }
    const cleanSlug = parsedSlug.data
    if (
      RESERVED_PAGE_SLUGS.has(cleanSlug) ||
      (BUILT_IN_PAGE_SLUGS as readonly string[]).includes(cleanSlug)
    ) {
      throw new AppError('conflict', `"${cleanSlug}" is reserved. Choose another slug.`)
    }
    const key = pageKey(cleanSlug)
    if (this.store.cmsDocuments.has(key)) {
      throw new AppError('conflict', `A page with the slug "${cleanSlug}" already exists.`)
    }
    const cleanTitle = title.trim() || cleanSlug
    const intro = createSection('rich_text')
    const content: PageContent = {
      title: cleanTitle,
      seoTitle: cleanTitle,
      seoDescription: '',
      sections: [intro.type === 'rich_text' ? { ...intro, title: cleanTitle } : intro],
    }
    const now = nowIso()
    const row: MockCmsRow = {
      key,
      kind: 'page',
      title: cleanTitle,
      draft: content,
      published: null,
      draftVersion: 1,
      publishedVersion: 0,
      updatedBy: actor,
      updatedAt: now,
      publishedAt: null,
      scheduledAt: null,
    }
    this.store.cmsDocuments.set(key, row)
    this.audit(actor, 'create_page', key, `Created page "${cleanTitle}"`)
    return this.toDocument('page', row)
  }

  async deletePage(slug: string): Promise<void> {
    await this.store.delay()
    this.runDue()
    const actor = this.requireAdmin()
    if ((BUILT_IN_PAGE_SLUGS as readonly string[]).includes(slug)) {
      throw AppError.forbidden('Built-in pages cannot be deleted.')
    }
    const key = pageKey(slug)
    const row = this.store.cmsDocuments.get(key)
    if (!row || row.kind !== 'page') throw AppError.notFound('Page')
    this.store.cmsDocuments.delete(key)
    for (const revision of this.store.cmsRevisions.filter((r) => r.key === key)) {
      this.store.cmsRevisionContent.delete(revision.id)
    }
    this.store.cmsRevisions = this.store.cmsRevisions.filter((r) => r.key !== key)
    this.audit(actor, 'delete_page', key, `Deleted page "${row.title}"`)
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    await this.store.delay()
    this.runDue()
    this.requireAdmin()
    return [...this.store.cmsAudit]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((entry) => clone(entry))
  }

  /** Copies the draft to published and snapshots a revision. Shared by publish and the scheduler. */
  private publishRow(row: MockCmsRow, note: string, actor: string) {
    const now = nowIso()
    row.published = clone(row.draft)
    row.publishedVersion = row.draftVersion
    row.publishedAt = now
    row.scheduledAt = null
    row.updatedBy = actor
    row.updatedAt = now

    // Re-publishing an unchanged draft replaces the revision for that version (unique per document).
    const existing = this.store.cmsRevisions.find(
      (r) => r.key === row.key && r.version === row.publishedVersion,
    )
    if (existing) {
      this.store.cmsRevisions = this.store.cmsRevisions.filter((r) => r !== existing)
      this.store.cmsRevisionContent.delete(existing.id)
    }
    const revision: Revision = {
      id: this.store.nextId('rev'),
      key: row.key,
      version: row.publishedVersion,
      note: note.trim(),
      createdBy: actor,
      createdAt: now,
    }
    this.store.cmsRevisions.push(revision)
    this.store.cmsRevisionContent.set(revision.id, clone(row.published))
    this.audit(actor, 'publish', row.key, `Published v${row.publishedVersion}`)
  }

  /**
   * Lazy scheduler: publishes every row whose scheduled time has passed. Called at the start of
   * each repository method so visitors and admins both see due content without a background timer.
   */
  private runDue() {
    const now = Date.now()
    for (const row of this.store.cmsDocuments.values()) {
      if (row.scheduledAt === null) continue
      if (new Date(row.scheduledAt).getTime() > now) continue
      if (row.draftVersion === row.publishedVersion) {
        row.scheduledAt = null
        continue
      }
      this.publishRow(row, 'Scheduled publish', 'system')
    }
  }

  /** Returns the admin's display name, or throws for anonymous and buyer sessions. */
  private requireAdmin(): string {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    if (session.user.role !== 'admin') throw AppError.forbidden()
    return session.user.fullName
  }

  private requireRow(kind: DocumentKind, key: DocumentKey): MockCmsRow {
    const row = this.store.cmsDocuments.get(key)
    if (!row || row.kind !== kind) throw AppError.notFound('Document')
    return row
  }

  private revisionContent<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): ContentFor<K> {
    const revision = this.store.cmsRevisions.find((r) => r.key === key && r.version === version)
    const raw = revision ? this.store.cmsRevisionContent.get(revision.id) : undefined
    const content = raw === undefined ? null : parseContent(kind, raw)
    if (!content) throw AppError.notFound('Revision')
    return clone(content)
  }

  private toDocument<K extends DocumentKind>(kind: K, row: MockCmsRow): CmsDocument<K> {
    const draft = parseContent(kind, row.draft)
    if (!draft) throw new AppError('validation', `Stored draft for ${row.key} is invalid.`)
    const published = row.published === null ? null : parseContent(kind, row.published)
    return {
      key: row.key,
      kind,
      title: row.title,
      draft: clone(draft),
      published: published ? clone(published) : null,
      draftVersion: row.draftVersion,
      publishedVersion: row.publishedVersion,
      hasUnpublishedChanges: row.draftVersion !== row.publishedVersion,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      scheduledAt: row.scheduledAt,
    }
  }

  private audit(actor: string, action: AuditEntry['action'], key: DocumentKey, details: string) {
    this.store.cmsAudit.unshift({
      id: this.store.nextId('audit'),
      actor,
      action,
      documentKey: key,
      details,
      createdAt: nowIso(),
    })
  }
}
