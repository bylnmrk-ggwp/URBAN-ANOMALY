import { describe, expect, it } from 'vitest'

import { isAppError } from '@/lib/errors'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import {
  SEED_CLOG_ID,
  SEED_CLOG_IN_STOCK_VARIANT_ID,
  SEED_PENDING_COD_ORDER_ID,
  SEED_PENDING_GCASH_ORDER_ID,
  makeFakeEmailClient,
} from '@/tests/fixtures'

import type { PlaceOrderInput } from '../domain/entities'

// Distinct from the seeded pending GCash order's reference: one receipt pays one live order.
const REFERENCE = '5566778899001'

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
    paymentMethod: 'gcash',
    paymentReference: REFERENCE,
    items: [{ productId: SEED_CLOG_ID, variantId: SEED_CLOG_IN_STOCK_VARIANT_ID, quantity: 1 }],
    customerNote: '',
    ...overrides,
  }
}

describe('MockOrderRepository GCash checkout', () => {
  it('stores the trimmed reference and starts at pending confirmation / pending', async () => {
    const { repositories, store } = createMockRepositoriesForTest()

    const { order, paymentRedirectUrl } = await repositories.orders.placeOrder(
      input({ paymentReference: `  ${REFERENCE}  ` }),
    )

    expect(order).toMatchObject({
      paymentMethod: 'gcash',
      paymentReference: REFERENCE,
      status: 'pending_confirmation',
      paymentStatus: 'pending',
    })
    expect(order.statusHistory[0]?.note).toBe('Order placed, GCash payment awaiting verification.')
    // No provider handoff: the buyer already paid through the QR.
    expect(paymentRedirectUrl).toBeNull()
    expect(store.findOrder(order.id)?.paymentReference).toBe(REFERENCE)
  })

  it('rejects a missing or malformed reference', async () => {
    const { repositories, store } = createMockRepositoriesForTest()
    const before = store.orders.length

    for (const paymentReference of [undefined, '', '1234567', '1234 5678 90', 'x'.repeat(21)]) {
      await expect(repositories.orders.placeOrder(input({ paymentReference }))).rejects.toSatisfy(
        (error) => isAppError(error) && error.code === 'validation',
      )
    }
    expect(store.orders).toHaveLength(before)
  })

  it('rejects GCash while the store has it switched off or has no QR', async () => {
    const { repositories, store } = createMockRepositoriesForTest()

    store.settings.gcashEnabled = false
    await expect(repositories.orders.placeOrder(input())).rejects.toThrow(
      'GCash is currently unavailable.',
    )

    store.settings.gcashEnabled = true
    store.settings.gcashQrUrl = null
    await expect(repositories.orders.placeOrder(input())).rejects.toThrow(
      'GCash is currently unavailable.',
    )
  })

  it('refuses a reference that already paid another live order', async () => {
    const { repositories, store } = createMockRepositoriesForTest()
    const { order: first } = await repositories.orders.placeOrder(
      input({ paymentReference: 'AbC12345xYz' }),
    )
    const before = store.orders.length

    // Case-insensitive: receipts print letters in upper case, buyers type them either way.
    await expect(
      repositories.orders.placeOrder(input({ paymentReference: 'abc12345XYZ' })),
    ).rejects.toThrow('This GCash reference number has already been used.')
    // The seeded pending GCash order holds its reference too.
    await expect(
      repositories.orders.placeOrder(
        input({
          paymentReference: store.findOrder(SEED_PENDING_GCASH_ORDER_ID)?.paymentReference ?? '',
        }),
      ),
    ).rejects.toThrow('This GCash reference number has already been used.')
    expect(store.orders).toHaveLength(before)

    // A cancelled order releases its reference.
    await repositories.orders.updateOrderStatus(first.id, 'cancelled', 'Wrong amount.')
    const { order: second } = await repositories.orders.placeOrder(
      input({ paymentReference: 'ABC12345XYZ' }),
    )
    expect(second.paymentReference).toBe('ABC12345XYZ')
  })

  it('never keeps a reference for other payment methods', async () => {
    const { repositories } = createMockRepositoriesForTest()

    const { order } = await repositories.orders.placeOrder(
      input({ paymentMethod: 'cod', paymentReference: REFERENCE }),
    )

    expect(order.paymentReference).toBeNull()
    expect(order.paymentStatus).toBe('unpaid')
  })

  it('passes the reference to the admin alert email', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories } = createMockRepositoriesForTest({ emailClient })

    await repositories.orders.placeOrder(input())

    expect(emailClient.sent[0]?.params).toMatchObject({
      payment_method: 'GCash',
      payment_reference: REFERENCE,
    })
  })
})

describe('MockOrderRepository GCash verification', () => {
  it('blocks confirmation until an admin marks the payment verified', async () => {
    const { repositories, store } = createMockRepositoriesForTest()

    await expect(
      repositories.orders.updateOrderStatus(SEED_PENDING_GCASH_ORDER_ID, 'confirmed'),
    ).rejects.toThrow('Prepaid orders can only be confirmed once payment is received.')

    const verified = await repositories.orders.markGcashPaymentVerified(SEED_PENDING_GCASH_ORDER_ID)
    expect(verified.paymentStatus).toBe('paid')
    expect(verified.status).toBe('pending_confirmation')
    expect(verified.statusHistory.at(-1)).toMatchObject({
      status: 'pending_confirmation',
      actor: 'admin',
      note: `GCash payment verified (ref. ${verified.paymentReference}).`,
    })
    expect(store.notifications[0]).toMatchObject({
      type: 'payment_confirmed',
      href: `/admin/orders/${SEED_PENDING_GCASH_ORDER_ID}`,
    })

    const confirmed = await repositories.orders.updateOrderStatus(
      SEED_PENDING_GCASH_ORDER_ID,
      'confirmed',
    )
    expect(confirmed.status).toBe('confirmed')
  })

  it('refuses to verify non-GCash orders or payments that are not pending', async () => {
    const { repositories } = createMockRepositoriesForTest()

    await expect(
      repositories.orders.markGcashPaymentVerified(SEED_PENDING_COD_ORDER_ID),
    ).rejects.toSatisfy((error) => isAppError(error) && error.code === 'validation')

    await repositories.orders.markGcashPaymentVerified(SEED_PENDING_GCASH_ORDER_ID)
    await expect(
      repositories.orders.markGcashPaymentVerified(SEED_PENDING_GCASH_ORDER_ID),
    ).rejects.toSatisfy((error) => isAppError(error) && error.code === 'validation')
  })

  it('fails an unverified payment on cancellation and flags refunds once verified', async () => {
    const { repositories } = createMockRepositoriesForTest()

    const unverified = await repositories.orders.updateOrderStatus(
      SEED_PENDING_GCASH_ORDER_ID,
      'cancelled',
      'Reference not found.',
    )
    expect(unverified.paymentStatus).toBe('failed')

    const { order } = await repositories.orders.placeOrder(input())
    await repositories.orders.markGcashPaymentVerified(order.id)
    const refunded = await repositories.orders.updateOrderStatus(order.id, 'cancelled', 'Oops.')
    expect(refunded.paymentStatus).toBe('refund_pending')
  })
})
