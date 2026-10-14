import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { StorefrontLayout } from '@/components/layout/StorefrontLayout'
import { useCartStore } from '@/stores/cartStore'
import { SEED_CLOG_IN_STOCK_VARIANT_ID, SEED_CLOG_SLUG } from '@/tests/fixtures'
import { renderWithProviders, resetMockSession, screen, waitFor } from '@/tests/render'

import ProductDetailsPage from './ProductDetailsPage'

function renderPage(slug = SEED_CLOG_SLUG) {
  // Rendered inside the storefront layout so the cart live region is part of the DOM.
  return renderWithProviders(
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path="/products/:slug" element={<ProductDetailsPage />} />
      </Route>
    </Routes>,
    { initialEntries: [`/products/${slug}`] },
  )
}

describe('ProductDetailsPage', () => {
  beforeEach(async () => {
    await resetMockSession()
  })

  it('keeps Add to Cart disabled until a size and colour are chosen', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Lava Premium Clog' })

    const buttons = screen.getAllByRole('button', { name: 'Add to cart' })
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button).toBeDisabled()
    expect(screen.getByText('Select a size and color')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Lava' }))
    for (const button of screen.getAllByRole('button', { name: 'Add to cart' })) {
      expect(button).toBeDisabled()
    }

    await user.click(screen.getByRole('radio', { name: '8' }))
    for (const button of screen.getAllByRole('button', { name: 'Add to cart' })) {
      expect(button).toBeEnabled()
    }
    expect(screen.queryByText('Select a size and color')).not.toBeInTheDocument()
    expect(screen.getByText('In stock')).toBeInTheDocument()
  })

  it('disables sold-out sizes for the chosen colour', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Lava Premium Clog' })

    await user.click(screen.getByRole('radio', { name: 'Lava' }))
    // prod-01 / 6 / Lava has zero stock in the seed.
    expect(screen.getByRole('radio', { name: '6 (unavailable)' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '8' })).toBeEnabled()
  })

  it('adds the selected variant to the cart and announces it', async () => {
    const { user } = renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Lava Premium Clog' })

    await user.click(screen.getByRole('radio', { name: 'Lava' }))
    await user.click(screen.getByRole('radio', { name: '8' }))
    const [addToCart] = screen.getAllByRole('button', { name: 'Add to cart' })
    await user.click(addToCart as HTMLElement)

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(1))
    expect(useCartStore.getState().items[0]).toMatchObject({
      productId: 'prod-01',
      variantId: SEED_CLOG_IN_STOCK_VARIANT_ID,
      quantity: 1,
    })
    expect(
      await screen.findByText('Added 1 × Lava Premium Clog (8, Lava) to your cart'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('1 item in cart')).toBeInTheDocument()
  })

  it('shows the not-found state for an unknown slug', async () => {
    renderPage('does-not-exist')
    expect(await screen.findByText('Product not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to shop' })).toHaveAttribute('href', '/shop')
  })
})
