import { describe, expect, it } from 'vitest'

import {
  REVIEW_PHOTO_MAX_BYTES,
  reviewPhotoPath,
  reviewPhotoStoragePath,
  validateReviewPhoto,
} from './reviewPhotos'

function fileOf(type: string, size = 1024, name = 'photo'): File {
  const file = new File([new Uint8Array(1)], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateReviewPhoto', () => {
  it('accepts the bucket image types under 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']) {
      expect(validateReviewPhoto(fileOf(type))).toBeNull()
    }
    expect(validateReviewPhoto(fileOf('image/png', REVIEW_PHOTO_MAX_BYTES))).toBeNull()
  })

  it('refuses other types and oversized files with a user-facing message', () => {
    expect(validateReviewPhoto(fileOf('image/svg+xml'))).toMatch(/JPEG, PNG, WebP, AVIF or GIF/)
    expect(validateReviewPhoto(fileOf('application/pdf'))).toMatch(/images/)
    expect(validateReviewPhoto(fileOf('image/jpeg', REVIEW_PHOTO_MAX_BYTES + 1))).toMatch(/5 MB/)
  })
})

describe('reviewPhotoPath', () => {
  it('nests objects under the user folder the storage policy checks', () => {
    expect(reviewPhotoPath('user-1', fileOf('image/jpeg'), 'abc')).toBe('reviews/user-1/abc.jpg')
    expect(reviewPhotoPath('user-1', fileOf('image/webp'), 'abc')).toBe('reviews/user-1/abc.webp')
  })

  it('generates a unique id by default', () => {
    const file = fileOf('image/png')
    expect(reviewPhotoPath('u', file)).not.toBe(reviewPhotoPath('u', file))
    expect(reviewPhotoPath('u', file)).toMatch(/^reviews\/u\/[^/]+\.png$/)
  })
})

describe('reviewPhotoStoragePath', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/review-photos/'

  it('extracts the object path from a public bucket URL', () => {
    expect(reviewPhotoStoragePath(`${base}reviews/u1/x.jpg`)).toBe('reviews/u1/x.jpg')
    expect(reviewPhotoStoragePath(`${base}reviews/u1/x.jpg?t=1`)).toBe('reviews/u1/x.jpg')
    expect(reviewPhotoStoragePath(`${base}reviews/u%201/x.jpg`)).toBe('reviews/u 1/x.jpg')
  })

  it('ignores URLs that are not from the review bucket', () => {
    expect(reviewPhotoStoragePath('blob:mock/rev-1')).toBeNull()
    expect(reviewPhotoStoragePath('https://images.pexels.com/photo.jpg')).toBeNull()
    expect(
      reviewPhotoStoragePath('https://abc.supabase.co/storage/v1/object/public/cms-media/a.jpg'),
    ).toBeNull()
    expect(reviewPhotoStoragePath(base)).toBeNull()
  })
})
