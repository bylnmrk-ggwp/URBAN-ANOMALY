import type { InventoryMovement, MovementReason } from '@/features/inventory/domain/entities'
import type { ProductSize } from '@/features/products/domain/entities'

import { SEED_ORDERS } from './orders'
import { SEED_PRODUCTS, daysAgo, variantId } from './products'

function orderNumberOf(orderId: string): string {
  const order = SEED_ORDERS.find((o) => o.id === orderId)
  if (!order) throw new Error(`Seed movement references unknown order ${orderId}`)
  return order.orderNumber
}

interface MovementSpec {
  id: string
  productId: string
  size: ProductSize
  color: string
  delta: number
  reason: MovementReason
  note: string
  actor: string
  referenceOrderNumber: string | null
  daysAgo: number
  hours: number
}

function buildMovement(spec: MovementSpec): InventoryMovement {
  const product = SEED_PRODUCTS.find((p) => p.id === spec.productId)
  const id = variantId(spec.productId, spec.size, spec.color)
  const variant = product?.variants.find((v) => v.id === id)
  if (!product || !variant) {
    throw new Error(`Seed movement ${spec.id} references missing variant ${id}`)
  }
  return {
    id: spec.id,
    variantId: variant.id,
    sku: variant.sku,
    productName: product.name,
    delta: spec.delta,
    // Movements are historical; the running balance is approximated from the current count.
    stockAfter: variant.stock,
    reason: spec.reason,
    note: spec.note,
    actor: spec.actor,
    referenceOrderNumber: spec.referenceOrderNumber,
    createdAt: daysAgo(spec.daysAgo, spec.hours),
  }
}

const ADMIN = 'Store Admin'
const SYSTEM = 'System'

const SPECS: MovementSpec[] = [
  {
    id: 'mov-01',
    productId: 'prod-01',
    size: '8',
    color: 'Lava',
    delta: 40,
    reason: 'restock',
    note: 'Weekly replenishment from the Marikina workshop.',
    actor: ADMIN,
    referenceOrderNumber: null,
    daysAgo: 30,
    hours: 2,
  },
  {
    id: 'mov-02',
    productId: 'prod-09',
    size: '10',
    color: 'Midnight',
    delta: -1,
    reason: 'order_fulfilled',
    note: 'Shipped with LBC.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-02'),
    daysAgo: 28,
    hours: 5,
  },
  {
    id: 'mov-03',
    productId: 'prod-05',
    size: '7',
    color: 'Sand',
    delta: 1,
    reason: 'order_released',
    note: 'Reservation released after customer cancellation.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-03'),
    daysAgo: 26,
    hours: 1,
  },
  {
    id: 'mov-04',
    productId: 'prod-13',
    size: '9',
    color: 'Midnight',
    delta: -2,
    reason: 'damaged',
    note: 'Mould flash on the strap edge found during inspection.',
    actor: ADMIN,
    referenceOrderNumber: null,
    daysAgo: 22,
    hours: 7,
  },
  {
    id: 'mov-05',
    productId: 'prod-05',
    size: '8',
    color: 'Bone',
    delta: 24,
    reason: 'restock',
    note: 'Second production run arrived.',
    actor: ADMIN,
    referenceOrderNumber: null,
    daysAgo: 19,
    hours: 3,
  },
  {
    id: 'mov-06',
    productId: 'prod-15',
    size: '7',
    color: 'Sand',
    delta: -1,
    reason: 'order_fulfilled',
    note: 'Shipped with J&T Express.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-08'),
    daysAgo: 17,
    hours: 9,
  },
  {
    id: 'mov-07',
    productId: 'prod-11',
    size: '7',
    color: 'Lava',
    delta: 1,
    reason: 'returned',
    note: 'Customer exchanged for size 8; pair inspected and restocked.',
    actor: ADMIN,
    referenceOrderNumber: orderNumberOf('ord-05'),
    daysAgo: 14,
    hours: 4,
  },
  {
    id: 'mov-08',
    productId: 'prod-13',
    size: '8',
    color: 'Forest',
    delta: -3,
    reason: 'correction',
    note: 'Cycle count found 3 fewer pairs than recorded.',
    actor: ADMIN,
    referenceOrderNumber: null,
    daysAgo: 12,
    hours: 6,
  },
  {
    id: 'mov-09',
    productId: 'prod-14',
    size: '9',
    color: 'Charcoal',
    delta: 1,
    reason: 'order_released',
    note: 'Order cancelled before shipment.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-10'),
    daysAgo: 11,
    hours: 2,
  },
  {
    id: 'mov-10',
    productId: 'prod-10',
    size: '8',
    color: 'Midnight',
    delta: -1,
    reason: 'order_fulfilled',
    note: 'Shipped with J&T Express.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-11'),
    daysAgo: 7,
    hours: 8,
  },
  {
    id: 'mov-11',
    productId: 'prod-06',
    size: '8',
    color: 'Sage',
    delta: -2,
    reason: 'order_fulfilled',
    note: 'Shipped with LBC.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-12'),
    daysAgo: 5,
    hours: 3,
  },
  {
    id: 'mov-12',
    productId: 'prod-02',
    size: '10',
    color: 'Ice',
    delta: 30,
    reason: 'restock',
    note: 'Restock after the Ice drop sold through.',
    actor: ADMIN,
    referenceOrderNumber: null,
    daysAgo: 4,
    hours: 1,
  },
  {
    id: 'mov-13',
    productId: 'prod-15',
    size: '8',
    color: 'Sand',
    delta: -1,
    reason: 'order_reserved',
    note: 'Reserved at checkout.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-14'),
    daysAgo: 4,
    hours: 10,
  },
  {
    id: 'mov-14',
    productId: 'prod-09',
    size: '8',
    color: 'Bone',
    delta: -1,
    reason: 'order_reserved',
    note: 'Reserved at checkout.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-16'),
    daysAgo: 2,
    hours: 9,
  },
  {
    id: 'mov-15',
    productId: 'prod-09',
    size: '9',
    color: 'Lava',
    delta: -1,
    reason: 'order_reserved',
    note: 'Reserved at checkout, awaiting online payment.',
    actor: SYSTEM,
    referenceOrderNumber: orderNumberOf('ord-18'),
    daysAgo: 0,
    hours: 3,
  },
]

export const SEED_MOVEMENTS: InventoryMovement[] = SPECS.map(buildMovement)
