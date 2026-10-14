import { describe, expect, it } from 'vitest'

import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { makeProduct } from '@/tests/fixtures'
import { renderWithProviders, screen, within } from '@/tests/render'

import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  it('renders the name, formatted PHP price and links to the product page', () => {
    const product = makeProduct({ salePrice: null, createdAt: '2020-01-01T00:00:00.000Z' })
    renderWithProviders(<ProductCard product={product} />)

    const [link] = screen.getAllByRole('link')
    expect(link).toHaveAttribute('href', `/products/${product.slug}`)
    expect(
      within(link as HTMLElement).getByRole('heading', { name: product.name }),
    ).toBeInTheDocument()
    expect(screen.getByText(formatPrice(product.basePrice))).toBeInTheDocument()
    expect(screen.queryByText(/original price/i)).not.toBeInTheDocument()
  })

  it('renders a full-width "Choose options" link to the product page', () => {
    const product = makeProduct()
    renderWithProviders(<ProductCard product={product} />)

    const cta = screen.getByRole('link', { name: `Choose options for ${product.name}` })
    expect(cta).toHaveAttribute('href', `/products/${product.slug}`)
    expect(cta).toHaveTextContent('Choose options')
    expect(cta).toHaveClass('w-full')
  })

  it('can hide the quick action when the parent renders its own', () => {
    const product = makeProduct()
    renderWithProviders(<ProductCard product={product} showQuickAction={false} />)
    expect(screen.queryByText('Choose options')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('shows the sale price with the original price struck through and a Sale badge', () => {
    const product = makeProduct({ basePrice: 1000, salePrice: 750 })
    renderWithProviders(<ProductCard product={product} />)

    expect(screen.getByText(formatPrice(750))).toBeInTheDocument()
    const original = screen.getByText(formatPrice(1000))
    expect(original.closest('s')).not.toBeNull()
    expect(screen.getByText('Sale price', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Sale')).toBeInTheDocument()
  })

  it('shows a New badge for recently created products', () => {
    const product = makeProduct({ salePrice: null, createdAt: new Date().toISOString() })
    renderWithProviders(<ProductCard product={product} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('shows a Sold out badge when no variant is available, even if on sale', () => {
    const base = makeProduct({ salePrice: 500 })
    const product = makeProduct({
      salePrice: 500,
      variants: base.variants.map((v) => ({ ...v, stock: 0, reservedStock: 0 })),
    })
    renderWithProviders(<ProductCard product={product} />)
    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.queryByText('Sale')).not.toBeInTheDocument()
  })

  it('describes available colours for assistive technology', () => {
    const product = makeProduct()
    renderWithProviders(<ProductCard product={product} />)
    expect(screen.getByLabelText(/available in 3 colors: Lava, Ice, Midnight/i)).toBeInTheDocument()
  })
})

describe('ProductCard wishlist heart', () => {
  it('toggles the product in the wishlist without navigating', async () => {
    useWishlistStore.setState({ items: [] })
    const product = makeProduct()
    const { user } = renderWithProviders(<ProductCard product={product} />)

    const heart = screen.getByRole('button', { name: 'Add to wishlist' })
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    // The heart is a sibling of the card links, never nested inside one.
    for (const link of screen.getAllByRole('link')) expect(link.contains(heart)).toBe(false)

    await user.click(heart)
    expect(useWishlistStore.getState().items).toEqual([product.id])
    const pressed = screen.getByRole('button', { name: 'Remove from wishlist' })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')
    expect(useCartStore.getState().lastAnnouncement).toBe(`Added ${product.name} to your wishlist`)

    await user.click(pressed)
    expect(useWishlistStore.getState().items).toEqual([])
    expect(screen.getByRole('button', { name: 'Add to wishlist' })).toBeInTheDocument()
  })
})
