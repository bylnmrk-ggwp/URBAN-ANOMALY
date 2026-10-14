import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  parseRpcJson,
  returnRequestJsonSchema,
  returnRequestListJsonSchema,
  toReturnRequest,
  unwrap,
} from '@/lib/supabase/mappers'

import type {
  ReturnRepository,
  ReturnRequest,
  ReturnRequestInput,
  ReturnStatus,
} from '../domain/entities'
import { returnRequestSchema } from '../domain/entities'

/**
 * Requests live in `return_requests` + `return_items` (0006_features_round2.sql). Every call
 * is an RPC: `request_return` enforces ownership, the delivered status, the 14-day window,
 * one open request per order and the per-item quantities; `update_return_status` enforces
 * `RETURN_STATUS_TRANSITIONS` and, on `refunded`, settles the order's payment status.
 */
export class SupabaseReturnRepository implements ReturnRepository {
  private get db() {
    return getSupabaseClient()
  }

  async request(input: ReturnRequestInput): Promise<ReturnRequest> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw AppError.unauthorized('Sign in to request a return.')

    const parsed = returnRequestSchema.safeParse(input)
    if (!parsed.success) {
      throw new AppError('validation', parsed.error.issues[0]?.message ?? 'Check your request.')
    }

    const data = unwrap(
      await this.db.rpc('request_return', {
        p_order_id: input.orderId,
        p_items: parsed.data.items.map((item) => ({
          order_item_id: item.orderItemId,
          quantity: item.quantity,
        })),
        p_reason: parsed.data.reason,
        p_resolution: parsed.data.resolution,
        p_note: parsed.data.note,
      }),
    )
    return toReturnRequest(parseRpcJson(returnRequestJsonSchema, data, 'request_return'))
  }

  async getForOrder(orderId: string): Promise<ReturnRequest | null> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) throw AppError.unauthorized()

    // Returns null for unknown orders and for orders the caller may not see.
    const data = unwrap(await this.db.rpc('order_return_request', { p_order_id: orderId }))
    if (data === null) return null
    return toReturnRequest(parseRpcJson(returnRequestJsonSchema, data, 'order_return_request'))
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listAdmin(status: ReturnStatus | 'all' = 'all'): Promise<ReturnRequest[]> {
    const data = unwrap(await this.db.rpc('list_return_requests', { p_status: status }))
    return parseRpcJson(returnRequestListJsonSchema, data, 'list_return_requests').map(
      toReturnRequest,
    )
  }

  async updateStatus(id: string, status: ReturnStatus, adminNote: string): Promise<ReturnRequest> {
    const data = unwrap(
      await this.db.rpc('update_return_status', {
        p_id: id,
        p_status: status,
        p_admin_note: adminNote,
      }),
    )
    return toReturnRequest(parseRpcJson(returnRequestJsonSchema, data, 'update_return_status'))
  }
}
