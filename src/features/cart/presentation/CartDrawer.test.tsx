import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithProviders, screen, waitFor } from '@/tests/render'
import { SEED_CLOG_ID, SEED_CLOG_IN_STOCK_VARIANT_ID } from '@/tests/fixtures'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'

import { CartDrawer } from './CartDrawer'

describe('CartDrawer', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
    useUiStore.getState().setCartOpen(false)
  })

  it('stays closed until opened', () => {
    renderWithProviders(<CartDrawer />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the empty state with continue shopping and a log-in hint', async () => {
    useUiStore.getState().setCartOpen(true)
    const { user } = renderWithProviders(<CartDrawer />)
    expect(await screen.findByRole('dialog', { name: 'Your cart' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    await user.click(screen.getByRole('button', { name: 'Continue shopping' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('lists cart lines with a subtotal and a checkout link', async () => {
    useCartStore.getState().addItem({
      productId: SEED_CLOG_ID,
      variantId: SEED_CLOG_IN_STOCK_VARIANT_ID,
      quantity: 2,
      maxQuantity: 10,
    })
    useUiStore.getState().setCartOpen(true)
    renderWithProviders(<CartDrawer />)
    expect(await screen.findByRole('link', { name: 'Check out' })).toHaveAttribute(
      'href',
      '/checkout',
    )
    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    expect(screen.queryByText('Your cart is empty')).not.toBeInTheDocument()
  })
})
