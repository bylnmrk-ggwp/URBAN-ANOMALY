import { Route } from 'react-router'
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

import ProductFormPage from './ProductFormPage'

const NAME = 'Test Garden Clog'
const SLUG = 'test-garden-clog'

function renderNewProduct() {
  return renderWithProviders(<ProductFormPage />, {
    route: '/admin/products/new',
    initialEntries: ['/admin/products/new'],
    extraRoutes: (
      <Route path="/admin/products" element={<p data-testid="products-list">Products</p>} />
    ),
  })
}

describe('ProductFormPage (admin)', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('creates a product that is then retrievable from the repository', async () => {
    const { user } = renderNewProduct()
    await screen.findByRole('heading', { level: 1, name: 'New product' })

    await user.type(screen.getByPlaceholderText('Lava Premium Clog'), NAME)
    await waitFor(() => expect(screen.getByLabelText('Slug')).toHaveValue(SLUG))
    await user.type(
      screen.getByLabelText('Description'),
      'A closed-toe garden clog in matte EVA with a removable strap.',
    )
    await user.type(screen.getByLabelText('Base price'), '2490')

    await user.type(screen.getByLabelText('Image URL'), 'https://example.com/overshirt.jpg')
    await user.click(screen.getByRole('button', { name: 'Add URL' }))
    expect(
      within(screen.getByRole('list', { name: 'Product images' })).getAllByRole('listitem'),
    ).toHaveLength(1)

    await user.click(screen.getByRole('checkbox', { name: '8' }))
    await user.click(screen.getByRole('checkbox', { name: '9' }))
    await user.click(screen.getByRole('button', { name: 'Add color' }))
    await user.type(screen.getByPlaceholderText('Sand'), 'Sand')
    await user.click(screen.getByRole('button', { name: 'Generate variants' }))
    expect(
      within(await screen.findByRole('table'))
        .getAllByRole('row')
        .slice(1),
    ).toHaveLength(2)

    // Category lives in a Radix Select; wait for the options to load, then pick one.
    const category = screen.getByRole('combobox', { name: 'Category' })
    await waitFor(() => expect(category).toBeEnabled())
    await user.click(category)
    await user.click(await screen.findByRole('option', { name: 'Slides' }))
    await waitFor(() => expect(category).toHaveTextContent('Slides'))

    const [submit] = screen.getAllByRole('button', { name: 'Create product' })
    await user.click(submit as HTMLElement)

    expect(await screen.findByTestId('products-list')).toBeInTheDocument()

    const admin = await repositories.products.getAdminProducts({ search: SLUG })
    expect(admin.items).toHaveLength(1)
    const created = admin.items[0]
    expect(created).toMatchObject({
      name: NAME,
      slug: SLUG,
      categoryName: 'Slides',
      basePrice: 2490,
      status: 'draft',
    })
    expect(created?.variants).toHaveLength(2)
    expect(created?.images[0]).toMatchObject({
      url: 'https://example.com/overshirt.jpg',
      isPrimary: true,
    })
    const byId = await repositories.products.getProductById(created?.id ?? '')
    expect(byId?.name).toBe(NAME)
    // Drafts are hidden from the storefront.
    expect(await repositories.products.getProductBySlug(SLUG)).toBeNull()
    // Drives a large react-hook-form tree through ~15 interactions; slow under jsdom.
  }, 60_000)

  it('loads an existing product into the form for editing', async () => {
    renderWithProviders(<ProductFormPage />, {
      route: '/admin/products/:id/edit',
      initialEntries: ['/admin/products/prod-01/edit'],
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lava Premium Clog' }),
    ).toBeInTheDocument()
    // "Name" is also the label of each colour row, so target the product name by placeholder.
    expect(screen.getByPlaceholderText('Lava Premium Clog')).toHaveValue('Lava Premium Clog')
    expect(screen.getByLabelText('Slug')).toHaveValue('lava-premium-clog')
    expect(screen.getAllByRole('button', { name: 'Save changes' }).length).toBeGreaterThan(0)
  })
})
