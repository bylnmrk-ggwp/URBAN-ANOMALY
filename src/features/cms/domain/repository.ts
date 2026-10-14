import type { ISODateString } from '@/types/common'

import type {
  AuditEntry,
  CmsDocument,
  ContentFor,
  DocumentKey,
  DocumentKind,
  DocumentSummary,
  Revision,
} from './documents'
import type { MediaAsset, MediaFilters, MediaUploadInput } from './media'

export interface PublishedDocument<K extends DocumentKind = DocumentKind> {
  key: DocumentKey
  kind: K
  content: ContentFor<K>
  publishedVersion: number
}

export interface CmsRepository {
  // Public (storefront): published content only. Returns null when nothing is published.
  getPublished<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
  ): Promise<PublishedDocument<K> | null>
  /** Published custom pages for route resolution (`/pages/:slug`). */
  listPublishedPageSlugs(): Promise<string[]>

  // Admin
  listDocuments(): Promise<DocumentSummary[]>
  getDocument<K extends DocumentKind>(kind: K, key: DocumentKey): Promise<CmsDocument<K> | null>
  /**
   * Saves a draft. `expectedVersion` is the draft version the editor loaded; a mismatch
   * throws AppError('conflict') and nothing is written.
   */
  saveDraft<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    content: ContentFor<K>,
    expectedVersion: number,
  ): Promise<CmsDocument<K>>
  publish<K extends DocumentKind>(kind: K, key: DocumentKey, note: string): Promise<CmsDocument<K>>
  /**
   * Publishes the current draft automatically at `at`. Requires unpublished changes and a
   * future time, else AppError('validation'). Replaces any earlier schedule.
   */
  schedulePublish<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    at: ISODateString,
  ): Promise<CmsDocument<K>>
  cancelSchedule<K extends DocumentKind>(kind: K, key: DocumentKey): Promise<CmsDocument<K>>
  listRevisions(key: DocumentKey): Promise<Revision[]>
  getRevisionContent<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<ContentFor<K>>
  /** Copies a revision into the draft (does not publish). */
  restoreRevision<K extends DocumentKind>(
    kind: K,
    key: DocumentKey,
    version: number,
  ): Promise<CmsDocument<K>>
  createPage(slug: string, title: string): Promise<CmsDocument<'page'>>
  /** Only custom pages (not home/about) can be deleted. */
  deletePage(slug: string): Promise<void>
  listAudit(limit: number): Promise<AuditEntry[]>
}

export interface MediaRepository {
  list(filters: MediaFilters): Promise<MediaAsset[]>
  upload(input: MediaUploadInput): Promise<MediaAsset>
  updateAlt(id: string, alt: string): Promise<MediaAsset>
  /** Throws AppError('conflict') when any document references the asset. */
  remove(id: string): Promise<void>
  /** Document keys (draft or published) referencing the asset. */
  usages(id: string): Promise<DocumentKey[]>
}
