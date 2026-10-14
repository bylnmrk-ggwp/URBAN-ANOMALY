import { z } from 'zod'

import type { ISODateString } from '@/types/common'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface Review {
  id: string
  productId: string
  productName: string
  productSlug: string
  userId: string | null
  authorName: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  /** https URLs; mock mode stores object URLs for uploads. */
  photoUrls: string[]
  isVerifiedPurchase: boolean
  status: ReviewStatus
  createdAt: ISODateString
}

export interface ReviewSummary {
  productId: string
  average: number
  count: number
  /** Index 0 = 1 star, index 4 = 5 stars. */
  distribution: [number, number, number, number, number]
}

export interface ReviewInput {
  productId: string
  rating: number
  title: string
  body: string
  photos: File[]
}

export interface AdminReviewFilters {
  status?: ReviewStatus | 'all'
  search?: string
}

export interface ReviewRepository {
  // Storefront: approved only
  listForProduct(productId: string): Promise<Review[]>
  getSummary(productId: string): Promise<ReviewSummary>
  /** Requires an authenticated buyer; verified when the user has a delivered order with the product. */
  submit(input: ReviewInput): Promise<Review>
  // Admin
  listAdmin(filters: AdminReviewFilters): Promise<Review[]>
  setStatus(id: string, status: ReviewStatus): Promise<Review>
  remove(id: string): Promise<void>
}

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, 'Choose a star rating.').max(5),
  title: z.string().trim().min(3, 'Give your review a short title.').max(80),
  body: z.string().trim().min(10, 'Tell us a little more (at least 10 characters).').max(1000),
})
export type ReviewFormValues = z.infer<typeof reviewFormSchema>

export const REVIEW_MAX_PHOTOS = 3
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}
