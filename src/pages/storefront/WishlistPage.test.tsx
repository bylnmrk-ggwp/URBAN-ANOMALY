import { beforeEach, describe, expect, it } from 'vitest'

import { useWishlistStore } from '@/stores/wishlistStore'
import { SEED_CLOG_ID } from '@/tests/fixtures'
import { renderWithProviders, resetMockSession, screen } from '@/tests/render'

import WishlistPage from './WishlistPage'

describe('WishlistPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    useWishlistStore.setState({ items: [] })
  })

  it('shows the empty state with a link to the shop', () => {
    renderWithProviders(<WishlistPage />, { initialEntries: ['/wishlist'] })
    expect(screen.getByText('Your wishlist is empty.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the shop' })).toHaveAttribute('href', '/shop')
  })

  it('lists saved products and lets the user remove one', async () => {
    useWishlistStore.setState({ items: [SEED_CLOG_ID, 'prod-02'] })
    const { user } = renderWithProviders(<WishlistPage />, { initialEntries: ['/wishlist'] })

    expect(await screen.findByRole('heading', { name: 'Lava Premium Clog' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ice Premium Clog' })).toBeInTheDocument()
    expect(screen.getByText('2 items saved on this device.')).toBeInTheDocument()

    const removeButtons = screen.getAllByRole('button', { name: 'Remove from wishlist' })
    expect(removeButtons).toHaveLength(2)
    await user.click(removeButtons[0] as HTMLElement)

    expect(useWishlistStore.getState().items).toEqual(['prod-02'])
    expect(screen.getByText('1 item saved on this device.')).toBeInTheDocument()
  })
})
