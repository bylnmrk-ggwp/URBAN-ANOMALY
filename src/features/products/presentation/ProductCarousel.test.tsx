import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEED_PRODUCTS } from '@/mocks/data/products'
import { fireEvent, renderWithProviders, screen, within } from '@/tests/render'

import { ProductCarousel } from './ProductCarousel'

const products = SEED_PRODUCTS.slice(0, 5)

describe('ProductCarousel', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    scrollTo.mockClear()
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders every product as a card inside a labelled carousel region', () => {
    renderWithProviders(<ProductCarousel products={products} label="New Arrivals" />)

    const region = screen.getByRole('region', { name: 'New Arrivals' })
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(within(region).getAllByRole('heading', { level: 3 })).toHaveLength(products.length)
  })

  it('shows a live "current / total" counter starting at the first card', () => {
    renderWithProviders(<ProductCarousel products={products} />)

    const counter = screen.getByText('1 / 5')
    expect(counter).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('button', { name: 'Previous products' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next products' })).toBeEnabled()
  })

  it('scrolls the row forward when Next is pressed', async () => {
    const { user } = renderWithProviders(<ProductCarousel products={products} />)

    await user.click(screen.getByRole('button', { name: 'Next products' }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    const [options] = scrollTo.mock.calls[0] as [ScrollToOptions]
    expect(options.behavior).toBe('smooth')
    expect(options.left).toBeGreaterThan(0)
  })

  it('also scrolls on ArrowRight from inside the region', () => {
    renderWithProviders(<ProductCarousel products={products} />)

    fireEvent.keyDown(screen.getAllByRole('link')[0] as HTMLElement, { key: 'ArrowRight' })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    // Already at the start: ArrowLeft is a no-op.
    fireEvent.keyDown(screen.getAllByRole('link')[0] as HTMLElement, { key: 'ArrowLeft' })
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('hides the controls when there is only one product', () => {
    renderWithProviders(<ProductCarousel products={products.slice(0, 1)} />)
    expect(screen.queryByRole('button', { name: 'Next products' })).not.toBeInTheDocument()
    expect(screen.queryByText(/\/ 1$/)).not.toBeInTheDocument()
  })

  it('renders skeletons while loading', () => {
    const { container } = renderWithProviders(<ProductCarousel isLoading skeletonCount={3} />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })
})
