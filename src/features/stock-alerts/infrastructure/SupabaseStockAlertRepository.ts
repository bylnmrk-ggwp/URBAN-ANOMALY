import { AppError } from '@/lib/errors'

import type { StockAlert, StockAlertRepository } from '../domain/entities'

const notAvailable = () =>
  new AppError('unknown', 'Back-in-stock alerts are not available in Supabase mode yet.')

/** Placeholder so the Supabase composition root satisfies `Repositories`. */
export class SupabaseStockAlertRepository implements StockAlertRepository {
  async subscribe(_input: { variantId: string; email: string }): Promise<StockAlert> {
    throw notAvailable()
  }

  async list(): Promise<StockAlert[]> {
    throw notAvailable()
  }

  async markNotified(_variantId: string): Promise<number> {
    throw notAvailable()
  }
}
