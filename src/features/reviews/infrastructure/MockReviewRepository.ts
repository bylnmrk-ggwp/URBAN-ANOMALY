import { AppError } from '@/lib/errors'
import { SEED_REVIEWS } from '@/mocks/data/reviews'
import type { MockStore } from '@/mocks/MockStore'
import { byNewest, clone, matchesSearch, nowIso } from '@/mocks/helpers'

import type {
  AdminReviewFilters,
  Review,
  ReviewInput,
  ReviewRepository,
  ReviewStatus,
  ReviewSummary,
} from '../domain/entities'
import { REVIEW_MAX_PHOTOS, reviewFormSchema } from '../domain/entities'

const EMPTY_DISTRIBUTION: ReviewSummary['distribution'] = [0, 0, 0, 0, 0]

/** Summary over a list of approved reviews. Average is rounded to one decimal. */
export function summarizeReviews(productId: string, reviews: Review[]): ReviewSummary {
  const distribution: ReviewSummary['distribution'] = [...EMPTY_DISTRIBUTION]
  let total = 0
  for (const review of reviews) {
    const index = review.rating - 1
    distribution[index] = (distribution[index] ?? 0) + 1
    total += review.rating
  }
  const count = reviews.length
  return {
    productId,
    average: count === 0 ? 0 : Math.round((total / count) * 10) / 10,
    count,
    distribution,
  }
}

export class MockReviewRepository implements ReviewRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
    if (store.reviews.length === 0) store.reviews = clone(SEED_REVIEWS)
  }

  async listForProduct(productId: string): Promise<Review[]> {
    await this.store.delay()
    return this.approvedFor(productId).sort(byNewest).map(clone)
  }

  async getSummary(productId: string): Promise<ReviewSummary> {
    await this.store.delay()
    return summarizeReviews(productId, this.approvedFor(productId))
  }

  async submit(input: ReviewInput): Promise<Review> {
    await this.store.delay()
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized('Sign in to write a review.')

    const product = this.store.findProduct(input.productId)
    if (!product) throw AppError.notFound('Product')

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
    if (
      this.store.reviews.some((r) => r.userId === session.user.id && r.productId === product.id)
    ) {
      throw new AppError('conflict', 'You have already reviewed this product.')
    }

    const id = this.store.nextId('rev')
    const review: Review = {
      id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      userId: session.user.id,
      authorName: abbreviateName(session.user.fullName),
      rating: parsed.data.rating as Review['rating'],
      title: parsed.data.title,
      body: parsed.data.body,
      photoUrls: input.photos.map((file, index) => toObjectUrl(file, `${id}-${index + 1}`)),
      isVerifiedPurchase: this.hasDeliveredOrderWith(session.user.id, product.id),
      status: 'pending',
      createdAt: nowIso(),
    }
    this.store.reviews.unshift(review)
    return clone(review)
  }

  async listAdmin(filters: AdminReviewFilters): Promise<Review[]> {
    await this.store.delay()
    let items = [...this.store.reviews]
    if (filters.status && filters.status !== 'all') {
      const status = filters.status
      items = items.filter((r) => r.status === status)
    }
    if (filters.search) {
      items = items.filter((r) =>
        matchesSearch(filters.search, r.productName, r.authorName, r.title, r.body),
      )
    }
    return items.sort(byNewest).map(clone)
  }

  async setStatus(id: string, status: ReviewStatus): Promise<Review> {
    await this.store.delay()
    this.requireAdmin()
    const review = this.requireReview(id)
    review.status = status
    return clone(review)
  }

  async remove(id: string): Promise<void> {
    await this.store.delay()
    this.requireAdmin()
    const index = this.store.reviews.findIndex((r) => r.id === id)
    if (index === -1) throw AppError.notFound('Review')
    const [removed] = this.store.reviews.splice(index, 1)
    if (removed) revokeObjectUrls(removed.photoUrls)
  }

  private approvedFor(productId: string): Review[] {
    return this.store.reviews.filter((r) => r.productId === productId && r.status === 'approved')
  }

  /** A purchase counts as verified once an order containing the product has been delivered. */
  private hasDeliveredOrderWith(userId: string, productId: string): boolean {
    return this.store.orders.some(
      (order) =>
        order.customer.userId === userId &&
        order.status === 'delivered' &&
        order.items.some((item) => item.productId === productId),
    )
  }

  private requireAdmin() {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    if (session.user.role !== 'admin') throw AppError.forbidden()
  }

  private requireReview(id: string): Review {
    const review = this.store.reviews.find((r) => r.id === id)
    if (!review) throw AppError.notFound('Review')
    return review
  }
}

/** "Maria Santos" -> "Maria S." so storefront reviews never show a full surname. */
function abbreviateName(fullName: string): string {
  const [first = '', ...rest] = fullName.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first || 'Customer'
}

/** jsdom has no `URL.createObjectURL`; fall back to a stable fake blob URL there. */
function toObjectUrl(file: File, fallbackId: string): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file)
  }
  return `blob:mock/${fallbackId}`
}

function revokeObjectUrls(urls: string[]) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  for (const url of urls)
    if (url.startsWith('blob:') && !url.startsWith('blob:mock/')) URL.revokeObjectURL(url)
}
