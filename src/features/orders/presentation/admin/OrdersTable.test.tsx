import { describe, expect, it } from 'vitest'

import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/features/orders/domain/rules'
import { formatPrice } from '@/lib/format'
import { makeOrderSummary } from '@/tests/fixtures'
import { renderWithProviders, screen, within } from '@/tests/render'

import { OrdersTable } from './OrdersTable'

const orders = [
  makeOrderSummary({}, 'ord-17'),
  makeOrderSummary({}, 'ord-11'),
  makeOrderSummary({}, 'ord-03'),
]

describe('OrdersTable', () => {
  it('renders one row per order with number, customer, total and badges', () => {
    renderWithProviders(
      <OrdersTable orders={orders} isLoading={false} emptyState={<p>No orders</p>} />,
    )

    const table = screen.getByRole('table', { name: 'Orders' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(orders.length)

    orders.forEach((order, index) => {
      const row = rows[index] as HTMLElement
      expect(within(row).getByText(order.orderNumber)).toBeInTheDocument()
      expect(within(row).getByText(order.customerName)).toBeInTheDocument()
      expect(within(row).getByText(formatPrice(order.total))).toBeInTheDocument()
      expect(within(row).getByText(ORDER_STATUS_LABELS[order.status])).toBeInTheDocument()
      expect(within(row).getByText(PAYMENT_STATUS_LABELS[order.paymentStatus])).toBeInTheDocument()
      expect(within(row).getByText(PAYMENT_METHOD_LABELS[order.paymentMethod])).toBeInTheDocument()
    })
  })

  it('links the order number and the View action to the admin details page', () => {
    renderWithProviders(
      <OrdersTable
        orders={[orders[0] as (typeof orders)[number]]}
        isLoading={false}
        emptyState={null}
      />,
    )
    const order = orders[0] as (typeof orders)[number]
    const table = screen.getByRole('table', { name: 'Orders' })
    const links = within(table).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      `/admin/orders/${order.id}`,
      `/admin/orders/${order.id}`,
    ])
    expect(within(table).getByRole('link', { name: order.orderNumber })).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: 'View' })).toBeInTheDocument()
  })

  it('renders the empty state when there are no orders', () => {
    renderWithProviders(
      <OrdersTable orders={[]} isLoading={false} emptyState={<p>No orders yet</p>} />,
    )
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders skeleton rows while loading instead of the empty state', () => {
    renderWithProviders(<OrdersTable orders={[]} isLoading emptyState={<p>No orders yet</p>} />)
    expect(screen.queryByText('No orders yet')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
