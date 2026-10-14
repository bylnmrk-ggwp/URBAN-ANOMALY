import { AppError } from '@/lib/errors'

import type {
  AppliedDiscount,
  DiscountCode,
  DiscountInput,
  DiscountRepository,
} from '../domain/entities'

const NOT_AVAILABLE = 'Discounts are not available in Supabase mode yet.'

/** Placeholder adapter: keeps `Repositories` satisfied until the discounts schema ships. */
export class SupabaseDiscountRepository implements DiscountRepository {
  validate(_code: string, _subtotal: number): Promise<AppliedDiscount> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  list(): Promise<DiscountCode[]> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  create(_input: DiscountInput): Promise<DiscountCode> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  update(_id: string, _input: DiscountInput): Promise<DiscountCode> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  remove(_id: string): Promise<void> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }
}
