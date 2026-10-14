import { beforeEach, describe, expect, it } from 'vitest'

import { SEED_ORDERS } from '@/mocks/data/orders'
import { renderWithProviders, resetMockSession, screen } from '@/tests/render'

import TrackOrderPage from './TrackOrderPage'

const seedOrder = SEED_ORDERS.find((o) => o.status !== 'cancelled' && o.customer.userId === null)
if (!seedOrder) throw new Error('expected a guest seed order')

async function submit(orderNumber: string, email: string) {
  const { user } = renderWithProviders(<TrackOrderPage />, { initialEntries: ['/track'] })
  await user.type(screen.getByLabelText('Order number'), orderNumber)
  await user.type(screen.getByLabelText('Email used at checkout'), email)
  await user.click(screen.getByRole('button', { name: 'Find my order' }))
  return user
}

describe('TrackOrderPage', () => {
  beforeEach(async () => {
    await resetMockSession()
  })

  it('shows the order timeline, details, items and summary when both fields match', async () => {
    // Lower-case number and mixed-case email prove the lookup is case-insensitive.
    const user = await submit(
      seedOrder.orderNumber.toLowerCase(),
      seedOrder.customer.email.toUpperCase(),
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: seedOrder.orderNumber }),
    ).toBeInTheDocument()
    // Timeline (progress steps) and the items list are both rendered.
    expect(screen.getByRole('region', { name: 'Progress' })).toBeInTheDocument()
    expect(screen.getAllByRole('list').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(seedOrder.customer.fullName)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Track another order' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Track your order' })).toBeInTheDocument()
  })

  it('shows the not-found state when the email does not match', async () => {
    await submit(seedOrder.orderNumber, 'someone.else@example.com')
    expect(
      await screen.findByText("We couldn't find an order with those details."),
    ).toBeInTheDocument()
    expect(screen.queryByText(seedOrder.customer.fullName)).not.toBeInTheDocument()
  })

  it('validates both fields before looking anything up', async () => {
    const { user } = renderWithProviders(<TrackOrderPage />, { initialEntries: ['/track'] })
    await user.click(screen.getByRole('button', { name: 'Find my order' }))
    expect(await screen.findByText('Enter your order number.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })
})
