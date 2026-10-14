import { AppError } from '@/lib/errors'

import type { Review, ReviewRepository, ReviewSummary } from '../domain/entities'

const notAvailable = () =>
  new AppError('unknown', 'Reviews are not available in Supabase mode yet.')

/** Placeholder until the Supabase schema for reviews lands. Every method throws. */
export class SupabaseReviewRepository implements ReviewRepository {
  listForProduct(): Promise<Review[]> {
    return Promise.reject(notAvailable())
  }

  getSummary(): Promise<ReviewSummary> {
    return Promise.reject(notAvailable())
  }

  submit(): Promise<Review> {
    return Promise.reject(notAvailable())
  }

  listAdmin(): Promise<Review[]> {
    return Promise.reject(notAvailable())
  }

  setStatus(): Promise<Review> {
    return Promise.reject(notAvailable())
  }

  remove(): Promise<void> {
    return Promise.reject(notAvailable())
  }
}
