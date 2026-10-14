import type { InventoryRow } from '@/features/inventory/domain/entities'
import type { OrderSummary } from '@/features/orders/domain/entities'
import type { ISODateString } from '@/types/common'

export interface DashboardKpis {
  totalSales: number
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  deliveredOrders: number
  totalProducts: number
  lowStockProducts: number
}

export interface SalesPoint {
  date: ISODateString
  sales: number
  orders: number
}

export interface BestSeller {
  productId: string
  productName: string
  productSlug: string
  imageUrl: string | null
  unitsSold: number
  revenue: number
}

export interface ActivityEvent {
  id: string
  type: 'order' | 'inventory' | 'product' | 'payment'
  message: string
  href: string | null
  createdAt: ISODateString
}

export interface DashboardSummary {
  kpis: DashboardKpis
  salesSeries: SalesPoint[]
  recentOrders: OrderSummary[]
  bestSellers: BestSeller[]
  lowStock: InventoryRow[]
  recentActivity: ActivityEvent[]
  /** True when figures come from in-memory demo data rather than Supabase. */
  isDemoData: boolean
}

export interface DashboardRepository {
  getSummary(range: { days: number }): Promise<DashboardSummary>
}
