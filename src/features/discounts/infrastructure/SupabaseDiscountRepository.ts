import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import {
  appliedDiscountJsonSchema,
  discountCodeJsonSchema,
  parseRpcJson,
  toAppliedDiscount,
  toDiscountCode,
  unwrap,
} from '@/lib/supabase/mappers'

import type {
  AppliedDiscount,
  DiscountCode,
  DiscountInput,
  DiscountRepository,
} from '../domain/entities'

/**
 * Codes live in `discount_codes` (0006_features_round2.sql). Visitors never read the table:
 * `validate_discount_code` checks a code against a subtotal and `place_order_with_discount`
 * applies it at checkout. Admins read the table through RLS; writes are owner-only RPCs so
 * the same eligibility rules and messages as the mock are enforced server-side.
 */
export class SupabaseDiscountRepository implements DiscountRepository {
  private get db() {
    return getSupabaseClient()
  }

  async validate(code: string, subtotal: number): Promise<AppliedDiscount> {
    const data = unwrap(
      await this.db.rpc('validate_discount_code', {
        p_code: code.trim().toUpperCase(),
        p_subtotal: subtotal,
      }),
    )
    return toAppliedDiscount(
      parseRpcJson(appliedDiscountJsonSchema, data, 'validate_discount_code'),
    )
  }

  async list(): Promise<DiscountCode[]> {
    const result = await this.db
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false })
    return unwrap(result).map(toDiscountCode)
  }

  async create(input: DiscountInput): Promise<DiscountCode> {
    return this.save(null, input)
  }

  async update(id: string, input: DiscountInput): Promise<DiscountCode> {
    return this.save(id, input)
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.rpc('delete_discount_code', { p_id: id }))
  }

  /** `save_discount_code` normalises the code, validates and raises CF001 on duplicates. */
  private async save(id: string | null, input: DiscountInput): Promise<DiscountCode> {
    const payload: Json = {
      code: input.code.trim().toUpperCase(),
      type: input.type,
      value: input.value,
      min_subtotal: input.minSubtotal,
      max_uses: input.maxUses,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      is_active: input.isActive,
    }
    const data = unwrap(await this.db.rpc('save_discount_code', { p_id: id, p_payload: payload }))
    return toDiscountCode(parseRpcJson(discountCodeJsonSchema, data, 'save_discount_code'))
  }
}
