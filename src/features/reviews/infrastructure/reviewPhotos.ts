/**
 * Review photo storage rules. Mirrors the `review-photos` bucket limits declared in
 * `supabase/migrations/0006_features_round2.sql` so a bad file is refused before upload.
 * Path convention: `reviews/<userId>/<uuid>.<ext>` (the storage policy checks the user folder).
 */
export const REVIEW_PHOTO_BUCKET = 'review-photos'
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

/** Returns a user-facing problem, or null when the file can be uploaded. */
export function validateReviewPhoto(file: File): string | null {
  if (!(file.type in EXTENSION_BY_MIME)) {
    return 'Photos must be JPEG, PNG, WebP, AVIF or GIF images.'
  }
  if (file.size > REVIEW_PHOTO_MAX_BYTES) return 'Photos must be 5 MB or smaller.'
  return null
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function reviewPhotoPath(userId: string, file: File, id: string = randomId()): string {
  const extension = EXTENSION_BY_MIME[file.type] ?? 'bin'
  return `reviews/${userId}/${id}.${extension}`
}

/**
 * Storage object path of a public URL from the review bucket, or null for anything else
 * (mock blob URLs, external images), so deletions never touch foreign objects.
 */
export function reviewPhotoStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${REVIEW_PHOTO_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  const path = url.slice(index + marker.length).split(/[?#]/)[0] ?? ''
  if (!path) return null
  try {
    return decodeURIComponent(path)
  } catch {
    return null
  }
}
