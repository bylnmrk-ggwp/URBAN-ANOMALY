import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, waitFor, within } from '@/tests/render'

import { ProductForm } from './ProductForm'

function renderForm() {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const utils = renderWithProviders(<ProductForm onSubmit={onSubmit} isPending={false} />, {
    route: '/admin/products/new',
    initialEntries: ['/admin/products/new'],
  })
  return { ...utils, onSubmit }
}

// Each case drives a large react-hook-form tree through many keystrokes; slow under jsdom
// when the whole suite runs in parallel.
describe('ProductForm (admin)', { timeout: 60_000 }, () => {
  it('auto-fills the slug from the name until the slug is edited', async () => {
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Name'), 'Relaxed Linen Shirt')
    await waitFor(() => expect(screen.getByLabelText('Slug')).toHaveValue('relaxed-linen-shirt'))

    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'custom-slug')
    await user.type(screen.getByLabelText('Name'), ' Two')
    expect(screen.getByLabelText('Slug')).toHaveValue('custom-slug')
  })

  it('generates a 3 sizes x 2 colors matrix of 6 variant rows', async () => {
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Name'), 'Camp Shirt')
    for (const size of ['7', '8', '9']) {
      await user.click(screen.getByRole('checkbox', { name: size }))
    }

    await user.click(screen.getByRole('button', { name: 'Add color' }))
    await user.click(screen.getByRole('button', { name: 'Add color' }))
    const colorNames = screen.getAllByPlaceholderText('Sand')
    expect(colorNames).toHaveLength(2)
    await user.type(colorNames[0] as HTMLElement, 'Black')
    await user.type(colorNames[1] as HTMLElement, 'Ecru')

    expect(screen.getByText(/3 sizes × 2 colors/)).toHaveTextContent('= 6 variants')
    await user.click(screen.getByRole('button', { name: 'Generate variants' }))

    const table = await screen.findByRole('table')
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(6)

    const skus = within(table)
      .getAllByRole('textbox', { name: 'SKU' })
      .map((input) => (input as HTMLInputElement).value)
    expect(new Set(skus).size).toBe(6)
    expect(skus[0]).toBe('CAMSHI-BLA-7')
    expect(screen.getByRole('button', { name: 'Regenerate variants' })).toBeInTheDocument()
  })

  it('shows a validation error when no image has been added', async () => {
    const { user, onSubmit } = renderForm()

    await user.type(screen.getByLabelText('Name'), 'Camp Shirt')
    await user.type(
      screen.getByLabelText('Description'),
      'A relaxed camp collar shirt in washed linen.',
    )
    await user.type(screen.getByLabelText('Base price'), '1490')

    const [submit] = screen.getAllByRole('button', { name: 'Create product' })
    await user.click(submit as HTMLElement)

    expect(await screen.findByText('Add at least one product image.')).toBeInTheDocument()
    expect(screen.getByText('Select at least one size.')).toBeInTheDocument()
    expect(screen.getByText('Add at least one color.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an invalid image URL without adding it', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Image URL'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: 'Add URL' }))
    expect(screen.getByText('Enter a valid http(s) image URL.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Product images' })).not.toBeInTheDocument()
  })
})
