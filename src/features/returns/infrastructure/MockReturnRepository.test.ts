import { beforeEach, describe, expect, it } from 'vitest'

import type { Repositories } from '@/config/repositories'
import type { Order } from '@/features/orders/domain/entities'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import type { MockStore } from '@/mocks/MockStore'

const BUYER = { email: 'buyer@demo.local', password: 'password' }
const ADMIN = { email: 'admin@demo.local', password: 'password' }

/** Maria's delivered seed order with no seeded return request. */
const MARIA_OLD_DELIVERED = 'ord-05'

function markDeliveredNow(order: Order) {
  const event = order.statusHistory.find((e) => e.status === 'delivered')
  if (!event) throw new Error('order has no delivered event')
  event.createdAt = new Date().toISOString()
}

describe('MockReturnRepository', () => {
  let repositories: Repositories
  let store: MockStore

  beforeEach(() => {
    window.sessionStorage.clear()
    ;({ repositories, store } = createMockRepositoriesForTest())
  })

  it('seeds three requests on delivered orders and settles the refunded one', () => {
    expect(store.returns.map((r) => r.status).sort()).toEqual(['approved', 'refunded', 'requested'])
    for (const request of store.returns) {
      expect(store.findOrder(request.orderId)?.status).toBe('delivered')
    }
    const refunded = store.returns.find((r) => r.status === 'refunded')
    const order = refunded && store.findOrder(refunded.orderId)
    expect(order?.paymentStatus).toMatch(/refunded/)
  })

  it('requires a session and only accepts the buyer’s own delivered orders', async () => {
    const input = {
      orderId: MARIA_OLD_DELIVERED,
      items: [{ orderItemId: `${MARIA_OLD_DELIVERED}-item-1`, quantity: 1 }],
      reason: 'wrong_size' as const,
      resolution: 'refund' as const,
      note: '',
    }
    await expect(repositories.returns.request(input)).rejects.toMatchObject({
      code: 'unauthorized',
    })

    await repositories.auth.signIn(BUYER)
    // ord-02 belongs to another customer.
    await expect(
      repositories.returns.request({
        ...input,
        orderId: 'ord-02',
        items: [{ orderItemId: 'ord-02-item-1', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'not_found' })
    // ord-14 is hers but still processing.
    await expect(
      repositories.returns.request({
        ...input,
        orderId: 'ord-14',
        items: [{ orderItemId: 'ord-14-item-1', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'validation', message: /delivered/ })
  })

  it('enforces the return window, quantity cap and one open request per order', async () => {
    await repositories.auth.signIn(BUYER)
    const order = store.findOrder(MARIA_OLD_DELIVERED)
    if (!order) throw new Error('seed order missing')
    const item = order.items[0]
    if (!item) throw new Error('seed item missing')
    const base = {
      orderId: order.id,
      reason: 'changed_mind' as const,
      resolution: 'refund' as const,
      note: 'No longer needed.',
    }

    // Delivered 31 days ago in the seed: outside the 14-day window.
    await expect(
      repositories.returns.request({ ...base, items: [{ orderItemId: item.id, quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'validation', message: /14 days/ })

    markDeliveredNow(order)
    await expect(
      repositories.returns.request({
        ...base,
        items: [{ orderItemId: item.id, quantity: item.quantity + 1 }],
      }),
    ).rejects.toMatchObject({ code: 'validation', message: /at most/ })
    await expect(
      repositories.returns.request({ ...base, items: [{ orderItemId: 'nope', quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(repositories.returns.request({ ...base, items: [] })).rejects.toMatchObject({
      code: 'validation',
    })

    const created = await repositories.returns.request({
      ...base,
      items: [{ orderItemId: item.id, quantity: item.quantity }],
    })
    expect(created).toMatchObject({
      status: 'requested',
      orderNumber: order.orderNumber,
      customerEmail: 'buyer@demo.local',
      refundAmount: item.unitPrice * item.quantity,
    })
    expect(await repositories.returns.getForOrder(order.id)).toMatchObject({ id: created.id })

    await expect(
      repositories.returns.request({ ...base, items: [{ orderItemId: item.id, quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('hides other customers’ requests from buyers', async () => {
    await repositories.auth.signIn(BUYER)
    expect(await repositories.returns.getForOrder('ord-09')).toMatchObject({ id: 'ret-01' })
    expect(await repositories.returns.getForOrder('ord-08')).toBeNull()
    await repositories.auth.signIn(ADMIN)
    expect(await repositories.returns.getForOrder('ord-08')).toMatchObject({ id: 'ret-02' })
  })

  it('follows RETURN_STATUS_TRANSITIONS and is admin-only', async () => {
    await repositories.auth.signIn(BUYER)
    await expect(repositories.returns.updateStatus('ret-01', 'approved', '')).rejects.toMatchObject(
      { code: 'forbidden' },
    )

    await repositories.auth.signIn(ADMIN)
    await expect(repositories.returns.updateStatus('ret-01', 'refunded', '')).rejects.toMatchObject(
      { code: 'validation' },
    )
    const approved = await repositories.returns.updateStatus('ret-01', 'approved', 'Ship it back.')
    expect(approved).toMatchObject({ status: 'approved', adminNote: 'Ship it back.' })
    await expect(
      repositories.returns.updateStatus('ret-01', 'requested', ''),
    ).rejects.toMatchObject({ code: 'validation' })
    const rejected = await repositories.returns.updateStatus('ret-01', 'rejected', 'Worn.')
    expect(rejected.status).toBe('rejected')
    await expect(repositories.returns.updateStatus('ret-01', 'approved', '')).rejects.toMatchObject(
      { code: 'validation' },
    )
    expect(await repositories.returns.listAdmin('rejected')).toHaveLength(1)
    expect(await repositories.returns.listAdmin()).toHaveLength(3)
  })

  it('settles the order payment and appends a history note when refunded', async () => {
    await repositories.auth.signIn(ADMIN)
    const order = store.findOrder('ord-08')
    if (!order) throw new Error('seed order missing')
    const historyLength = order.statusHistory.length
    expect(order.paymentStatus).toBe('paid')

    // ret-02 is approved and returns one of two items, so the refund is partial.
    await repositories.returns.updateStatus('ret-02', 'received', '')
    const refunded = await repositories.returns.updateStatus('ret-02', 'refunded', 'Done.')
    expect(refunded.status).toBe('refunded')
    expect(refunded.refundAmount).toBeLessThan(order.total)
    expect(order.paymentStatus).toBe('partially_refunded')
    expect(order.status).toBe('delivered')
    expect(order.statusHistory).toHaveLength(historyLength + 1)
    expect(order.statusHistory.at(-1)).toMatchObject({ status: 'delivered', actor: 'admin' })
    expect(order.statusHistory.at(-1)?.note).toMatch(/Refund of/)
  })
})
