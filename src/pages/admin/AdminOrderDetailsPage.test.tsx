import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { SEED_PENDING_COD_ORDER_ID } from '@/tests/fixtures'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import AdminOrderDetailsPage from './AdminOrderDetailsPage'

function renderOrder(id: string) {
  return renderWithProviders(<AdminOrderDetailsPage />, {
    route: '/admin/orders/:id',
    initialEntries: [`/admin/orders/${id}`],
  })
}

describe('AdminOrderDetailsPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('offers only valid transitions for a pending COD order and confirms it', async () => {
    const { user } = renderOrder(SEED_PENDING_COD_ORDER_ID)
    const heading = await screen.findByRole('heading', { level: 1, name: /^ORD-\d{4}-\d{5}$/ })
    expect(heading).toBeInTheDocument()

    // The label appears in the header badge, the actions card, the timeline and the history.
    expect(screen.getAllByText('Pending Confirmation').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Current status:/)).toHaveTextContent(
      'Current status: Pending Confirmation',
    )
    expect(screen.getByRole('button', { name: 'Confirm Order' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument()
    for (const invalid of ['Mark Processing', 'Mark Shipped', 'Mark Delivered']) {
      expect(screen.queryByRole('button', { name: invalid })).not.toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'Confirm Order' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Confirm this order?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmed' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'Mark Processing' })).toBeInTheDocument()
    expect(screen.getByText(/Current status:/)).toHaveTextContent('Current status: Confirmed')
    expect(screen.queryByRole('button', { name: 'Confirm Order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark Delivered' })).not.toBeInTheDocument()
    // Header badge plus the "Current status" line in the actions card.
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(2)

    const order = await repositories.orders.getAdminOrderById(SEED_PENDING_COD_ORDER_ID)
    expect(order?.status).toBe('confirmed')
    expect(order?.statusHistory.at(-1)).toMatchObject({ status: 'confirmed', actor: 'admin' })
  })

  it('does not let staff hand-confirm an online order that is still awaiting payment', async () => {
    renderOrder('ord-18')
    await screen.findByRole('heading', { level: 1, name: /^ORD-/ })

    expect(screen.getByText(/Current status:/)).toHaveTextContent('Current status: Pending Payment')
    // `pending_payment -> pending_confirmation` belongs to the payment webhook, so the only
    // manual action left is cancelling.
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm Order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Mark / })).not.toBeInTheDocument()
  })

  it('offers no actions for a delivered order', async () => {
    renderOrder('ord-01')
    await screen.findByRole('heading', { level: 1, name: /^ORD-/ })

    expect(screen.getByText('No further actions are available for this order.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Mark|Confirm Order|Cancel Order/ }),
    ).not.toBeInTheDocument()
  })

  it('shows a not-found state for an unknown id', async () => {
    renderOrder('ord-missing')
    expect(await screen.findByText('Order not found')).toBeInTheDocument()
  })
})
