import { calculateShippingFee, round2 } from '@/features/cart/domain/rules'
import type { DiscountCode } from '@/features/discounts/domain/entities'
import {
  computeDiscountAmount,
  discountIneligibleReason,
} from '@/features/discounts/domain/entities'
import type { InventoryMovement } from '@/features/inventory/domain/entities'
import type { ProductVariant } from '@/features/products/domain/entities'
import { availableStock, getDisplayPrice, getPrimaryImage } from '@/features/products/domain/rules'
import { AppError } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import type { MockStore } from '@/mocks/MockStore'
import { byNewest, clone, matchesSearch, nowIso, toOrderSummary } from '@/mocks/helpers'
import type { PaginatedResult } from '@/types/common'
import { paginate } from '@/types/common'

import type {
  AdminOrderFilters,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  OrderSummary,
  OrderTracking,
  PlaceOrderInput,
  PlaceOrderResult,
} from '../domain/entities'
import type { OrderRepository } from '../domain/repository'
import {
  PAYMENT_METHOD_LABELS,
  canCustomerCancel,
  canTransition,
  generateOrderNumber,
  initialPaymentStatusFor,
  initialStatusFor,
} from '../domain/rules'

const ADMIN_PAGE_SIZE = 20
const OUT_OF_STOCK_MESSAGE = 'Some items are no longer available in the requested quantity.'

export class MockOrderRepository implements OrderRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    await this.store.delay()
    if (input.items.length === 0) throw new AppError('validation', 'Your shopping cart is empty.')

    // Guard against the same variant appearing twice in the cart.
    const requested = new Map<string, number>()
    for (const line of input.items) {
      requested.set(line.variantId, (requested.get(line.variantId) ?? 0) + line.quantity)
    }

    const resolved = input.items.map((line) => {
      const product = this.store.findProduct(line.productId)
      if (!product || product.status !== 'published') {
        throw new AppError('out_of_stock', OUT_OF_STOCK_MESSAGE)
      }
      const variant = product.variants.find((v) => v.id === line.variantId)
      if (!variant) throw new AppError('out_of_stock', OUT_OF_STOCK_MESSAGE)
      const wanted = requested.get(line.variantId) ?? line.quantity
      if (line.quantity < 1 || wanted > availableStock(variant)) {
        throw new AppError('out_of_stock', OUT_OF_STOCK_MESSAGE)
      }
      return { product, variant, quantity: line.quantity }
    })

    const id = this.store.nextId('ord')
    const now = nowIso()
    const items: OrderItem[] = resolved.map(({ product, variant, quantity }, index) => {
      const unitPrice = getDisplayPrice(product)
      return {
        id: `${id}-item-${index + 1}`,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: getPrimaryImage(product)?.url ?? null,
        sku: variant.sku,
        size: variant.size,
        colorName: variant.color.name,
        unitPrice,
        quantity,
        lineTotal: round2(unitPrice * quantity),
      }
    })

    const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0))
    const shippingFee = calculateShippingFee(subtotal)
    const discountCode = this.resolveDiscount(input.discountCode, subtotal)
    const discount = discountCode ? computeDiscountAmount(discountCode, subtotal) : 0
    const status = initialStatusFor(input.paymentMethod)
    const orderNumber = generateOrderNumber(this.store.nextOrderSequence())

    const order: Order = {
      id,
      orderNumber,
      customer: { ...input.customer, userId: this.store.currentSession?.user.id ?? null },
      shippingAddress: { ...input.shippingAddress },
      items,
      subtotal,
      shippingFee,
      discount,
      total: round2(subtotal + shippingFee - discount),
      paymentMethod: input.paymentMethod,
      paymentStatus: initialPaymentStatusFor(input.paymentMethod),
      status,
      statusHistory: [
        {
          id: this.store.nextId('evt'),
          status,
          note:
            input.paymentMethod === 'online'
              ? 'Order placed, awaiting online payment.'
              : 'Order received.',
          actor: 'system',
          createdAt: now,
        },
      ],
      tracking: null,
      customerNote: input.customerNote,
      adminNotes: '',
      createdAt: now,
      updatedAt: now,
    }

    for (const { product, variant, quantity } of resolved) {
      variant.reservedStock += quantity
      this.recordMovement(
        product.name,
        variant,
        -quantity,
        'order_reserved',
        'Reserved at checkout.',
        orderNumber,
      )
    }
    if (discountCode) discountCode.usedCount += 1

    this.store.orders.unshift(order)
    this.store.pushNotification({
      type: 'new_order',
      title: `New order ${orderNumber}`,
      message: `${order.customer.fullName} placed a ${PAYMENT_METHOD_LABELS[input.paymentMethod]} order for ${pluralize(
        items.reduce((sum, i) => sum + i.quantity, 0),
        'item',
      )}.`,
      href: `/admin/orders/${order.id}`,
    })

    return {
      order: clone(order),
      // Simulated payment-provider handoff. The confirmation page shows an
      // "awaiting payment" state; nothing marks the order paid in mock mode.
      paymentRedirectUrl:
        input.paymentMethod === 'online'
          ? `/orders/confirmation/${orderNumber}?payment=pending`
          : null,
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    await this.store.delay()
    const order = this.store.orders.find((o) => o.orderNumber === orderNumber)
    return order ? clone(order) : null
  }

  async trackOrder(orderNumber: string, email: string): Promise<Order | null> {
    await this.store.delay()
    const number = orderNumber.trim().toUpperCase()
    const needle = email.trim().toLowerCase()
    if (!number || !needle) return null
    const order = this.store.orders.find(
      (o) => o.orderNumber.toUpperCase() === number && o.customer.email.toLowerCase() === needle,
    )
    return order ? clone(order) : null
  }

  async getMyOrders(): Promise<OrderSummary[]> {
    await this.store.delay()
    const userId = this.requireUserId()
    return this.store.orders
      .filter((o) => o.customer.userId === userId)
      .sort(byNewest)
      .map(toOrderSummary)
  }

  async getMyOrderById(id: string): Promise<Order | null> {
    await this.store.delay()
    const userId = this.requireUserId()
    const order = this.store.orders.find((o) => o.id === id && o.customer.userId === userId)
    return order ? clone(order) : null
  }

  async cancelMyOrder(id: string): Promise<Order> {
    await this.store.delay()
    const userId = this.requireUserId()
    const order = this.store.orders.find((o) => o.id === id && o.customer.userId === userId)
    if (!order) throw AppError.notFound('Order')
    if (!canCustomerCancel(order)) {
      throw new AppError(
        'validation',
        'This order is already being prepared and can no longer be cancelled.',
      )
    }
    this.applyCancellation(order)
    this.appendHistory(order, 'cancelled', 'Cancelled by customer.', 'customer')
    return clone(order)
  }

  async getAdminOrders(filters: AdminOrderFilters): Promise<PaginatedResult<OrderSummary>> {
    await this.store.delay()
    let items = [...this.store.orders]

    if (filters.search) {
      items = items.filter((o) =>
        matchesSearch(filters.search, o.orderNumber, o.customer.fullName, o.customer.email),
      )
    }
    if (filters.status && filters.status !== 'all') {
      const status = filters.status
      items = items.filter((o) => o.status === status)
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      const paymentStatus = filters.paymentStatus
      items = items.filter((o) => o.paymentStatus === paymentStatus)
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime()
      items = items.filter((o) => new Date(o.createdAt).getTime() >= from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      // A date-only bound (YYYY-MM-DD) means "through the end of that day".
      if (filters.dateTo.length <= 10) to.setHours(23, 59, 59, 999)
      items = items.filter((o) => new Date(o.createdAt).getTime() <= to.getTime())
    }

    items.sort(byNewest)
    return paginate(
      items.map(toOrderSummary),
      filters.page ?? 1,
      filters.pageSize ?? ADMIN_PAGE_SIZE,
    )
  }

  async getAdminOrderById(id: string): Promise<Order | null> {
    await this.store.delay()
    const order = this.store.findOrder(id)
    return order ? clone(order) : null
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    await this.store.delay()
    const order = this.requireOrder(id)
    if (!canTransition(order.status, status)) {
      throw new AppError('validation', 'Invalid status transition.')
    }
    if (
      status === 'confirmed' &&
      order.paymentMethod === 'online' &&
      order.paymentStatus !== 'paid'
    ) {
      throw new AppError(
        'validation',
        'Online orders can only be confirmed once payment is received.',
      )
    }

    if (status === 'pending_confirmation' && order.paymentMethod === 'online') {
      // Stands in for the payment webhook in mock mode.
      order.paymentStatus = 'paid'
      this.store.pushNotification({
        type: 'payment_confirmed',
        title: `Payment received for ${order.orderNumber}`,
        message: `Online payment of PHP ${order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })} confirmed for ${order.customer.fullName}.`,
        href: `/admin/orders/${order.id}`,
      })
    }
    if (status === 'shipped') this.applyFulfillment(order)
    if (status === 'cancelled') this.applyCancellation(order)
    // `delivered` leaves paymentStatus untouched: COD cash collection is recorded separately.

    this.appendHistory(order, status, note?.trim() || null, 'admin')
    return clone(order)
  }

  async setTracking(id: string, tracking: OrderTracking): Promise<Order> {
    await this.store.delay()
    const order = this.requireOrder(id)
    order.tracking = {
      courier: tracking.courier.trim(),
      trackingNumber: tracking.trackingNumber.trim(),
    }
    order.updatedAt = nowIso()
    return clone(order)
  }

  async markCodPaymentCollected(id: string): Promise<Order> {
    await this.store.delay()
    const order = this.requireOrder(id)
    if (
      order.paymentMethod !== 'cod' ||
      (order.status !== 'shipped' && order.status !== 'delivered')
    ) {
      throw new AppError(
        'validation',
        'Cash collection can only be recorded for COD orders that have shipped or been delivered.',
      )
    }
    order.paymentStatus = 'paid'
    order.updatedAt = nowIso()
    return clone(order)
  }

  async updateAdminNotes(id: string, notes: string): Promise<Order> {
    await this.store.delay()
    const order = this.requireOrder(id)
    order.adminNotes = notes
    order.updatedAt = nowIso()
    return clone(order)
  }

  private requireUserId(): string {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    return session.user.id
  }

  /** Looks up and re-validates the checkout discount against the final subtotal. */
  private resolveDiscount(code: string | undefined, subtotal: number): DiscountCode | null {
    const normalized = code?.trim().toUpperCase()
    if (!normalized) return null
    const found = this.store.discounts.find((d) => d.code === normalized)
    if (!found) throw new AppError('validation', 'That code is not valid.')
    const reason = discountIneligibleReason(found, subtotal)
    if (reason) throw new AppError('validation', reason)
    return found
  }

  private requireOrder(id: string): Order {
    const order = this.store.findOrder(id)
    if (!order) throw AppError.notFound('Order')
    return order
  }

  private appendHistory(
    order: Order,
    status: OrderStatus,
    note: string | null,
    actor: OrderStatusEvent['actor'],
  ) {
    const now = nowIso()
    order.status = status
    order.updatedAt = now
    order.statusHistory.push({ id: this.store.nextId('evt'), status, note, actor, createdAt: now })
  }

  /** Converts reservations into physical stock deductions. Runs once, when the order ships. */
  private applyFulfillment(order: Order) {
    for (const item of order.items) {
      const found = this.store.findVariant(item.variantId)
      if (!found) continue
      const { product, variant } = found
      variant.stock = Math.max(0, variant.stock - item.quantity)
      variant.reservedStock = Math.max(0, variant.reservedStock - item.quantity)
      product.salesCount += item.quantity
      product.updatedAt = nowIso()
      this.recordMovement(
        product.name,
        variant,
        -item.quantity,
        'order_fulfilled',
        'Shipped to customer.',
        order.orderNumber,
      )
    }
  }

  /** Releases reservations and settles the payment state for a cancelled order. */
  private applyCancellation(order: Order) {
    for (const item of order.items) {
      const found = this.store.findVariant(item.variantId)
      if (!found) continue
      const { product, variant } = found
      variant.reservedStock = Math.max(0, variant.reservedStock - item.quantity)
      this.recordMovement(
        product.name,
        variant,
        item.quantity,
        'order_released',
        'Released after cancellation.',
        order.orderNumber,
      )
    }
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refund_pending'
    } else if (order.paymentMethod === 'online' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'failed'
    }
  }

  private recordMovement(
    productName: string,
    variant: ProductVariant,
    delta: number,
    reason: InventoryMovement['reason'],
    note: string,
    referenceOrderNumber: string,
  ) {
    this.store.movements.unshift({
      id: this.store.nextId('mov'),
      variantId: variant.id,
      sku: variant.sku,
      productName,
      delta,
      stockAfter: variant.stock,
      reason,
      note,
      actor: 'System',
      referenceOrderNumber,
      createdAt: nowIso(),
    })
  }
}
