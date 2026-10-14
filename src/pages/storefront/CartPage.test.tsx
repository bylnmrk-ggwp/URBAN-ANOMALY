import { describe, expect, it } from 'vitest'

import { useUiStore } from '@/stores/uiStore'
import { renderWithProviders, screen, waitFor } from '@/tests/render'

import CartPage from './CartPage'

describe('CartPage', () => {
  it('has no page of its own: it opens the cart drawer and redirects', async () => {
    renderWithProviders(<CartPage />, { route: '/cart', initialEntries: ['/cart'] })
    await waitFor(() => expect(useUiStore.getState().cartOpen).toBe(true))
    expect(screen.queryByRole('heading', { level: 1, name: 'Your cart' })).not.toBeInTheDocument()
  })
})
