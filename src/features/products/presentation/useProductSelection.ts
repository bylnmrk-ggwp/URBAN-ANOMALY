import { useMemo, useState } from 'react'

import type { Product, ProductSize } from '@/features/products/domain/entities'
import {
  availableStock,
  findVariant,
  totalAvailableStock,
  uniqueColors,
  uniqueSizes,
} from '@/features/products/domain/rules'

export type StockTone = 'in_stock' | 'low' | 'out'

export interface StockMessage {
  text: string
  tone: StockTone
}

export function describeStock(
  product: Product,
  variant: ReturnType<typeof findVariant>,
): StockMessage | null {
  if (variant) {
    const available = availableStock(variant)
    if (available === 0) return { text: 'Out of stock', tone: 'out' }
    if (available <= variant.lowStockThreshold)
      return { text: `Only ${available} left`, tone: 'low' }
    return { text: 'In stock', tone: 'in_stock' }
  }
  if (totalAvailableStock(product) === 0) return { text: 'Out of stock', tone: 'out' }
  return null
}

interface SelectionState {
  productId: string | null
  size: ProductSize | null
  colorName: string | null
  quantity: number
}

/** Size / color / quantity selection state for a product page. */
export function useProductSelection(product: Product | null | undefined) {
  const productId = product?.id ?? null
  const sizes = useMemo(() => (product ? uniqueSizes(product) : []), [product])
  const colors = useMemo(() => (product ? uniqueColors(product) : []), [product])

  const [state, setState] = useState<SelectionState>({
    productId: null,
    size: null,
    colorName: null,
    quantity: 1,
  })

  // Selection belongs to one product; a different product resets it (and preselects single options).
  const current: SelectionState =
    state.productId === productId
      ? state
      : {
          productId,
          size: sizes.length === 1 ? (sizes[0] ?? null) : null,
          colorName: colors.length === 1 ? (colors[0]?.name ?? null) : null,
          quantity: 1,
        }

  const variant = product ? findVariant(product, current.size, current.colorName) : null
  const available = variant ? availableStock(variant) : 0
  // Quantity is always clamped to what the catalog says is available.
  const quantity = Math.min(Math.max(1, current.quantity), Math.max(1, available))

  const update = (patch: Partial<SelectionState>) => setState({ ...current, ...patch })

  const stock = product ? describeStock(product, variant) : null
  const canAddToCart = variant !== null && available > 0

  return {
    size: current.size,
    colorName: current.colorName,
    quantity,
    sizes,
    colors,
    variant,
    available,
    stock,
    canAddToCart,
    setSize: (size: ProductSize | null) => update({ size }),
    setColorName: (colorName: string | null) => update({ colorName }),
    setQuantity: (next: number) => update({ quantity: next }),
    resetQuantity: () => update({ quantity: 1 }),
  }
}

export type ProductSelection = ReturnType<typeof useProductSelection>
