import type { PaginatedResult } from '@/types/common'

import type {
  InventoryFilters,
  InventoryMovement,
  InventoryRow,
  StockAdjustmentInput,
} from './entities'

export interface InventoryRepository {
  list(filters: InventoryFilters): Promise<PaginatedResult<InventoryRow>>
  getLowStock(limit: number): Promise<InventoryRow[]>
  /**
   * Applies an audited stock adjustment. In Supabase mode this is an RPC that
   * writes the movement row and updates the variant in one transaction.
   */
  adjustStock(input: StockAdjustmentInput): Promise<InventoryRow>
  getMovements(variantId: string): Promise<InventoryMovement[]>
  getRecentMovements(limit: number): Promise<InventoryMovement[]>
}
