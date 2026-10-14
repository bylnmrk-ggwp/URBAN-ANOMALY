import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { StockStatus } from '@/features/inventory/domain/entities'
import { STOCK_STATUS_LABELS } from '@/features/inventory/domain/entities'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/features/orders/domain/entities'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/features/orders/domain/rules'
import type { ProductStatus } from '@/features/products/domain/entities'

import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
  ProductStatusBadge,
  StatusBadge,
  StockStatusBadge,
} from './StatusBadge'

const orderStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
const paymentStatuses = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]
const paymentMethods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
const stockStatuses = Object.keys(STOCK_STATUS_LABELS) as StockStatus[]
const productStatuses: { status: ProductStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'published', label: 'Published' },
  { status: 'archived', label: 'Archived' },
]

describe('StatusBadge family', () => {
  it('renders the label as visible text and hides the colour dot from AT', () => {
    render(<StatusBadge label="Anything" tone="info" />)
    const badge = screen.getByText('Anything')
    expect(badge).toBeVisible()
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it.each(orderStatuses)('OrderStatusBadge renders a text label for %s', (status) => {
    render(<OrderStatusBadge status={status} />)
    expect(screen.getByText(ORDER_STATUS_LABELS[status])).toBeInTheDocument()
  })

  it.each(paymentStatuses)('PaymentStatusBadge renders a text label for %s', (status) => {
    render(<PaymentStatusBadge status={status} />)
    expect(screen.getByText(PAYMENT_STATUS_LABELS[status])).toBeInTheDocument()
  })

  it.each(paymentMethods)('PaymentMethodBadge renders a text label for %s', (method) => {
    render(<PaymentMethodBadge method={method} />)
    expect(screen.getByText(PAYMENT_METHOD_LABELS[method])).toBeInTheDocument()
  })

  it.each(stockStatuses)('StockStatusBadge renders a text label for %s', (status) => {
    render(<StockStatusBadge status={status} />)
    expect(screen.getByText(STOCK_STATUS_LABELS[status])).toBeInTheDocument()
  })

  it.each(productStatuses)(
    'ProductStatusBadge renders "$label" for $status',
    ({ status, label }) => {
      render(<ProductStatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    },
  )

  it('uses distinct labels for every order status so colour is never the only signal', () => {
    const labels = orderStatuses.map((s) => ORDER_STATUS_LABELS[s])
    expect(new Set(labels).size).toBe(labels.length)
  })
})
