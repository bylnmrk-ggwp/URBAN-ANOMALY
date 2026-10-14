import type { DocumentKey } from '@/features/cms/domain/documents'
import { parseDocumentKey } from '@/features/cms/domain/documents'
import type { MediaAsset, MediaFilters, MediaUploadInput } from '@/features/cms/domain/media'
import { MEDIA_BUCKET, validateMediaFile } from '@/features/cms/domain/media'
import type { MediaRepository } from '@/features/cms/domain/repository'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  cmsMediaJsonSchema,
  mapSupabaseError,
  parseRpcJson,
  toMediaAsset,
  unwrap,
} from '@/lib/supabase/mappers'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function extensionFor(file: File): string {
  const fromMime = EXTENSION_BY_MIME[file.type]
  if (fromMime) return fromMime
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : 'bin'
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** PostgREST `or()` filters are comma/parenthesis delimited; strip them from user input. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()]/g, ' ').trim()
}

/**
 * Objects live in the public `cms-media` bucket (admin-write via storage policies); the
 * `cms_media` table is the library index and is written only through RPCs.
 * Upload path convention: `uploads/<yyyy>/<uuid>.<ext>`.
 */
export class SupabaseMediaRepository implements MediaRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(filters: MediaFilters): Promise<MediaAsset[]> {
    let query = this.db.from('cms_media').select('*').order('created_at', { ascending: false })
    const search = sanitizeSearch(filters.search ?? '')
    if (search) {
      query = query.or(`alt.ilike.%${search}%,path.ilike.%${search}%`)
    }
    return unwrap(await query).map(toMediaAsset)
  }

  async upload(input: MediaUploadInput): Promise<MediaAsset> {
    const problem = validateMediaFile(input.file)
    if (problem) throw new AppError('validation', problem)

    const path = `uploads/${new Date().getUTCFullYear()}/${randomId()}.${extensionFor(input.file)}`
    const bucket = this.db.storage.from(MEDIA_BUCKET)

    const uploaded = await bucket.upload(path, input.file, {
      contentType: input.file.type,
      cacheControl: '31536000',
      upsert: false,
    })
    if (uploaded.error) throw mapSupabaseError(uploaded.error)

    const { publicUrl } = bucket.getPublicUrl(path).data

    const registered = await this.db.rpc('cms_register_media', {
      p_path: path,
      p_url: publicUrl,
      p_alt: input.alt,
      p_mime: input.file.type,
      p_size: input.file.size,
      p_width: input.width,
      p_height: input.height,
    })
    if (registered.error) {
      // Do not leave an orphan object behind when the library row could not be created.
      await bucket.remove([path])
      throw mapSupabaseError(registered.error)
    }
    return toMediaAsset(parseRpcJson(cmsMediaJsonSchema, registered.data, 'cms_register_media'))
  }

  async updateAlt(id: string, alt: string): Promise<MediaAsset> {
    const data = unwrap(await this.db.rpc('cms_update_media_alt', { p_id: id, p_alt: alt }))
    return toMediaAsset(parseRpcJson(cmsMediaJsonSchema, data, 'cms_update_media_alt'))
  }

  async remove(id: string): Promise<void> {
    const row = unwrap(
      await this.db.from('cms_media').select('bucket, path').eq('id', id).maybeSingle(),
    )
    if (!row) throw AppError.notFound('Media asset')

    // The RPC raises CF001 (-> AppError 'conflict') while any document references the asset.
    unwrap(await this.db.rpc('cms_delete_media', { p_id: id }))

    // The library row is gone; a missing object (seeded rows point at external URLs) must
    // not surface as a failure to the admin.
    const removed = await this.db.storage.from(row.bucket).remove([row.path])
    if (removed.error) {
      console.warn(`[cms] Could not remove storage object ${row.path}: ${removed.error.message}`)
    }
  }

  async usages(id: string): Promise<DocumentKey[]> {
    const keys = unwrap(await this.db.rpc('cms_media_usages', { p_id: id }))
    return keys.filter((key): key is DocumentKey => parseDocumentKey(key) !== null)
  }
}
