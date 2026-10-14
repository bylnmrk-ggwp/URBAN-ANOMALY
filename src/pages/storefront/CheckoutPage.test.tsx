import { Route, useParams } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { useCartStore } from '@/stores/cartStore'
import { SEED_CLOG_IN_STOCK_VARIANT_ID, makeCartItem } from '@/tests/fixtures'
import { renderWithProviders, resetMockSession, screen, waitFor } from '@/tests/render'

import CheckoutPage from './CheckoutPage'

function ConfirmationProbe() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  return <p data-testid="confirmation">{orderNumber}</p>
}

function renderCheckout() {
  return renderWithProviders(<CheckoutPage />, {
    route: '/checkout',
    initialEntries: ['/checkout'],
    extraRoutes: (
      <>
        <Route path="/orders/confirmation/:orderNumber" element={<ConfirmationProbe />} />
        <Route path="/cart" element={<p data-testid="cart-page">Cart</p>} />
      </>
    ),
  })
}

async function waitForForm() {
  const submit = await screen.findByRole('button', { name: /place order/i })
  await waitFor(() => expect(submit).toBeEnabled())
  return submit
}

describe('CheckoutPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    useCartStore.setState({ items: [makeCartItem({ quantity: 2 })] })
  })

  it('redirects to the cart when there is nothing to check out', async () => {
    useCartStore.setState({ items: [] })
    renderCheckout()
    expect(await screen.findByTestId('cart-page')).toBeInTheDocument()
  })

  it('shows validation errors and places nothing when submitted empty', async () => {
    const { user } = renderCheckout()
    const submit = await waitForForm()
    expect(submit).toHaveTextContent('Place order · ₱2,530.00')

    const before = (await repositories.orders.getAdminOrders({ pageSize: 500 })).total
    await user.click(submit)

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(
      screen.getByText('Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).'),
    ).toBeInTheDocument()
    expect(screen.getByText('Postal code must be 4 digits.')).toBeInTheDocument()
    expect((await repositories.orders.getAdminOrders({ pageSize: 500 })).total).toBe(before)
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('places a COD order through the repository, clears the cart and navigates to confirmation', async () => {
    const { user } = renderCheckout()
    const submit = await waitForForm()

    await user.type(screen.getByLabelText('Full name'), 'Juan Dela Cruz')
    await user.type(screen.getByLabelText('Email'), 'juan@example.com')
    await user.type(screen.getByLabelText('Mobile number'), '09171234567')
    await user.type(screen.getByLabelText('Street address'), '12 Kalayaan Avenue')
    await user.type(screen.getByLabelText('Barangay'), 'Poblacion')
    await user.type(screen.getByLabelText('City / Municipality'), 'Makati City')
    await user.type(screen.getByLabelText('Province'), 'Metro Manila')
    await user.type(screen.getByLabelText('Postal code'), '1210')
    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked()

    await user.click(submit)

    const probe = await screen.findByTestId('confirmation')
    const orderNumber = probe.textContent ?? ''
    expect(orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/)

    const order = await repositories.orders.getOrderByNumber(orderNumber)
    expect(order).not.toBeNull()
    expect(order).toMatchObject({
      paymentMethod: 'cod',
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
      total: 2530,
      customer: { fullName: 'Juan Dela Cruz', email: 'juan@example.com', phone: '09171234567' },
      shippingAddress: { postalCode: '1210', city: 'Makati City' },
    })
    expect(order?.items).toHaveLength(1)
    expect(order?.items[0]).toMatchObject({ variantId: SEED_CLOG_IN_STOCK_VARIANT_ID, quantity: 2 })
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  // Agent C: discount codes
  it('applies WELCOME10, shows the discount line and places the order with the discount', async () => {
    const { user } = renderCheckout()
    const submit = await waitForForm()

    const codeInput = screen.getByLabelText('Discount code')
    await user.type(codeInput, 'nope')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not valid.')

    await user.clear(codeInput)
    await user.type(codeInput, 'welcome10')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText(/^Discount/)).toBeInTheDocument()
    expect(screen.getByText('−₱238.00')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove discount code WELCOME10' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(submit).toHaveTextContent('Place order · ₱2,292.00'))

    await user.type(screen.getByLabelText('Full name'), 'Juan Dela Cruz')
    await user.type(screen.getByLabelText('Email'), 'juan@example.com')
    await user.type(screen.getByLabelText('Mobile number'), '09171234567')
    await user.type(screen.getByLabelText('Street address'), '12 Kalayaan Avenue')
    await user.type(screen.getByLabelText('Barangay'), 'Poblacion')
    await user.type(screen.getByLabelText('City / Municipality'), 'Makati City')
    await user.type(screen.getByLabelText('Province'), 'Metro Manila')
    await user.type(screen.getByLabelText('Postal code'), '1210')
    await user.click(submit)

    const probe = await screen.findByTestId('confirmation')
    const order = await repositories.orders.getOrderByNumber(probe.textContent ?? '')
    expect(order).toMatchObject({ discount: 238, total: 2292 })
  })
})
