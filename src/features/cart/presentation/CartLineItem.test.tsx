import { describe, expect, it, vi } from 'vitest'

import { formatPrice } from '@/lib/format'
import { makeProduct, makeResolvedLine, makeVariant } from '@/tests/fixtures'
import { renderWithProviders, screen } from '@/tests/render'

import { CartLineItem } from './CartLineItem'

function renderLine(props: Partial<Parameters<typeof CartLineItem>[0]> = {}) {
  const onQuantityChange = vi.fn()
  const onRemove = vi.fn()
  const line = props.line ?? makeResolvedLine({ item: { ...makeResolvedLine().item, quantity: 2 } })
  const utils = renderWithProviders(
    <ul>
      <CartLineItem
        line={line}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
        {...props}
      />
    </ul>,
  )
  return { ...utils, line, onQuantityChange, onRemove }
}

describe('CartLineItem', () => {
  it('shows size, colour, unit price and line total', () => {
    const { line } = renderLine()
    const variant = line.variant
    if (!variant || !line.product) throw new Error('fixture must resolve')

    expect(screen.getByText(`${variant.size} · ${variant.color.name}`)).toBeInTheDocument()
    expect(screen.getByText(`${formatPrice(line.unitPrice)} each`)).toBeInTheDocument()
    expect(screen.getByText(formatPrice(line.lineTotal))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: line.product.name })).toHaveAttribute(
      'href',
      `/products/${line.product.slug}`,
    )
  })

  it('calls onQuantityChange with the next value from the +/- controls', async () => {
    const { user, onQuantityChange } = renderLine()

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(onQuantityChange).toHaveBeenLastCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(onQuantityChange).toHaveBeenLastCalledWith(1)
  })

  it('exposes an accessible remove button that calls onRemove', async () => {
    const { user, onRemove, line } = renderLine()
    const name = line.product?.name ?? ''
    await user.click(screen.getByRole('button', { name: `Remove ${name} from cart` }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows a non-blocking notice when the quantity was reduced', () => {
    const line = makeResolvedLine({ issue: 'quantity_reduced', availableStock: 3 })
    renderLine({ line })

    expect(screen.getByText('Only 3 left — quantity updated')).toHaveAttribute('role', 'status')
    // Quantity controls stay available because the line can still be purchased.
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeInTheDocument()
  })

  it('shows a reduced-to notice when the store already synced the quantity', () => {
    renderLine({ reducedTo: 2 })
    expect(screen.getByText('Only 2 left — quantity updated')).toHaveAttribute('role', 'status')
  })

  it('shows a blocking banner and hides quantity controls when out of stock', () => {
    const variant = makeVariant({ stock: 0, reservedStock: 0 })
    const line = makeResolvedLine(
      { issue: 'out_of_stock', availableStock: 0, lineTotal: 0 },
      makeProduct(),
      variant,
    )
    renderLine({ line })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Out of stock — remove this item to continue.',
    )
    expect(screen.queryByRole('button', { name: 'Increase quantity' })).not.toBeInTheDocument()
    expect(screen.queryByText(/each$/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove .* from cart/i })).toBeInTheDocument()
  })

  it('falls back to "Unavailable item" when the product is gone', () => {
    const line = makeResolvedLine({
      issue: 'product_unavailable',
      product: null,
      variant: null,
      unitPrice: 0,
      lineTotal: 0,
      availableStock: 0,
    })
    renderLine({ line })
    expect(screen.getByRole('heading', { name: 'Unavailable item' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('This product is no longer available.')
    expect(
      screen.getByRole('button', { name: 'Remove Unavailable item from cart' }),
    ).toBeInTheDocument()
  })
})
