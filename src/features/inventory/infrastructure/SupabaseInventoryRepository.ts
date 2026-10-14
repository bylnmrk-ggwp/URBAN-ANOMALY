import type {
  InventoryFilters,
  InventoryMovement,
  InventoryRow,
  StockAdjustmentInput,
} from '@/features/inventory/domain/entities'
import type { InventoryRepository } from '@/features/inventory/domain/repository'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toInventoryMovement, toInventoryRow, unwrap } from '@/lib/supabase/mappers'
import type { PaginatedResult } from '@/types/common'

const DEFAULT_PAGE_SIZE = 25

function sanitizeSearch(term: string): string {
  return term.replace(/[,()]/g, ' ').trim()
}

export class SupabaseInventoryRepository implements InventoryRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(filters: InventoryFilters): Promise<PaginatedResult<InventoryRow>> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
    const from = (page - 1) * pageSize

    let query = this.db
      .from('inventory_rows')
      .select('*', { count: 'exact' })
      .neq('product_status', 'archived')
    if (filters.status && filters.status !== 'all') {
      query = query.eq('stock_status', filters.status)
    }
    if (filters.search) {
      const term = sanitizeSearch(filters.search)
      if (term) {
        query = query.or(
          `sku.ilike.%${term}%,product_name.ilike.%${term}%,color_name.ilike.%${term}%`,
        )
      }
    }
    query = query
      .order('product_name', { ascending: true })
      .order('sku', { ascending: true })
      .range(from, from + pageSize - 1)

    const result = await query
    const rows = unwrap(result)
    const total = result.count ?? rows.length
    return {
      items: rows.map(toInventoryRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  async getLowStock(limit: number): Promise<InventoryRow[]> {
    const result = await this.db
      .from('inventory_rows')
      .select('*')
      .eq('product_status', 'published')
      .in('stock_status', ['low_stock', 'out_of_stock'])
      .order('available_stock', { ascending: true })
      .order('sku', { ascending: true })
      .limit(limit)
    return unwrap(result).map(toInventoryRow)
  }

  async adjustStock(input: StockAdjustmentInput): Promise<InventoryRow> {
    unwrap(
      await this.db.rpc('adjust_stock', {
        p_variant_id: input.variantId,
        p_delta: input.delta,
        p_reason: input.reason,
        p_note: input.note,
      }),
    )
    const result = await this.db
      .from('inventory_rows')
      .select('*')
      .eq('variant_id', input.variantId)
      .maybeSingle()
    const row = unwrap(result)
    if (!row) throw AppError.notFound('Variant')
    return toInventoryRow(row)
  }

  async getMovements(variantId: string): Promise<InventoryMovement[]> {
    const result = await this.db
      .from('inventory_movement_rows')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
    return unwrap(result).map(toInventoryMovement)
  }

  async getRecentMovements(limit: number): Promise<InventoryMovement[]> {
    const result = await this.db
      .from('inventory_movement_rows')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return unwrap(result).map(toInventoryMovement)
  }
}
