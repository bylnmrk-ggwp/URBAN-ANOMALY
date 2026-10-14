import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { clone, matchesSearch, nowIso } from '@/mocks/helpers'

import type { AuditEntry, DocumentKey } from '../domain/documents'
import type { MediaAsset, MediaFilters, MediaUploadInput } from '../domain/media'
import { MEDIA_BUCKET, validateMediaFile } from '../domain/media'
import type { MediaRepository } from '../domain/repository'

/** Session-only object URL for an uploaded file; jsdom has no createObjectURL. */
function objectUrl(file: File, id: string): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file)
  }
  return `blob:mock/${id}`
}

export class MockMediaRepository implements MediaRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async list(filters: MediaFilters): Promise<MediaAsset[]> {
    await this.store.delay()
    this.requireAdmin()
    return this.store.cmsMedia
      .filter((asset) => matchesSearch(filters.search, asset.alt, asset.path))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((asset) => clone(asset))
  }

  async upload(input: MediaUploadInput): Promise<MediaAsset> {
    await this.store.delay()
    const actor = this.requireAdmin()
    const problem = validateMediaFile(input.file)
    if (problem) throw new AppError('validation', problem)
    const id = this.store.nextId('media')
    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()
    const asset: MediaAsset = {
      id,
      bucket: MEDIA_BUCKET,
      path: `uploads/${id}-${safeName}`,
      url: objectUrl(input.file, id),
      alt: input.alt.trim(),
      mime: input.file.type,
      sizeBytes: input.file.size,
      width: input.width,
      height: input.height,
      uploadedBy: actor,
      createdAt: nowIso(),
    }
    this.store.cmsMedia.unshift(asset)
    this.audit(actor, 'media_upload', `Uploaded ${asset.path}`)
    return clone(asset)
  }

  async updateAlt(id: string, alt: string): Promise<MediaAsset> {
    await this.store.delay()
    this.requireAdmin()
    const asset = this.store.cmsMedia.find((a) => a.id === id)
    if (!asset) throw AppError.notFound('Image')
    asset.alt = alt.trim()
    return clone(asset)
  }

  async usages(id: string): Promise<DocumentKey[]> {
    await this.store.delay()
    this.requireAdmin()
    return this.findUsages(id)
  }

  async remove(id: string): Promise<void> {
    await this.store.delay()
    const actor = this.requireAdmin()
    const asset = this.store.cmsMedia.find((a) => a.id === id)
    if (!asset) throw AppError.notFound('Image')
    const used = this.findUsages(id)
    if (used.length > 0) {
      throw new AppError('conflict', `This image is used by: ${used.join(', ')}`)
    }
    this.store.cmsMedia = this.store.cmsMedia.filter((a) => a.id !== id)
    if (asset.url.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(asset.url)
    }
    this.audit(actor, 'media_delete', `Deleted ${asset.path}`)
  }

  /** Documents whose draft or published JSON references the asset by `mediaId`. */
  private findUsages(id: string): DocumentKey[] {
    const needle = `"mediaId":${JSON.stringify(id)}`
    const keys: DocumentKey[] = []
    for (const row of this.store.cmsDocuments.values()) {
      const haystack = JSON.stringify(row.draft) + JSON.stringify(row.published)
      if (haystack.includes(needle)) keys.push(row.key)
    }
    return keys
  }

  private requireAdmin(): string {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    if (session.user.role !== 'admin') throw AppError.forbidden()
    return session.user.fullName
  }

  private audit(actor: string, action: AuditEntry['action'], details: string) {
    this.store.cmsAudit.unshift({
      id: this.store.nextId('audit'),
      actor,
      action,
      documentKey: null,
      details,
      createdAt: nowIso(),
    })
  }
}
