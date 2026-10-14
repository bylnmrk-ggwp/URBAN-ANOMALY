/**
 * Outbound order emails.
 *
 * Two flows, each with its own EmailJS template:
 *
 * 1. A customer places an order -> the store admin is emailed (`new_order`),
 *    alongside the in-app `new_order` notification that already existed.
 * 2. An admin changes an order's status -> the customer is emailed
 *    (`order_update`), and an in-app `order_update` notification records what
 *    happened to that mail.
 *
 * Nothing here throws. Every send is reported as data, so a missing EmailJS
 * configuration or a provider outage can never fail a checkout or an admin
 * action; failures only raise a toast.
 */
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import type { StoreSettings } from '@/features/settings/domain/entities'
import { emailClient } from '@/lib/email'
import type { EmailClient, EmailMessage, EmailSendResult } from '@/lib/email/types'
import { emailSkipped } from '@/lib/email/types'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

import type { Order } from '../domain/entities'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../domain/rules'

export interface OrderUpdateContext {
  /** True when the transition also marked the order paid (a payment event). */
  paymentConfirmed?: boolean
}

/** New-order alerts follow the "New orders" toggle in Store Settings. */
export function shouldEmailNewOrder(settings: Pick<StoreSettings, 'notifyNewOrders'>): boolean {
  return settings.notifyNewOrders
}

/**
 * Fulfilment updates are transactional and always go out. A transition that also
 * confirms payment is a payment event, so it follows the "Payment events"
 * toggle instead.
 */
export function shouldEmailOrderUpdate(
  settings: Pick<StoreSettings, 'notifyPaymentEvents'>,
  context: OrderUpdateContext = {},
): boolean {
  return context.paymentConfirmed ? settings.notifyPaymentEvents : true
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function itemLines(order: Order): string {
  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.productName} (${item.size} / ${item.colorName}) — ${formatPrice(item.lineTotal)}`,
    )
    .join('\n')
}

function formatAddress(order: Order): string {
  const a = order.shippingAddress
  return [a.addressLine, a.barangay, a.city, a.province, a.postalCode].filter(Boolean).join(', ')
}

function sharedParams(order: Order, settings: StoreSettings): Record<string, string> {
  return {
    store_name: settings.storeName,
    store_email: settings.contactEmail,
    store_phone: settings.contactPhone,
    order_number: order.orderNumber,
    order_status: ORDER_STATUS_LABELS[order.status],
    payment_method: PAYMENT_METHOD_LABELS[order.paymentMethod],
    payment_status: PAYMENT_STATUS_LABELS[order.paymentStatus],
    customer_name: order.customer.fullName,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    item_count: String(itemCount(order)),
    items: itemLines(order),
    subtotal: formatPrice(order.subtotal),
    shipping_fee: formatPrice(order.shippingFee),
    discount: formatPrice(order.discount),
    total: formatPrice(order.total),
    shipping_address: formatAddress(order),
    customer_note: order.customerNote,
    placed_at: order.createdAt,
  }
}

/** Flow 1: the admin alert, addressed to the store's contact email. */
export function buildNewOrderEmail(order: Order, settings: StoreSettings): EmailMessage {
  return {
    template: 'new_order',
    to: settings.contactEmail,
    toName: settings.storeName,
    subject: `New order ${order.orderNumber} — ${formatPrice(order.total)}`,
    params: {
      ...sharedParams(order, settings),
      admin_order_path: `/admin/orders/${order.id}`,
    },
  }
}

/** Flow 2: the status update, addressed to the buyer. */
export function buildOrderUpdateEmail(order: Order, settings: StoreSettings): EmailMessage {
  const latest = order.statusHistory.at(-1)
  return {
    template: 'order_update',
    to: order.customer.email,
    toName: order.customer.fullName,
    subject: `${settings.storeName}: order ${order.orderNumber} is ${ORDER_STATUS_LABELS[order.status]}`,
    params: {
      ...sharedParams(order, settings),
      status_note: latest?.note ?? '',
      updated_at: order.updatedAt,
      tracking_courier: order.tracking?.courier ?? '',
      tracking_number: order.tracking?.trackingNumber ?? '',
      track_order_path: routes.track,
    },
  }
}

/** Wording for the in-app notification that records flow 2's outcome. */
export function describeOrderUpdateNotification(
  order: Order,
  result: EmailSendResult,
): { title: string; message: string } {
  const status = ORDER_STATUS_LABELS[order.status]
  const title = `Order ${order.orderNumber} updated`
  if (result.status === 'sent') {
    return {
      title,
      message: `${order.customer.fullName} was emailed at ${order.customer.email}: ${status}.`,
    }
  }
  if (result.status === 'failed') {
    return {
      title,
      message: `Status is now ${status}, but the email to ${order.customer.email} failed: ${result.error}`,
    }
  }
  const reason =
    result.reason === 'disabled_by_settings'
      ? 'customer emails are turned off in Store Settings'
      : result.reason === 'missing_recipient'
        ? 'the order has no customer email address'
        : 'email notifications are not configured'
  return { title, message: `Status is now ${status}. No email was sent — ${reason}.` }
}

/**
 * Sends the order emails for both flows. Repositories own the call because that
 * is where the matching in-app notifications are already raised.
 */
export class OrderEmailGateway {
  private readonly client: EmailClient

  constructor(client: EmailClient = emailClient) {
    this.client = client
  }

  async sendNewOrderAlert(order: Order, settings: StoreSettings): Promise<EmailSendResult> {
    if (!shouldEmailNewOrder(settings)) return emailSkipped('new_order', 'disabled_by_settings')
    return this.dispatch(
      buildNewOrderEmail(order, settings),
      `Order ${order.orderNumber} was placed, but the admin alert email could not be sent.`,
    )
  }

  async sendOrderUpdate(
    order: Order,
    settings: StoreSettings,
    context: OrderUpdateContext = {},
  ): Promise<EmailSendResult> {
    if (!shouldEmailOrderUpdate(settings, context)) {
      return emailSkipped('order_update', 'disabled_by_settings')
    }
    return this.dispatch(
      buildOrderUpdateEmail(order, settings),
      `${order.orderNumber} was updated, but the email to ${order.customer.email} could not be sent.`,
    )
  }

  private async dispatch(message: EmailMessage, failureMessage: string): Promise<EmailSendResult> {
    let result: EmailSendResult
    try {
      result = await this.client.send(message)
    } catch (error) {
      // A client should report failures rather than throw; this is the backstop.
      result = {
        status: 'failed',
        template: message.template,
        error: getErrorMessage(error, 'The notification email could not be sent.'),
      }
    }
    if (result.status === 'failed') toast.error(failureMessage)
    return result
  }
}
