import { describe, expect, it } from 'vitest'

import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import {
  SEED_CLOG_ID,
  SEED_CLOG_IN_STOCK_VARIANT_ID,
  SEED_PENDING_COD_ORDER_ID,
  makeFakeEmailClient,
} from '@/tests/fixtures'

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
    items: [{ productId: SEED_CLOG_ID, variantId: SEED_CLOG_IN_STOCK_VARIANT_ID, quantity: 1 }],
    customerNote: 'Please ring the doorbell.',
    ...overrides,
  }
}

describe('order emails on checkout', () => {
  it('emails the store admin and keeps the in-app new_order notification', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })

    const { order } = await repositories.orders.placeOrder(input())

    expect(emailClient.sent).toHaveLength(1)
    const [message] = emailClient.sent
    expect(message?.template).toBe('new_order')
    expect(message?.to).toBe(store.settings.contactEmail)
    expect(message?.subject).toContain(order.orderNumber)
    expect(message?.params).toMatchObject({
      order_number: order.orderNumber,
      customer_name: 'Juan Dela Cruz',
      customer_email: 'juan@example.com',
      payment_method: 'Cash on Delivery',
      item_count: '1',
      customer_note: 'Please ring the doorbell.',
    })
    expect(message?.params.items).toContain('Lava Premium Clog')

    expect(store.notifications[0]).toMatchObject({
      type: 'new_order',
      href: `/admin/orders/${order.id}`,
    })
  })

  it('still places the order and notifies in-app when EmailJS is not configured', async () => {
    const emailClient = makeFakeEmailClient('not_configured')
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })
    const notificationsBefore = store.notifications.length

    const { order } = await repositories.orders.placeOrder(input())

    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/)
    expect(store.orders[0]?.id).toBe(order.id)
    expect(store.notifications).toHaveLength(notificationsBefore + 1)
    expect(store.notifications[0]?.type).toBe('new_order')
  })

  it('does not break checkout when the email transport fails', async () => {
    const emailClient = makeFakeEmailClient('failed')
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })

    const { order } = await repositories.orders.placeOrder(input())

    expect(store.findOrder(order.id)).toBeDefined()
    expect(emailClient.sent).toHaveLength(1)
  })

  it('skips the admin email when "New orders" is turned off in Store Settings', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })
    store.settings.notifyNewOrders = false

    const { order } = await repositories.orders.placeOrder(input())

    expect(emailClient.sent).toHaveLength(0)
    // The in-app notification is independent of the email toggle.
    expect(store.notifications[0]).toMatchObject({ type: 'new_order' })
    expect(store.findOrder(order.id)).toBeDefined()
  })
})

describe('order emails on an admin status change', () => {
  it('emails the customer and records an order_update notification', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })

    const order = await repositories.orders.updateOrderStatus(
      SEED_PENDING_COD_ORDER_ID,
      'confirmed',
      'Stock reserved.',
    )

    expect(emailClient.sent).toHaveLength(1)
    const [message] = emailClient.sent
    expect(message?.template).toBe('order_update')
    expect(message?.to).toBe(order.customer.email)
    expect(message?.subject).toContain('Confirmed')
    expect(message?.params).toMatchObject({
      order_number: order.orderNumber,
      order_status: 'Confirmed',
      status_note: 'Stock reserved.',
    })

    expect(store.notifications[0]).toMatchObject({
      type: 'order_update',
      title: `Order ${order.orderNumber} updated`,
      href: `/admin/orders/${order.id}`,
    })
    expect(store.notifications[0]?.message).toContain(order.customer.email)
  })

  it('records the notification without an email when EmailJS is not configured', async () => {
    const emailClient = makeFakeEmailClient('not_configured')
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })

    const order = await repositories.orders.updateOrderStatus(
      SEED_PENDING_COD_ORDER_ID,
      'confirmed',
    )

    expect(order.status).toBe('confirmed')
    expect(store.notifications[0]).toMatchObject({ type: 'order_update' })
    expect(store.notifications[0]?.message).toContain('email notifications are not configured')
  })

  it('still applies the status change when the email transport fails', async () => {
    const emailClient = makeFakeEmailClient('failed')
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })

    const order = await repositories.orders.updateOrderStatus(
      SEED_PENDING_COD_ORDER_ID,
      'confirmed',
    )

    expect(order.status).toBe('confirmed')
    expect(store.findOrder(order.id)?.status).toBe('confirmed')
    expect(store.notifications[0]?.message).toContain('Fake transport failure')
  })

  it('follows notifyPaymentEvents for a transition that also confirms payment', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })
    store.settings.notifyPaymentEvents = false
    // ord-18 is the seeded online order still awaiting payment.
    const onlineOrderId = 'ord-18'

    const order = await repositories.orders.updateOrderStatus(onlineOrderId, 'pending_confirmation')

    expect(order.paymentStatus).toBe('paid')
    expect(emailClient.sent).toHaveLength(0)
    expect(store.notifications[0]?.message).toContain(
      'customer emails are turned off in Store Settings',
    )
  })

  it('emails fulfilment updates even when payment events are muted', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories, store } = createMockRepositoriesForTest({ emailClient })
    store.settings.notifyPaymentEvents = false

    await repositories.orders.updateOrderStatus(SEED_PENDING_COD_ORDER_ID, 'confirmed')

    expect(emailClient.sent).toHaveLength(1)
    expect(emailClient.sent[0]?.template).toBe('order_update')
  })

  it('sends nothing for an invalid transition', async () => {
    const emailClient = makeFakeEmailClient()
    const { repositories } = createMockRepositoriesForTest({ emailClient })

    await expect(
      repositories.orders.updateOrderStatus(SEED_PENDING_COD_ORDER_ID, 'delivered'),
    ).rejects.toThrow()
    expect(emailClient.sent).toHaveLength(0)
  })
})
