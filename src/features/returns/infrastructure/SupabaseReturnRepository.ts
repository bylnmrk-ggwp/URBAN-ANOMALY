import { AppError } from '@/lib/errors'

import type { ReturnRepository, ReturnRequest } from '../domain/entities'

const notAvailable = () =>
  new AppError('unknown', 'Returns are not available in Supabase mode yet.')

/** Placeholder until the Supabase schema for returns lands. Every method throws. */
export class SupabaseReturnRepository implements ReturnRepository {
  request(): Promise<ReturnRequest> {
    return Promise.reject(notAvailable())
  }

  getForOrder(): Promise<ReturnRequest | null> {
    return Promise.reject(notAvailable())
  }

  listAdmin(): Promise<ReturnRequest[]> {
    return Promise.reject(notAvailable())
  }

  updateStatus(): Promise<ReturnRequest> {
    return Promise.reject(notAvailable())
  }
}
