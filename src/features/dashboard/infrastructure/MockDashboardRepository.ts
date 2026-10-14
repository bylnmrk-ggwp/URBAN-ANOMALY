import { MOVEMENT_REASON_LABELS } from '@/features/inventory/domain/entities'
import type { Order } from '@/features/orders/domain/entities'
import { ORDER_STATUS_LABELS } from '@/features/orders/domain/rules'
import type { MockStore } from '@/mocks/MockStore'
import { byNewest, dayKey, deriveInventoryRows, toOrderSummary } from '@/mocks/helpers'

import type {
  ActivityEvent,
  BestSeller,
  DashboardKpis,
  DashboardRepository,
  DashboardSummary,
  SalesPoint,
} from '../domain/entities'

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_ORDERS = 6
const LOW_STOCK_ROWS = 6
const BEST_SELLERS = 5
const ACTIVITY_EVENTS = 8

export class MockDashboardRepository implements DashboardRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async getSummary(range: { days: number }): Promise<DashboardSummary> {
    await this.store.delay()
    const days = Math.max(1, Math.floor(range.days))
    const rangeStart = new Date()
    rangeStart.setHours(0, 0, 0, 0)
    rangeStart.setTime(rangeStart.getTime() - (days - 1) * DAY_MS)

    const orders = this.store.orders
    const active = orders.filter((o) => o.status !== 'cancelled')
    const inRange = active.filter((o) => new Date(o.createdAt).getTime() >= rangeStart.getTime())
    const lowStockRows = deriveInventoryRows(this.store.products).filter(
      (r) => r.status !== 'in_stock',
    )

    const kpis: DashboardKpis = {
      totalSales: sum(inRange.filter(countsAsSale).map((o) => o.total)),
      totalOrders: inRange.length,
      pendingOrders: orders.filter(
        (o) => o.status === 'pending_payment' || o.status === 'pending_confirmation',
      ).length,
      processingOrders: orders.filter((o) => o.status === 'confirmed' || o.status === 'processing')
        .length,
      deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
      totalProducts: this.store.products.filter((p) => p.status === 'published').length,
      lowStockProducts: new Set(lowStockRows.map((r) => r.productId)).size,
    }

    return {
      kpis,
      salesSeries: buildSalesSeries(inRange, rangeStart, days),
      recentOrders: [...orders].sort(byNewest).slice(0, RECENT_ORDERS).map(toOrderSummary),
      bestSellers: buildBestSellers(active),
      lowStock: lowStockRows
        .sort((a, b) => a.availableStock - b.availableStock)
        .slice(0, LOW_STOCK_ROWS),
      recentActivity: this.buildActivity(),
      isDemoData: true,
    }
  }

  private buildActivity(): ActivityEvent[] {
    const events: ActivityEvent[] = []
    for (const order of this.store.orders) {
      for (const event of order.statusHistory) {
        events.push({
          id: `order-${event.id}`,
          type: event.status === 'pending_payment' ? 'payment' : 'order',
          message: `${order.orderNumber} ${describeStatus(event.status)} (${order.customer.fullName})`,
          href: `/admin/orders/${order.id}`,
          createdAt: event.createdAt,
        })
      }
    }
    for (const movement of this.store.movements) {
      const signed = movement.delta > 0 ? `+${movement.delta}` : String(movement.delta)
      events.push({
        id: `inventory-${movement.id}`,
        type: 'inventory',
        message: `${MOVEMENT_REASON_LABELS[movement.reason]}: ${signed} ${movement.sku} (${movement.productName})`,
        href: '/admin/inventory',
        createdAt: movement.createdAt,
      })
    }
    return events.sort(byNewest).slice(0, ACTIVITY_EVENTS)
  }
}

/** Revenue is recognised once an order is paid, or delivered (COD cash in hand). */
function countsAsSale(order: Order): boolean {
  return order.paymentStatus === 'paid' || order.status === 'delivered'
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, v) => total + v, 0) * 100) / 100
}

function buildSalesSeries(orders: Order[], rangeStart: Date, days: number): SalesPoint[] {
  const buckets = new Map<string, SalesPoint>()
  for (let i = 0; i < days; i += 1) {
    const date = new Date(rangeStart.getTime() + i * DAY_MS)
    const iso = date.toISOString()
    buckets.set(dayKey(iso), { date: iso, sales: 0, orders: 0 })
  }
  for (const order of orders) {
    const point = buckets.get(dayKey(order.createdAt))
    if (!point) continue
    point.orders += 1
    if (countsAsSale(order)) point.sales = Math.round((point.sales + order.total) * 100) / 100
  }
  return [...buckets.values()]
}

function buildBestSellers(orders: Order[]): BestSeller[] {
  const totals = new Map<string, BestSeller>()
  for (const order of orders) {
    for (const item of order.items) {
      const current = totals.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        imageUrl: item.imageUrl,
        unitsSold: 0,
        revenue: 0,
      }
      current.unitsSold += item.quantity
      current.revenue = Math.round((current.revenue + item.lineTotal) * 100) / 100
      totals.set(item.productId, current)
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, BEST_SELLERS)
}

function describeStatus(status: Order['status']): string {
  switch (status) {
    case 'pending_payment':
      return 'placed, awaiting payment'
    case 'pending_confirmation':
      return 'received'
    case 'cancelled':
      return 'was cancelled'
    default:
      return `marked ${ORDER_STATUS_LABELS[status]}`
  }
}
