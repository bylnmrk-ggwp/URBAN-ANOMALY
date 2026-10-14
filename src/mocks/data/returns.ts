import { round2 } from '@/features/cart/domain/rules'
import type { Order } from '@/features/orders/domain/entities'
import type {
  ReturnItem,
  ReturnReason,
  ReturnRequest,
  ReturnResolution,
  ReturnStatus,
} from '@/features/returns/domain/entities'

import { SEED_ORDERS } from './orders'

const DAY_MS = 24 * 60 * 60 * 1000

interface ReturnSpec {
  id: string
  orderId: string
  /** Order item index -> quantity returned. */
  items: { index: number; quantity: number }[]
  reason: ReturnReason
  resolution: ReturnResolution
  note: string
  status: ReturnStatus
  adminNote: string
  /** Days after delivery the request was made. */
  requestedAfterDays: number
  /** Days after the request it was last updated. */
  updatedAfterDays: number
}

/** The date an order was delivered, read from its status history. */
export function deliveredAtOf(order: Order): string | null {
  return order.statusHistory.find((event) => event.status === 'delivered')?.createdAt ?? null
}

export function toReturnItem(order: Order, orderItemId: string, quantity: number): ReturnItem {
  const item = order.items.find((i) => i.id === orderItemId)
  if (!item) throw new Error(`Order ${order.id} has no item ${orderItemId}`)
  return {
    orderItemId: item.id,
    productName: item.productName,
    size: item.size,
    colorName: item.colorName,
    quantity,
    unitPrice: item.unitPrice,
  }
}

export function computeRefundAmount(items: ReturnItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
}

function buildReturn(spec: ReturnSpec): ReturnRequest {
  const order = SEED_ORDERS.find((o) => o.id === spec.orderId)
  if (!order) throw new Error(`Seed return ${spec.id} references unknown order ${spec.orderId}`)
  if (order.status !== 'delivered') {
    throw new Error(
      `Seed return ${spec.id} references order ${spec.orderId} which is not delivered`,
    )
  }
  const deliveredAt = deliveredAtOf(order) ?? order.updatedAt
  const createdAt = new Date(
    new Date(deliveredAt).getTime() + spec.requestedAfterDays * DAY_MS,
  ).toISOString()
  const updatedAt = new Date(
    new Date(createdAt).getTime() + spec.updatedAfterDays * DAY_MS,
  ).toISOString()
  const items = spec.items.map(({ index, quantity }) => {
    const orderItem = order.items[index]
    if (!orderItem) throw new Error(`Seed return ${spec.id} references missing item ${index}`)
    return toReturnItem(order, orderItem.id, quantity)
  })
  return {
    id: spec.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.fullName,
    customerEmail: order.customer.email,
    items,
    reason: spec.reason,
    resolution: spec.resolution,
    note: spec.note,
    status: spec.status,
    adminNote: spec.adminNote,
    refundAmount: computeRefundAmount(items),
    createdAt,
    updatedAt,
  }
}

/**
 * Three requests on delivered seed orders. ord-09 belongs to the demo buyer so the
 * status card shows up on her order page; ord-02 is fully refunded so the mock
 * repository also marks that order's payment as refunded when it seeds.
 */
const SPECS: ReturnSpec[] = [
  {
    id: 'ret-01',
    orderId: 'ord-09',
    items: [{ index: 0, quantity: 1 }],
    reason: 'wrong_size',
    resolution: 'exchange',
    note: 'The 9 is roomier than I expected. Could I swap for an 8 in the same colour?',
    status: 'requested',
    adminNote: '',
    requestedAfterDays: 2,
    updatedAfterDays: 0,
  },
  {
    id: 'ret-02',
    orderId: 'ord-08',
    items: [{ index: 1, quantity: 1 }],
    reason: 'changed_mind',
    resolution: 'refund',
    note: 'Keeping the mules, returning the Midnight Clog — bought the same one in another colour.',
    status: 'approved',
    adminNote: 'Approved. Please ship the pair back within 7 days using the prepaid label.',
    requestedAfterDays: 3,
    updatedAfterDays: 1,
  },
  {
    id: 'ret-03',
    orderId: 'ord-02',
    items: [{ index: 0, quantity: 1 }],
    reason: 'damaged',
    resolution: 'refund',
    note: 'Strap rivet popped out on the second wear. Photos attached to my email.',
    status: 'refunded',
    adminNote: 'Pair received and inspected. Refund issued to the original payment method.',
    requestedAfterDays: 4,
    updatedAfterDays: 6,
  },
]

export const SEED_RETURNS: ReturnRequest[] = SPECS.map(buildReturn)
