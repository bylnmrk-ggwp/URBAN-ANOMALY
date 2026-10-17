import { useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SEED_PRODUCTS } from '@/mocks/data/products'
import type { MockStore } from '@/mocks/MockStore'
import { renderWithProviders, resetMockSession, screen, waitFor } from '@/tests/render'

import ShopPage from './ShopPage'

// Expose the store behind the composition root so the spec can set category intro text.
const shared = vi.hoisted(() => ({ store: null as MockStore | null }))
vi.mock('@/config/repositories', async () => {
  const { createMockRepositoriesForTest } = await import('@/mocks/createMockRepositories')
  const ctx = createMockRepositoriesForTest()
  shared.store = ctx.store
  return { repositories: ctx.repositories }
})

function mockStore() {
  if (!shared.store) throw new Error('mock store not initialised')
  return shared.store
}

const publishedCount = SEED_PRODUCTS.filter((p) => p.status === 'published').length
const slidesCount = SEED_PRODUCTS.filter(
  (p) => p.status === 'published' && p.categorySlug === 'slides',
).length

function renderShop(initialEntry = '/shop') {
  return renderWithProviders(<ShopPage />, {
    route: '/shop',
    initialEntries: [initialEntry],
  })
}

/** Stands in for HeaderSearch: navigates to /shop?q=… with the shop page already mounted. */
function HeaderSearchStub({ term }: { term: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(`/shop?q=${encodeURIComponent(term)}`)}>
      Search for {term}
    </button>
  )
}

describe('ShopPage', () => {
  beforeEach(async () => {
    await resetMockSession()
  })

  it('lists published products only and reports the total', async () => {
    renderShop()

    expect(await screen.findByText(`${publishedCount} products`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument()
    // First page shows 12 cards; drafts and archived products never appear.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12)
    expect(screen.queryByText('Fleece-Lined Clog')).not.toBeInTheDocument()
    expect(screen.queryByText('Studio Loafer Mule')).not.toBeInTheDocument()
  })

  it('narrows results after the debounced search settles', async () => {
    const { user } = renderShop()
    await screen.findByText(`${publishedCount} products`)

    await user.type(screen.getByLabelText('Search products'), 'mule')

    // 300 ms debounce, then a URL update and a refetch; generous timeout for slow CI machines.
    // Terra (9 days old) is already on the unfiltered first page, so wait for the older Dusk.
    expect(await screen.findByText('Dusk Loafer Mule', {}, { timeout: 10_000 })).toBeVisible()
    expect(screen.getByText('Terra Loafer Mule')).toBeInTheDocument()
    expect(screen.queryByText('Lava Premium Clog')).not.toBeInTheDocument()
    expect(screen.getByText(/Results for “mule”/)).toBeInTheDocument()
    const status = screen.getByRole('status')
    const total = Number(/^(\d+) products?$/.exec(status.textContent ?? '')?.[1])
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(publishedCount)
  })

  it('re-syncs the search box when the q param changes while the page stays mounted', async () => {
    const { user } = renderWithProviders(
      <>
        <HeaderSearchStub term="mule" />
        <ShopPage />
      </>,
      { route: '/shop', initialEntries: ['/shop?q=clog'] },
    )
    const searchBox = () => screen.getByLabelText('Search products')
    expect(searchBox()).toHaveValue('clog')

    await user.click(screen.getByRole('button', { name: 'Search for mule' }))

    await waitFor(() => expect(searchBox()).toHaveValue('mule'))
    expect(screen.getByText(/Results for “mule”/)).toBeInTheDocument()

    // The next keystroke must extend the term the URL supplied instead of reviving 'clog',
    // and the debounce that was still holding 'clog' must never reach the URL.
    await user.type(searchBox(), 's')
    expect(searchBox()).toHaveValue('mules')
    expect(
      await screen.findByText(/Results for “mules”/, {}, { timeout: 10_000 }),
    ).toBeInTheDocument()
  })

  it('filters by category from the URL', async () => {
    renderShop('/shop?category=slides')

    expect(await screen.findByText(`${slidesCount} products`)).toBeInTheDocument()
    expect(screen.getByText('Court Slide')).toBeInTheDocument()
    expect(screen.queryByText('Lava Premium Clog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /^Slides/ })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    )
  })

  it('uses the collection intro title and body on the collection header when set', async () => {
    const slides = mockStore().categories.find((c) => c.slug === 'slides')
    if (!slides) throw new Error('seed category missing')
    slides.introTitle = 'Slides for every barangay'
    slides.introBody = 'Two straps, **zero fuss**.'
    try {
      renderWithProviders(<ShopPage />, {
        route: '/collections/:slug',
        initialEntries: ['/collections/slides'],
      })
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Slides for every barangay' }),
      ).toBeInTheDocument()
      expect(screen.getByText('zero fuss')).toBeInTheDocument()
      // The plain description still shows above the intro body.
      expect(screen.getByText(slides.description)).toBeInTheDocument()
    } finally {
      slides.introTitle = ''
      slides.introBody = ''
    }
  })

  it('shows the empty state when nothing matches', async () => {
    renderShop('/shop?q=zzzzqqqq')

    expect(await screen.findByText('No products match your filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    expect(screen.getByText('0 products')).toBeInTheDocument()
  })
})
