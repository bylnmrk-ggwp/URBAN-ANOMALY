import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '@/lib/errors'
import type { TypedSupabaseClient } from '@/lib/supabase/client'

import type { ReviewInput } from '../domain/entities'
import { SupabaseReviewRepository } from './SupabaseReviewRepository'

/**
 * Covers `uploadPhotos`, which fans the review photos out concurrently. The class only
 * reaches the network through `getSupabaseClient`, so a fake client whose `upload` calls
 * are settled by hand is enough to pin the two guarantees the sequential loop used to give
 * for free: the caller's photo order survives out-of-order completion, and a failure
 * removes every object that did succeed - including uploads that were still in flight when
 * the failure arrived.
 */

const USER_ID = '6f1b5b4e-0b0f-4a2a-9c7f-2a1d8b3c4e5f'
const PROJECT = 'https://project-ref.supabase.co'
const PUBLIC_PREFIX = `${PROJECT}/storage/v1/object/public/review-photos/`

interface UploadResponse {
  data: { id: string; path: string; fullPath: string } | null
  error: unknown
}

interface PendingUpload {
  path: string
  succeed: () => void
  fail: (error: unknown) => void
  reject: (reason: unknown) => void
}

let uploads: PendingUpload[]
let removeCalls: string[][]
let rpcCalls: { name: string; args: Record<string, unknown> }[]
let rpcError: unknown

function createFakeClient() {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: USER_ID } }, error: null }),
    },
    storage: {
      from: () => ({
        upload: (path: string) =>
          new Promise<UploadResponse>((resolve, reject) => {
            uploads.push({
              path,
              succeed: () => resolve({ data: { id: path, path, fullPath: path }, error: null }),
              fail: (error) => resolve({ data: null, error }),
              reject,
            })
          }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `${PUBLIC_PREFIX}${path}` } }),
        remove: (paths: string[]) => {
          removeCalls.push(paths)
          return Promise.resolve({ data: [], error: null })
        },
      }),
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      if (rpcError) return Promise.resolve({ data: null, error: rpcError })
      return Promise.resolve({
        data: {
          id: 'review-1',
          product_id: String(args.p_product_id),
          product_name: 'Drift Clog',
          product_slug: 'drift-clog',
          user_id: USER_ID,
          author_name: 'Buyer D.',
          rating: args.p_rating,
          title: args.p_title,
          body: args.p_body,
          // submit_review stores the URLs it is handed, so echoing them back is what the
          // real RPC does and lets the assertions read the order end to end.
          photo_urls: args.p_photo_urls,
          is_verified_purchase: true,
          status: 'approved',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      })
    },
  }
}

let fakeClient = createFakeClient()

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: (): TypedSupabaseClient => fakeClient as unknown as TypedSupabaseClient,
}))

function photo(type: string, name: string) {
  return new File(['x'], name, { type })
}

/** jpeg/png/webp map to distinct extensions, so a path reveals which photo produced it. */
const PHOTOS = [
  photo('image/jpeg', 'first.jpg'),
  photo('image/png', 'second.png'),
  photo('image/webp', 'third.webp'),
]

function input(photos: File[] = PHOTOS): ReviewInput {
  return {
    productId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    rating: 5,
    title: 'Great clogs',
    body: 'Comfortable all day and they wash clean.',
    photos,
  }
}

function extensions(values: string[]) {
  return values.map((value) => value.split('.').pop())
}

/** Waits until every photo has an in-flight upload, proving the fan-out is concurrent. */
async function allUploadsStarted(count: number) {
  await vi.waitFor(() => expect(uploads).toHaveLength(count))
}

describe('SupabaseReviewRepository photo uploads', () => {
  let repository: SupabaseReviewRepository

  beforeEach(() => {
    uploads = []
    removeCalls = []
    rpcCalls = []
    rpcError = null
    fakeClient = createFakeClient()
    repository = new SupabaseReviewRepository()
  })

  it('starts every upload before any of them settles', async () => {
    const submitted = repository.submit(input())
    await allUploadsStarted(3)

    // Nothing has been released yet: the three requests are genuinely in flight together,
    // which the old `for (const photo of photos) await ...` loop could never produce.
    expect(uploads.map((upload) => upload.path)).toHaveLength(3)
    uploads.forEach((upload) => upload.succeed())
    await submitted
  })

  it('keeps the photo order when uploads finish out of order', async () => {
    const submitted = repository.submit(input())
    await allUploadsStarted(3)

    // Reverse completion order; a plain push from the callbacks would record webp, png, jpg.
    for (const upload of [...uploads].reverse()) upload.succeed()
    const review = await submitted

    expect(extensions(review.photoUrls)).toEqual(['jpg', 'png', 'webp'])
    expect(review.photoUrls.every((url) => url.startsWith(PUBLIC_PREFIX))).toBe(true)
    expect(rpcCalls.map((call) => call.name)).toEqual(['submit_review'])
    expect(rpcCalls[0]?.args.p_photo_urls).toEqual(review.photoUrls)
    expect(removeCalls).toEqual([])
  })

  it('removes the uploads that succeeded after the failure, and maps the error', async () => {
    const submitted = repository.submit(input())
    await allUploadsStarted(3)
    const [first, second, third] = uploads
    const paths = uploads.map((upload) => upload.path)

    // The middle upload fails first and the other two succeed afterwards. Promise.all would
    // have rejected here and left those two behind as orphan objects.
    second?.fail(Object.assign(new Error('Payload too large'), { statusCode: '413' }))
    first?.succeed()
    third?.succeed()

    const error = await submitted.catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AppError)
    // 413 -> validation is mapSupabaseError's storage branch; a raw StorageError would not
    // carry this message.
    expect(error).toMatchObject({ code: 'validation', message: 'Images must be 5 MB or smaller.' })
    expect(removeCalls).toEqual([[paths[0], paths[2]]])
    expect(rpcCalls).toEqual([])
  })

  it('cleans up and maps when an upload rejects instead of returning an error', async () => {
    const submitted = repository.submit(input())
    await allUploadsStarted(3)
    const [first, second, third] = uploads
    const paths = uploads.map((upload) => upload.path)

    first?.reject(new TypeError('Failed to fetch'))
    second?.succeed()
    third?.succeed()

    const error = await submitted.catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ code: 'network' })
    expect(removeCalls).toEqual([[paths[1], paths[2]]])
  })

  it('still removes all uploads when the review row cannot be created', async () => {
    // Shaped like a PostgrestError so mapSupabaseError reads CF001 as a conflict.
    rpcError = {
      code: 'CF001',
      message: 'You have already reviewed this product.',
      details: '',
      hint: null,
    }
    const submitted = repository.submit(input())
    await allUploadsStarted(3)
    const paths = uploads.map((upload) => upload.path)
    uploads.forEach((upload) => upload.succeed())

    await expect(submitted).rejects.toMatchObject({ code: 'conflict' })
    expect(removeCalls).toEqual([paths])
  })

  it('refuses more than three photos before uploading anything', async () => {
    await expect(
      repository.submit(input([...PHOTOS, photo('image/jpeg', 'fourth.jpg')])),
    ).rejects.toMatchObject({ code: 'validation' })
    expect(uploads).toEqual([])
  })
})
