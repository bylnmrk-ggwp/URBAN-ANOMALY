import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  mapSupabaseError,
  parseRpcJson,
  reviewJsonSchema,
  reviewSummaryJsonSchema,
  toReview,
  toReviewSummary,
  unwrap,
} from '@/lib/supabase/mappers'

import type {
  AdminReviewFilters,
  Review,
  ReviewInput,
  ReviewRepository,
  ReviewStatus,
  ReviewSummary,
} from '../domain/entities'
import { REVIEW_MAX_PHOTOS, reviewFormSchema } from '../domain/entities'
import {
  REVIEW_PHOTO_BUCKET,
  isOwnReviewPhotoUrl,
  reviewPhotoPath,
  reviewPhotoStoragePath,
  validateReviewPhoto,
} from './reviewPhotos'

/** PostgREST `or()` filters are comma/parenthesis delimited; strip them from user input. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()]/g, ' ').trim()
}

interface UploadedPhotos {
  urls: string[]
  paths: string[]
}

/**
 * Reads go through the `review_rows` view (reviews + product name/slug) under RLS: approved
 * rows are public, authors see their own, admins see everything. Every write is an RPC from
 * `0006_features_round2.sql`; `submit_review` decides the verified badge and the one-review-
 * per-product rule server-side. Photos are uploaded to the public `review-photos` bucket
 * first and removed again when the row cannot be created.
 */
export class SupabaseReviewRepository implements ReviewRepository {
  private get db() {
    return getSupabaseClient()
  }

  async listForProduct(productId: string): Promise<Review[]> {
    const result = await this.db
      .from('review_rows')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    return unwrap(result).map(toReview)
  }

  async getSummary(productId: string): Promise<ReviewSummary> {
    const data = unwrap(await this.db.rpc('review_summary', { p_product_id: productId }))
    return toReviewSummary(parseRpcJson(reviewSummaryJsonSchema, data, 'review_summary'))
  }

  async submit(input: ReviewInput): Promise<Review> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw AppError.unauthorized('Sign in to write a review.')

    const parsed = reviewFormSchema.safeParse({
      rating: input.rating,
      title: input.title,
      body: input.body,
    })
    if (!parsed.success) {
      throw new AppError('validation', parsed.error.issues[0]?.message ?? 'Check your review.')
    }
    if (input.photos.length > REVIEW_MAX_PHOTOS) {
      throw new AppError('validation', `You can attach up to ${REVIEW_MAX_PHOTOS} photos.`)
    }
    for (const photo of input.photos) {
      const problem = validateReviewPhoto(photo)
      if (problem) throw new AppError('validation', problem)
    }

    const userId = auth.user.id
    const uploaded = await this.uploadPhotos(userId, input.photos)
    // submit_review stores only the caller's own uploads (is_own_review_photo_url). Applying
    // the same rule here turns a mis-configured storage URL into a clear error before the
    // round-trip, with the uploads cleaned up.
    if (!uploaded.urls.every((url) => isOwnReviewPhotoUrl(url, userId))) {
      await this.removeObjects(uploaded.paths)
      throw new AppError('validation', 'Photos must be uploaded to your own review folder first.')
    }
    const result = await this.db.rpc('submit_review', {
      p_product_id: input.productId,
      p_rating: parsed.data.rating,
      p_title: parsed.data.title,
      p_body: parsed.data.body,
      p_photo_urls: uploaded.urls,
    })
    if (result.error) {
      // Do not leave orphan objects behind when the review could not be created.
      await this.removeObjects(uploaded.paths)
      throw mapSupabaseError(result.error)
    }
    return toReview(parseRpcJson(reviewJsonSchema, result.data, 'submit_review'))
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listAdmin(filters: AdminReviewFilters): Promise<Review[]> {
    let query = this.db.from('review_rows').select('*')
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.search) {
      const term = sanitizeSearch(filters.search)
      if (term) {
        query = query.or(
          `product_name.ilike.%${term}%,author_name.ilike.%${term}%,title.ilike.%${term}%,body.ilike.%${term}%`,
        )
      }
    }
    query = query.order('created_at', { ascending: false })
    return unwrap(await query).map(toReview)
  }

  async setStatus(id: string, status: ReviewStatus): Promise<Review> {
    const data = unwrap(await this.db.rpc('set_review_status', { p_id: id, p_status: status }))
    return toReview(parseRpcJson(reviewJsonSchema, data, 'set_review_status'))
  }

  async remove(id: string): Promise<void> {
    // The RPC deletes the row and hands back the photo URLs under the author's own folder so
    // the objects can go too; reviewPhotoStoragePath keeps only `reviews/<folder>/<file>` paths.
    const urls = unwrap(await this.db.rpc('delete_review', { p_id: id }))
    const paths = urls.map(reviewPhotoStoragePath).filter((path): path is string => path !== null)
    await this.removeObjects(paths)
  }

  // ---------------------------------------------------------------------------

  private async uploadPhotos(userId: string, photos: File[]): Promise<UploadedPhotos> {
    const bucket = this.db.storage.from(REVIEW_PHOTO_BUCKET)
    const uploaded: UploadedPhotos = { urls: [], paths: [] }
    for (const photo of photos) {
      const path = reviewPhotoPath(userId, photo)
      const result = await bucket.upload(path, photo, {
        contentType: photo.type,
        cacheControl: '31536000',
        upsert: false,
      })
      if (result.error) {
        await this.removeObjects(uploaded.paths)
        throw mapSupabaseError(result.error)
      }
      uploaded.paths.push(path)
      uploaded.urls.push(bucket.getPublicUrl(path).data.publicUrl)
    }
    return uploaded
  }

  /** Best effort: the review row is the source of truth; a leftover object is logged, not surfaced. */
  private async removeObjects(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const removed = await this.db.storage.from(REVIEW_PHOTO_BUCKET).remove(paths)
    if (removed.error) {
      console.warn(`[reviews] Could not remove ${paths.length} photo(s): ${removed.error.message}`)
    }
  }
}
