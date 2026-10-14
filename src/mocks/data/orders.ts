import { calculateShippingFee, round2 } from '@/features/cart/domain/rules'
import type {
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  OrderTracking,
  PaymentMethod,
  PaymentStatus,
  ShippingAddress,
} from '@/features/orders/domain/entities'
import { generateOrderNumber } from '@/features/orders/domain/rules'
import type { ProductSize } from '@/features/products/domain/entities'
import { findVariant, getDisplayPrice, getPrimaryImage } from '@/features/products/domain/rules'

import { SEED_PRODUCTS } from './products'

/** Order numbers for orders placed at runtime continue from this sequence. */
export const SEED_ORDER_SEQUENCE_START = 1001

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const NOW = new Date()

interface Person {
  customer: OrderCustomer
  address: ShippingAddress
}

const MARIA: Person = {
  customer: {
    userId: 'user-buyer-1',
    fullName: 'Maria Santos',
    email: 'buyer@demo.local',
    phone: '09171234567',
  },
  address: {
    addressLine: '24 Maginhawa Street, Unit 3B',
    barangay: 'Teachers Village East',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1101',
    deliveryInstructions: 'Leave with the guard if no answer.',
  },
}

const JUAN: Person = {
  customer: {
    userId: null,
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@gmail.com',
    phone: '09182345678',
  },
  address: {
    addressLine: '1205 One Rockwell West Tower, Rockwell Drive',
    barangay: 'Poblacion',
    city: 'Makati City',
    province: 'Metro Manila',
    postalCode: '1210',
    deliveryInstructions: 'Call on arrival, concierge accepts parcels.',
  },
}

const ANDREA: Person = {
  customer: {
    userId: null,
    fullName: 'Andrea Reyes',
    email: 'andrea.reyes@yahoo.com',
    phone: '09193456789',
  },
  address: {
    addressLine: '17 Gorordo Avenue',
    barangay: 'Lahug',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    deliveryInstructions: '',
  },
}

const PAOLO: Person = {
  customer: {
    userId: null,
    fullName: 'Paolo Villanueva',
    email: 'paolo.v@gmail.com',
    phone: '09204567890',
  },
  address: {
    addressLine: 'Blk 4 Lot 9, Ecoland Subdivision',
    barangay: 'Matina',
    city: 'Davao City',
    province: 'Davao del Sur',
    postalCode: '8000',
    deliveryInstructions: 'Gate is blue. Dog is friendly.',
  },
}

const CHRISTINE: Person = {
  customer: {
    userId: null,
    fullName: 'Christine Tan',
    email: 'christine.tan@outlook.com',
    phone: '09215678901',
  },
  address: {
    addressLine: '31F Tower 2, The Grove by Rockwell, E. Rodriguez Jr. Avenue',
    barangay: 'Ugong',
    city: 'Pasig City',
    province: 'Metro Manila',
    postalCode: '1604',
    deliveryInstructions: 'Leave at the lobby reception.',
  },
}

const MIGUEL: Person = {
  customer: {
    userId: null,
    fullName: 'Miguel Bautista',
    email: 'miguel.bautista@gmail.com',
    phone: '09226789012',
  },
  address: {
    addressLine: '8 Lawton Avenue, Bonifacio Global City',
    barangay: 'Fort Bonifacio',
    city: 'Taguig City',
    province: 'Metro Manila',
    postalCode: '1634',
    deliveryInstructions: '',
  },
}

const KRISTEL: Person = {
  customer: {
    userId: null,
    fullName: 'Kristel Ocampo',
    email: 'kristel.ocampo@gmail.com',
    phone: '09237890123',
  },
  address: {
    addressLine: '56 General Luna Street',
    barangay: 'Jaro',
    city: 'Iloilo City',
    province: 'Iloilo',
    postalCode: '5000',
    deliveryInstructions: 'Weekdays after 5pm only.',
  },
}

const RAMON: Person = {
  customer: {
    userId: null,
    fullName: 'Ramon Garcia',
    email: 'ramon.garcia@gmail.com',
    phone: '09248901234',
  },
  address: {
    addressLine: '402 Shaw Boulevard, Wack-Wack Twin Towers',
    barangay: 'Wack-Wack Greenhills',
    city: 'Mandaluyong City',
    province: 'Metro Manila',
    postalCode: '1555',
    deliveryInstructions: '',
  },
}

const BIANCA: Person = {
  customer: {
    userId: null,
    fullName: 'Bianca Lim',
    email: 'bianca.lim@gmail.com',
    phone: '09259012345',
  },
  address: {
    addressLine: '12 Leonard Wood Road',
    barangay: 'Botanical Garden',
    city: 'Baguio City',
    province: 'Benguet',
    postalCode: '2600',
    deliveryInstructions: 'Please text before delivery, steep driveway.',
  },
}

interface ItemSpec {
  productId: string
  size: ProductSize
  color: string
  quantity: number
}

interface OrderSpec {
  id: string
  sequence: number
  daysAgo: number
  hour: number
  person: Person
  items: ItemSpec[]
  paymentMethod: PaymentMethod
  status: OrderStatus
  paymentStatus: PaymentStatus
  /** For cancelled orders: the status the order was in before cancellation. */
  cancelledFrom?: OrderStatus
  tracking?: OrderTracking
  customerNote?: string
  adminNotes?: string
  discount?: number
}

const COD_PATH: OrderStatus[] = [
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]
const ONLINE_PATH: OrderStatus[] = ['pending_payment', ...COD_PATH]

function statusPath(spec: OrderSpec): OrderStatus[] {
  const full = spec.paymentMethod === 'cod' ? COD_PATH : ONLINE_PATH
  if (spec.status === 'cancelled') {
    const from = spec.cancelledFrom ?? full[0] ?? 'pending_confirmation'
    return [...full.slice(0, full.indexOf(from) + 1), 'cancelled']
  }
  return full.slice(0, full.indexOf(spec.status) + 1)
}

const HISTORY_NOTES: Partial<Record<OrderStatus, string>> = {
  pending_payment: 'Order placed, awaiting online payment.',
  pending_confirmation: 'Order received.',
  confirmed: 'Order confirmed by the store.',
  processing: 'Items picked and packed.',
  shipped: 'Handed to courier.',
  delivered: 'Delivered to customer.',
  cancelled: 'Order cancelled.',
}

function buildHistory(spec: OrderSpec, createdAt: Date): OrderStatusEvent[] {
  const path = statusPath(spec)
  const steps = Math.max(1, path.length - 1)
  const available = NOW.getTime() - createdAt.getTime() - 2 * HOUR_MS
  const step = Math.max(HOUR_MS, Math.min(10 * HOUR_MS, available / steps))
  return path.map((status, i) => {
    const isCancelledByCustomer =
      status === 'cancelled' &&
      spec.cancelledFrom !== 'confirmed' &&
      spec.cancelledFrom !== 'processing'
    const actor: OrderStatusEvent['actor'] =
      i === 0 || status === 'pending_confirmation'
        ? 'system'
        : isCancelledByCustomer
          ? 'customer'
          : 'admin'
    return {
      id: `${spec.id}-evt-${i + 1}`,
      status,
      note: HISTORY_NOTES[status] ?? null,
      actor,
      createdAt: new Date(createdAt.getTime() + i * step).toISOString(),
    }
  })
}

function buildItems(spec: OrderSpec): OrderItem[] {
  return spec.items.map((item, i) => {
    const product = SEED_PRODUCTS.find((p) => p.id === item.productId)
    if (!product)
      throw new Error(`Seed order ${spec.id} references unknown product ${item.productId}`)
    const variant = findVariant(product, item.size, item.color)
    if (!variant) {
      throw new Error(
        `Seed order ${spec.id} references missing variant ${item.productId} ${item.size} ${item.color}`,
      )
    }
    const unitPrice = getDisplayPrice(product)
    return {
      id: `${spec.id}-item-${i + 1}`,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: getPrimaryImage(product)?.url ?? null,
      sku: variant.sku,
      size: variant.size,
      colorName: variant.color.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
    }
  })
}

function buildOrder(spec: OrderSpec): Order {
  const createdAt = new Date(NOW.getTime() - spec.daysAgo * DAY_MS)
  createdAt.setHours(spec.hour, (spec.sequence * 7) % 60, 0, 0)
  if (createdAt.getTime() > NOW.getTime() - 3 * HOUR_MS) {
    createdAt.setTime(NOW.getTime() - 3 * HOUR_MS)
  }
  const items = buildItems(spec)
  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0))
  const shippingFee = calculateShippingFee(subtotal)
  const discount = spec.discount ?? 0
  const statusHistory = buildHistory(spec, createdAt)
  const updatedAt = statusHistory[statusHistory.length - 1]?.createdAt ?? createdAt.toISOString()
  return {
    id: spec.id,
    orderNumber: generateOrderNumber(spec.sequence, createdAt),
    customer: { ...spec.person.customer },
    shippingAddress: { ...spec.person.address },
    items,
    subtotal,
    shippingFee,
    discount,
    total: round2(subtotal + shippingFee - discount),
    paymentMethod: spec.paymentMethod,
    paymentStatus: spec.paymentStatus,
    status: spec.status,
    statusHistory,
    tracking: spec.tracking ?? null,
    customerNote: spec.customerNote ?? '',
    adminNotes: spec.adminNotes ?? '',
    createdAt: createdAt.toISOString(),
    updatedAt,
  }
}

const SPECS: OrderSpec[] = [
  {
    id: 'ord-01',
    sequence: 1001,
    daysAgo: 44,
    hour: 10,
    person: MARIA,
    items: [
      { productId: 'prod-01', size: '8', color: 'Lava', quantity: 2 },
      { productId: 'prod-13', size: '9', color: 'Midnight', quantity: 1 },
    ],
    paymentMethod: 'cod',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'J&T Express', trackingNumber: 'JT4401228811PH' },
  },
  {
    id: 'ord-02',
    sequence: 1002,
    daysAgo: 41,
    hour: 14,
    person: JUAN,
    items: [{ productId: 'prod-09', size: '10', color: 'Midnight', quantity: 1 }],
    paymentMethod: 'online',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'LBC', trackingNumber: 'LBC178223390' },
  },
  {
    id: 'ord-03',
    sequence: 1003,
    daysAgo: 38,
    hour: 19,
    person: ANDREA,
    items: [{ productId: 'prod-05', size: '7', color: 'Sand', quantity: 1 }],
    paymentMethod: 'cod',
    status: 'cancelled',
    paymentStatus: 'unpaid',
    cancelledFrom: 'pending_confirmation',
    adminNotes: 'Customer requested cancellation via chat; ordered the wrong size.',
  },
  {
    id: 'ord-04',
    sequence: 1004,
    daysAgo: 35,
    hour: 9,
    person: PAOLO,
    items: [
      { productId: 'prod-11', size: '10', color: 'Lava', quantity: 1 },
      { productId: 'prod-18', size: '10', color: 'Lava', quantity: 1 },
    ],
    paymentMethod: 'cod',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'Ninja Van', trackingNumber: 'NVPH2203398871' },
    customerNote: 'Gift, please remove price tags.',
  },
  {
    id: 'ord-05',
    sequence: 1005,
    daysAgo: 31,
    hour: 21,
    person: MARIA,
    items: [{ productId: 'prod-11', size: '7', color: 'Lava', quantity: 1 }],
    paymentMethod: 'online',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'J&T Express', trackingNumber: 'JT4401556720PH' },
  },
  {
    id: 'ord-06',
    sequence: 1006,
    daysAgo: 28,
    hour: 12,
    person: CHRISTINE,
    items: [{ productId: 'prod-07', size: '8', color: 'Midnight', quantity: 1 }],
    paymentMethod: 'online',
    status: 'cancelled',
    paymentStatus: 'failed',
    cancelledFrom: 'pending_payment',
    adminNotes: 'Payment session expired after 24h.',
  },
  {
    id: 'ord-07',
    sequence: 1007,
    daysAgo: 24,
    hour: 16,
    person: MIGUEL,
    items: [{ productId: 'prod-02', size: '10', color: 'Ice', quantity: 3 }],
    paymentMethod: 'cod',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'LBC', trackingNumber: 'LBC178990114' },
  },
  {
    id: 'ord-08',
    sequence: 1008,
    daysAgo: 20,
    hour: 11,
    person: KRISTEL,
    items: [
      { productId: 'prod-15', size: '7', color: 'Sand', quantity: 1 },
      { productId: 'prod-03', size: '7', color: 'Midnight', quantity: 1 },
    ],
    paymentMethod: 'online',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'J&T Express', trackingNumber: 'JT4402013377PH' },
  },
  {
    id: 'ord-09',
    sequence: 1009,
    daysAgo: 16,
    hour: 18,
    person: MARIA,
    items: [{ productId: 'prod-12', size: '9', color: 'Bone', quantity: 1 }],
    paymentMethod: 'cod',
    status: 'delivered',
    paymentStatus: 'paid',
    tracking: { courier: 'Ninja Van', trackingNumber: 'NVPH2204110092' },
  },
  {
    id: 'ord-10',
    sequence: 1010,
    daysAgo: 12,
    hour: 13,
    person: RAMON,
    items: [{ productId: 'prod-14', size: '9', color: 'Charcoal', quantity: 1 }],
    paymentMethod: 'online',
    status: 'cancelled',
    paymentStatus: 'refunded',
    cancelledFrom: 'confirmed',
    adminNotes: 'Pair damaged in the stockroom. Full refund issued via PayMongo.',
  },
  {
    id: 'ord-11',
    sequence: 1011,
    daysAgo: 9,
    hour: 8,
    person: BIANCA,
    items: [
      { productId: 'prod-10', size: '8', color: 'Midnight', quantity: 1 },
      { productId: 'prod-01', size: '7', color: 'Ice', quantity: 1 },
    ],
    paymentMethod: 'cod',
    status: 'shipped',
    paymentStatus: 'unpaid',
    tracking: { courier: 'J&T Express', trackingNumber: 'JT4402388105PH' },
  },
  {
    id: 'ord-12',
    sequence: 1012,
    daysAgo: 7,
    hour: 20,
    person: JUAN,
    items: [{ productId: 'prod-06', size: '8', color: 'Sage', quantity: 2 }],
    paymentMethod: 'online',
    status: 'shipped',
    paymentStatus: 'paid',
    tracking: { courier: 'LBC', trackingNumber: 'LBC179455021' },
  },
  {
    id: 'ord-13',
    sequence: 1013,
    daysAgo: 5,
    hour: 15,
    person: ANDREA,
    items: [{ productId: 'prod-23', size: '6', color: 'Forest', quantity: 1 }],
    paymentMethod: 'cod',
    status: 'processing',
    paymentStatus: 'unpaid',
  },
  {
    id: 'ord-14',
    sequence: 1014,
    daysAgo: 4,
    hour: 10,
    person: MARIA,
    items: [{ productId: 'prod-15', size: '8', color: 'Sand', quantity: 1 }],
    paymentMethod: 'online',
    status: 'processing',
    paymentStatus: 'paid',
  },
  {
    id: 'ord-15',
    sequence: 1015,
    daysAgo: 3,
    hour: 17,
    person: PAOLO,
    items: [
      { productId: 'prod-20', size: '10', color: 'Charcoal', quantity: 1 },
      { productId: 'prod-04', size: '10', color: 'Forest', quantity: 1 },
    ],
    paymentMethod: 'cod',
    status: 'confirmed',
    paymentStatus: 'unpaid',
  },
  {
    id: 'ord-16',
    sequence: 1016,
    daysAgo: 2,
    hour: 9,
    person: CHRISTINE,
    items: [{ productId: 'prod-09', size: '8', color: 'Bone', quantity: 1 }],
    paymentMethod: 'online',
    status: 'pending_confirmation',
    paymentStatus: 'paid',
  },
  {
    id: 'ord-17',
    sequence: 1017,
    daysAgo: 1,
    hour: 19,
    person: MARIA,
    items: [
      { productId: 'prod-18', size: '8', color: 'Ice', quantity: 1 },
      { productId: 'prod-01', size: '9', color: 'Lava', quantity: 1 },
    ],
    paymentMethod: 'cod',
    status: 'pending_confirmation',
    paymentStatus: 'unpaid',
    customerNote: 'Please deliver after 6pm.',
  },
  {
    id: 'ord-18',
    sequence: 1018,
    daysAgo: 0,
    hour: 8,
    person: MIGUEL,
    items: [{ productId: 'prod-09', size: '9', color: 'Lava', quantity: 1 }],
    paymentMethod: 'online',
    status: 'pending_payment',
    paymentStatus: 'pending',
  },
]

export const SEED_ORDERS: Order[] = SPECS.map(buildOrder)
