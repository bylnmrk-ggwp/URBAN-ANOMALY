import type { Order } from '@/features/orders/domain/entities'
import { AppError } from '@/lib/errors'
import { formatPrice } from '@/lib/format'
import {
  computeRefundAmount,
  deliveredAtOf,
  SEED_RETURNS,
  toReturnItem,
} from '@/mocks/data/returns'
import type { MockStore } from '@/mocks/MockStore'
import { byNewest, clone, nowIso } from '@/mocks/helpers'

import type {
  ReturnRepository,
  ReturnRequest,
  ReturnRequestInput,
  ReturnStatus,
} from '../domain/entities'
import {
  isWithinReturnWindow,
  RETURN_STATUS_TRANSITIONS,
  RETURN_WINDOW_DAYS,
  returnRequestSchema,
} from '../domain/entities'

const CLOSED_STATUSES: ReturnStatus[] = ['rejected', 'refunded']

export function isReturnOpen(request: ReturnRequest): boolean {
  return !CLOSED_STATUSES.includes(request.status)
}

export class MockReturnRepository implements ReturnRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
    if (store.returns.length === 0) {
      store.returns = clone(SEED_RETURNS)
      // Keep seed orders consistent with their refunded returns.
      for (const request of store.returns) {
        if (request.status !== 'refunded') continue
        const order = store.findOrder(request.orderId)
        if (order && order.paymentStatus === 'paid') {
          order.paymentStatus =
            request.refundAmount >= order.total ? 'refunded' : 'partially_refunded'
        }
      }
    }
  }

  async request(input: ReturnRequestInput): Promise<ReturnRequest> {
    await this.store.delay()
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized('Sign in to request a return.')

    const parsed = returnRequestSchema.safeParse(input)
    if (!parsed.success) {
      throw new AppError('validation', parsed.error.issues[0]?.message ?? 'Check your request.')
    }

    const order = this.store.findOrder(input.orderId)
    if (!order || order.customer.userId !== session.user.id) throw AppError.notFound('Order')
    if (order.status !== 'delivered') {
      throw new AppError('validation', 'Only delivered orders can be returned.')
    }
    const deliveredAt = deliveredAtOf(order) ?? order.updatedAt
    if (!isWithinReturnWindow(deliveredAt)) {
      throw new AppError(
        'validation',
        `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      )
    }
    if (this.store.returns.some((r) => r.orderId === order.id && isReturnOpen(r))) {
      throw new AppError('conflict', 'A return request is already open for this order.')
    }

    const seen = new Set<string>()
    const items = parsed.data.items.map(({ orderItemId, quantity }) => {
      const orderItem = order.items.find((i) => i.id === orderItemId)
      if (!orderItem || seen.has(orderItemId)) {
        throw new AppError('validation', 'One of the selected items is not part of this order.')
      }
      seen.add(orderItemId)
      if (quantity > orderItem.quantity) {
        throw new AppError(
          'validation',
          `You can return at most ${orderItem.quantity} of ${orderItem.productName}.`,
        )
      }
      return toReturnItem(order, orderItemId, quantity)
    })

    const now = nowIso()
    const request: ReturnRequest = {
      id: this.store.nextId('ret'),
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.fullName,
      customerEmail: order.customer.email,
      items,
      reason: parsed.data.reason,
      resolution: parsed.data.resolution,
      note: parsed.data.note,
      status: 'requested',
      adminNote: '',
      refundAmount: computeRefundAmount(items),
      createdAt: now,
      updatedAt: now,
    }
    this.store.returns.unshift(request)
    return clone(request)
  }

  async getForOrder(orderId: string): Promise<ReturnRequest | null> {
    await this.store.delay()
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    const order = this.store.findOrder(orderId)
    if (!order) return null
    if (session.user.role !== 'admin' && order.customer.userId !== session.user.id) return null
    const latest = this.store.returns.filter((r) => r.orderId === orderId).sort(byNewest)[0]
    return latest ? clone(latest) : null
  }

  async listAdmin(status: ReturnStatus | 'all' = 'all'): Promise<ReturnRequest[]> {
    await this.store.delay()
    const items =
      status === 'all'
        ? [...this.store.returns]
        : this.store.returns.filter((r) => r.status === status)
    return items.sort(byNewest).map(clone)
  }

  async updateStatus(id: string, status: ReturnStatus, adminNote: string): Promise<ReturnRequest> {
    await this.store.delay()
    this.requireAdmin()
    const request = this.store.returns.find((r) => r.id === id)
    if (!request) throw AppError.notFound('Return request')
    if (!RETURN_STATUS_TRANSITIONS[request.status].includes(status)) {
      throw new AppError('validation', 'Invalid return status transition.')
    }
    request.status = status
    request.adminNote = adminNote.trim()
    request.updatedAt = nowIso()
    if (status === 'refunded') {
      const order = this.store.findOrder(request.orderId)
      if (order) this.applyRefund(order, request)
    }
    return clone(request)
  }

  /** Settles the order's payment state and leaves a note in its history (status unchanged). */
  private applyRefund(order: Order, request: ReturnRequest) {
    const now = nowIso()
    order.paymentStatus = request.refundAmount >= order.total ? 'refunded' : 'partially_refunded'
    order.updatedAt = now
    order.statusHistory.push({
      id: this.store.nextId('evt'),
      status: order.status,
      note: `Refund of ${formatPrice(request.refundAmount)} issued for return request ${request.id}.`,
      actor: 'admin',
      createdAt: now,
    })
  }

  private requireAdmin() {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    if (session.user.role !== 'admin') throw AppError.forbidden()
  }
}
