import { describe, expect, it } from 'vitest'

import {
  REVIEW_PHOTO_MAX_BYTES,
  isOwnReviewPhotoUrl,
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

  it('only yields paths of the form reviews/<folder>/<file>', () => {
    expect(reviewPhotoStoragePath(`${base}reviews/u1`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/u1/`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/u1/sub/x.jpg`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}other/u1/x.jpg`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/../x.jpg`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/u1/..`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/u1/%2E%2E`)).toBeNull()
    expect(reviewPhotoStoragePath(`${base}reviews/u1/%ZZ`)).toBeNull()
  })
})

describe('isOwnReviewPhotoUrl', () => {
  const user = '0b4c6d8e-1111-4222-8333-444455556666'
  const own = `https://abc.supabase.co/storage/v1/object/public/review-photos/reviews/${user}/photo.jpg`

  it('accepts the public URL of an object in the caller folder (the submit_review rule)', () => {
    expect(isOwnReviewPhotoUrl(own, user)).toBe(true)
    expect(
      isOwnReviewPhotoUrl(
        `https://my-project-1.supabase.co/storage/v1/object/public/review-photos/reviews/${user}/a-b.webp`,
        user,
      ),
    ).toBe(true)
  })

  it('refuses other users, hosts, schemes, buckets, nested paths and query strings', () => {
    expect(isOwnReviewPhotoUrl(own, 'someone-else')).toBe(false)
    expect(isOwnReviewPhotoUrl(own, '')).toBe(false)
    expect(isOwnReviewPhotoUrl(own.replace('abc.supabase.co', 'evil.example.com'), user)).toBe(
      false,
    )
    expect(
      isOwnReviewPhotoUrl(own.replace('abc.supabase.co', 'abc.supabase.co.evil.com'), user),
    ).toBe(false)
    expect(isOwnReviewPhotoUrl(own.replace('https://', 'http://'), user)).toBe(false)
    expect(isOwnReviewPhotoUrl(own.replace('review-photos', 'cms-media'), user)).toBe(false)
    expect(isOwnReviewPhotoUrl(own.replace('photo.jpg', 'sub/photo.jpg'), user)).toBe(false)
    expect(isOwnReviewPhotoUrl(`${own}?download=1`, user)).toBe(false)
    expect(isOwnReviewPhotoUrl(`${own}#x`, user)).toBe(false)
    expect(isOwnReviewPhotoUrl(own.replace('photo.jpg', ''), user)).toBe(false)
    expect(isOwnReviewPhotoUrl('blob:mock/rev-1', user)).toBe(false)
  })

  it('matches the user id literally, not as a pattern', () => {
    expect(isOwnReviewPhotoUrl(own, user.replace('0b4c', '0b.c'))).toBe(false)
  })
})
