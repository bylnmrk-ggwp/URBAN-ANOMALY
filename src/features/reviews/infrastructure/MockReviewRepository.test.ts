import { beforeEach, describe, expect, it } from 'vitest'

import type { Repositories } from '@/config/repositories'
import { AppError } from '@/lib/errors'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import type { MockStore } from '@/mocks/MockStore'

import { summarizeReviews } from './MockReviewRepository'

const BUYER = { email: 'buyer@demo.local', password: 'password' }
const ADMIN = { email: 'admin@demo.local', password: 'password' }

function fakeFile(name = 'photo.jpg') {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('MockReviewRepository', () => {
  let repositories: Repositories
  let store: MockStore

  beforeEach(() => {
    window.sessionStorage.clear()
    ;({ repositories, store } = createMockRepositoriesForTest())
  })

  it('seeds 14 reviews with the expected status mix', () => {
    expect(store.reviews).toHaveLength(14)
    expect(store.reviews.filter((r) => r.status === 'pending')).toHaveLength(3)
    expect(store.reviews.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(store.reviews.filter((r) => r.isVerifiedPurchase)).toHaveLength(4)
    expect(store.reviews.filter((r) => r.photoUrls.length > 0)).toHaveLength(5)
  })

  it('only exposes approved reviews to the storefront and summarises them', async () => {
    // prod-11 has one approved and one pending review in the seed.
    const list = await repositories.reviews.listForProduct('prod-11')
    expect(list).toHaveLength(1)
    expect(list.every((r) => r.status === 'approved')).toBe(true)

    const summary = await repositories.reviews.getSummary('prod-11')
    expect(summary).toMatchObject({ productId: 'prod-11', count: 1, average: 5 })
    expect(summary.distribution).toEqual([0, 0, 0, 0, 1])

    const empty = await repositories.reviews.getSummary('prod-99')
    expect(empty).toMatchObject({ count: 0, average: 0, distribution: [0, 0, 0, 0, 0] })
  })

  it('rounds the average to one decimal', () => {
    const reviews = store.reviews.filter((r) => r.productId === 'prod-01')
    // 5 + 4 + 2 = 11 / 3
    expect(summarizeReviews('prod-01', reviews)).toMatchObject({ average: 3.7, count: 3 })
  })

  it('rejects submissions without a session', async () => {
    await expect(
      repositories.reviews.submit({
        productId: 'prod-02',
        rating: 5,
        title: 'Great',
        body: 'Really great quality clog.',
        photos: [],
      }),
    ).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('marks a review verified only when the buyer has a delivered order with the product', async () => {
    await repositories.auth.signIn(BUYER)

    // Maria's ord-05 (delivered) contains prod-11, but she already reviewed it; prod-02 is unbought.
    const unverified = await repositories.reviews.submit({
      productId: 'prod-02',
      rating: 4,
      title: 'Solid everyday clog',
      body: 'Light underfoot, strap swaps easily.',
      photos: [fakeFile()],
    })
    expect(unverified).toMatchObject({
      status: 'pending',
      isVerifiedPurchase: false,
      userId: 'user-buyer-1',
      authorName: 'Maria S.',
    })
    expect(unverified.photoUrls).toHaveLength(1)
    expect(unverified.photoUrls[0]).toMatch(/^blob:/)

    // Make prod-02 part of a delivered order of hers and check the flag flips.
    const delivered = store.orders.find((o) => o.id === 'ord-01')
    const item = delivered?.items[0]
    if (!delivered || !item) throw new Error('seed order missing')
    delivered.items.push({ ...item, id: 'ord-01-item-x', productId: 'prod-05' })
    const verified = await repositories.reviews.submit({
      productId: 'prod-05',
      rating: 5,
      title: 'Soft and matte',
      body: 'Perfect for the rainy season, dries fast.',
      photos: [],
    })
    expect(verified.isVerifiedPurchase).toBe(true)

    // Pending reviews never show on the storefront.
    const visible = await repositories.reviews.listForProduct('prod-02')
    expect(visible.find((r) => r.id === unverified.id)).toBeUndefined()
  })

  it('allows one review per user per product', async () => {
    await repositories.auth.signIn(BUYER)
    await expect(
      repositories.reviews.submit({
        productId: 'prod-01',
        rating: 5,
        title: 'Second time',
        body: 'Trying to review this one again.',
        photos: [],
      }),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('caps photos and validates the form fields', async () => {
    await repositories.auth.signIn(BUYER)
    await expect(
      repositories.reviews.submit({
        productId: 'prod-02',
        rating: 5,
        title: 'Too many',
        body: 'Four photos attached here.',
        photos: [fakeFile('a.jpg'), fakeFile('b.jpg'), fakeFile('c.jpg'), fakeFile('d.jpg')],
      }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      repositories.reviews.submit({
        productId: 'prod-02',
        rating: 0,
        title: 'No stars',
        body: 'Forgot to pick a rating.',
        photos: [],
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('filters admin lists by status and search, and gates moderation to admins', async () => {
    const pending = await repositories.reviews.listAdmin({ status: 'pending' })
    expect(pending).toHaveLength(3)
    const searched = await repositories.reviews.listAdmin({ status: 'all', search: 'dusk' })
    expect(searched.every((r) => r.productName === 'Dusk Loafer Mule')).toBe(true)
    expect(searched.length).toBeGreaterThan(0)

    await repositories.auth.signIn(BUYER)
    await expect(repositories.reviews.setStatus('rev-07', 'approved')).rejects.toMatchObject({
      code: 'forbidden',
    })

    await repositories.auth.signIn(ADMIN)
    const approved = await repositories.reviews.setStatus('rev-07', 'approved')
    expect(approved.status).toBe('approved')
    expect(await repositories.reviews.listForProduct('prod-11')).toHaveLength(2)

    await repositories.reviews.remove('rev-09')
    expect(store.reviews.find((r) => r.id === 'rev-09')).toBeUndefined()
    await expect(repositories.reviews.remove('rev-09')).rejects.toMatchObject({ code: 'not_found' })
  })
})
