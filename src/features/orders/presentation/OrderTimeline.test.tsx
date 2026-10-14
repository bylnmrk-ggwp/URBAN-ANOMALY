import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ORDER_PROGRESS_STEPS, ORDER_STATUS_LABELS } from '@/features/orders/domain/rules'
import { formatDateTime } from '@/lib/format'
import { SEED_CANCELLED_ORDER_ID, makeOrder } from '@/tests/fixtures'

import { OrderTimeline } from './OrderTimeline'

describe('OrderTimeline', () => {
  it('renders every progress step as a list item', () => {
    render(<OrderTimeline order={makeOrder({ status: 'processing' })} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(ORDER_PROGRESS_STEPS.length)
    for (const step of ORDER_PROGRESS_STEPS) {
      expect(screen.getByText(ORDER_STATUS_LABELS[step])).toBeInTheDocument()
    }
  })

  it('announces the current step in text and marks earlier steps as completed', () => {
    render(<OrderTimeline order={makeOrder({ status: 'processing' })} />)
    const items = screen.getAllByRole('listitem')

    expect(within(items[2] as HTMLElement).getByText(/Current step/)).toBeInTheDocument()
    expect(within(items[0] as HTMLElement).getByText(/Completed/)).toBeInTheDocument()
    expect(within(items[1] as HTMLElement).getByText(/Completed/)).toBeInTheDocument()
    expect(within(items[3] as HTMLElement).getByText(/Upcoming/)).toBeInTheDocument()
    expect(within(items[4] as HTMLElement).getByText(/Upcoming/)).toBeInTheDocument()
  })

  // BUG (a11y): src/features/orders/presentation/OrderTimeline.tsx never sets
  // `aria-current="step"` on the active <li>; the current step is only conveyed by an
  // sr-only suffix. Screen-reader users navigating by list item get no programmatic
  // "current" indication. Un-skip once the attribute is added.
  it('marks the current step with aria-current', () => {
    render(<OrderTimeline order={makeOrder({ status: 'processing' })} />)
    const items = screen.getAllByRole('listitem')
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items.filter((li) => li.hasAttribute('aria-current'))).toHaveLength(1)
  })

  it('relabels the first step as awaiting payment for online orders', () => {
    render(<OrderTimeline order={makeOrder({ status: 'pending_payment' })} />)
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument()
    expect(screen.queryByText('Pending Confirmation')).not.toBeInTheDocument()
  })

  it('marks every step completed once delivered', () => {
    render(<OrderTimeline order={makeOrder({}, 'ord-01')} />)
    expect(screen.getAllByText(/Completed/)).toHaveLength(ORDER_PROGRESS_STEPS.length)
    expect(screen.queryByText(/Current step/)).not.toBeInTheDocument()
  })

  it('renders a terminal cancelled banner instead of the step list', () => {
    const order = makeOrder({}, SEED_CANCELLED_ORDER_ID)
    render(<OrderTimeline order={order} />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('Order cancelled')
    const cancelledAt = [...order.statusHistory].reverse().find((e) => e.status === 'cancelled')
    expect(banner).toHaveTextContent(
      `Cancelled on ${formatDateTime(cancelledAt?.createdAt ?? order.updatedAt)}.`,
    )
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
