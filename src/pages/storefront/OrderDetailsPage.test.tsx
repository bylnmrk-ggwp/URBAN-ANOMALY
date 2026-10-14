import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import OrderDetailsPage from './OrderDetailsPage'

/** Maria's seed order that is still processing; the test delivers it so it is return-eligible. */
const FRESH_ORDER_ID = 'ord-14'
/** Maria's delivered order with a seeded (requested) return. */
const RETURNED_ORDER_ID = 'ord-09'
/** Maria's order delivered 44 days ago: outside the return window. */
const OLD_ORDER_ID = 'ord-01'

function renderOrder(id: string) {
  return renderWithProviders(<OrderDetailsPage />, {
    route: '/account/orders/:id',
    initialEntries: [`/account/orders/${id}`],
  })
}

describe('OrderDetailsPage returns', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('buyer')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('shows the seeded return status card instead of the request button', async () => {
    renderOrder(RETURNED_ORDER_ID)
    // Session -> order -> return request are three chained queries; allow for slow machines.
    await screen.findByRole('heading', { level: 1, name: /^Order ORD-/ })
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Return request' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Wrong size or fit', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('We are reviewing your request.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request a return' })).not.toBeInTheDocument()
  })

  it('hides the request button once the return window has passed', async () => {
    renderOrder(OLD_ORDER_ID)
    await screen.findByRole('heading', { level: 1, name: /^Order ORD-/ })
    await waitFor(() => expect(screen.queryByLabelText('Checking returns')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Request a return' })).not.toBeInTheDocument()
    expect(screen.queryByText('Return request')).not.toBeInTheDocument()
  })

  it('lets the buyer request a return on a freshly delivered order', async () => {
    await repositories.orders.updateOrderStatus(FRESH_ORDER_ID, 'shipped')
    await repositories.orders.updateOrderStatus(FRESH_ORDER_ID, 'delivered')

    const { user } = renderOrder(FRESH_ORDER_ID)
    await user.click(await screen.findByRole('button', { name: 'Request a return' }))
    const dialog = await screen.findByRole('dialog', { name: 'Request a return' })

    // Nothing selected yet.
    await user.click(within(dialog).getByRole('button', { name: 'Submit request' }))
    expect(await within(dialog).findByText('Select at least one item.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Increase Terra Loafer Mule' }))
    expect(
      within(dialog).getByRole('button', { name: 'Increase Terra Loafer Mule' }),
    ).toBeDisabled()
    expect(within(dialog).getByText('Estimated refund').nextSibling).not.toHaveTextContent('₱0.00')

    await user.click(within(dialog).getByRole('combobox', { name: 'Reason' }))
    await user.click(await screen.findByRole('option', { name: 'Arrived damaged' }))
    await user.click(within(dialog).getByRole('radio', { name: /Exchange/ }))
    await user.type(
      within(dialog).getByLabelText(/Anything we should know/),
      'Strap rivet came loose.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Submit request' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Return request' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Arrived damaged', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request a return' })).not.toBeInTheDocument()

    const request = await repositories.returns.getForOrder(FRESH_ORDER_ID)
    expect(request).toMatchObject({
      status: 'requested',
      reason: 'damaged',
      resolution: 'exchange',
      note: 'Strap rivet came loose.',
    })
    expect(request?.items).toEqual([expect.objectContaining({ quantity: 1 })])
  })
})
