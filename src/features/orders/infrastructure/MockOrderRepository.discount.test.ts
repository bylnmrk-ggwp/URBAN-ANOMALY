import { describe, expect, it } from 'vitest'

import { isAppError } from '@/lib/errors'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import { SEED_CLOG_ID, SEED_CLOG_IN_STOCK_VARIANT_ID } from '@/tests/fixtures'

import type { PlaceOrderInput } from '../domain/entities'

function input(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    customer: { fullName: 'Juan Dela Cruz', email: 'juan@example.com', phone: '09171234567' },
    shippingAddress: {
      addressLine: '12 Kalayaan Avenue',
      barangay: 'Poblacion',
      city: 'Makati City',
      province: 'Metro Manila',
      postalCode: '1210',
      deliveryInstructions: '',
    },
    paymentMethod: 'cod',
    items: [{ productId: SEED_CLOG_ID, variantId: SEED_CLOG_IN_STOCK_VARIANT_ID, quantity: 2 }],
    customerNote: '',
    ...overrides,
  }
}

describe('MockOrderRepository discount application', () => {
  it('applies a valid code, stores the discount and increments usedCount', async () => {
    const { repositories, store } = createMockRepositoriesForTest()
    const before = store.discounts.find((d) => d.code === 'WELCOME10')?.usedCount ?? 0

    const { order } = await repositories.orders.placeOrder(input({ discountCode: 'welcome10' }))

    expect(order.subtotal).toBe(2380)
    expect(order.shippingFee).toBe(150)
    expect(order.discount).toBe(238)
    expect(order.total).toBe(2292)
    expect(store.discounts.find((d) => d.code === 'WELCOME10')?.usedCount).toBe(before + 1)
  })

  it('rejects ineligible codes before creating the order', async () => {
    const { repositories, store } = createMockRepositoriesForTest()
    const ordersBefore = store.orders.length

    await expect(
      repositories.orders.placeOrder(input({ discountCode: 'SUMMER500' })),
    ).rejects.toSatisfy(
      (e: unknown) => isAppError(e) && e.code === 'validation' && /minimum order/.test(e.message),
    )
    await expect(repositories.orders.placeOrder(input({ discountCode: 'NOPE' }))).rejects.toSatisfy(
      (e: unknown) => isAppError(e) && e.code === 'validation' && /not valid/.test(e.message),
    )
    expect(store.orders).toHaveLength(ordersBefore)
  })

  it('places a plain order with zero discount when no code is given', async () => {
    const { repositories } = createMockRepositoriesForTest()
    const { order } = await repositories.orders.placeOrder(input())
    expect(order.discount).toBe(0)
    expect(order.total).toBe(2530)
  })
})
