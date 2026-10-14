import { describe, expect, it } from 'vitest'

import type { Product } from '@/features/products/domain/entities'

import type { CartItem } from './entities'
import {
  calculateShippingFee,
  calculateTotals,
  clampCartQuantity,
  countItems,
  hasBlockingIssues,
  resolveCartLines,
} from './rules'

const black = { name: 'Black', hex: '#111111' }

const slide: Product = {
  id: 'p1',
  slug: 'court-slide',
  name: 'Court Slide',
  description: '',
  details: [],
  categoryId: 'c1',
  categoryName: 'Slides',
  categorySlug: 'slides',
  basePrice: 1000,
  salePrice: 800,
  images: [],
  variants: [
    {
      id: 'v1',
      productId: 'p1',
      sku: 'A',
      size: '8',
      color: black,
      stock: 5,
      reservedStock: 0,
      lowStockThreshold: 2,
    },
    {
      id: 'v2',
      productId: 'p1',
      sku: 'B',
      size: '9',
      color: black,
      stock: 1,
      reservedStock: 1,
      lowStockThreshold: 2,
    },
  ],
  status: 'published',
  isFeatured: false,
  salesCount: 0,
  seoTitle: '',
  seoDescription: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function item(variantId: string, quantity: number, productId = 'p1'): CartItem {
  return { productId, variantId, quantity, addedAt: '2026-01-01T00:00:00Z' }
}

describe('shipping', () => {
  it('is free at or above the threshold and flat below it', () => {
    expect(calculateShippingFee(0)).toBe(0)
    expect(calculateShippingFee(2499)).toBe(150)
    expect(calculateShippingFee(2500)).toBe(0)
  })

  it('prices from the store settings when given', () => {
    const settings = { flatShippingFee: 99, freeShippingThreshold: 1000 }
    expect(calculateShippingFee(999, settings)).toBe(99)
    expect(calculateShippingFee(1000, settings)).toBe(0)
    // Settings → "Set to 0 to make every order ship free."
    expect(calculateShippingFee(1, { flatShippingFee: 99, freeShippingThreshold: 0 })).toBe(0)
  })
})

describe('resolveCartLines', () => {
  it('prices lines from the catalog, not the stored item', () => {
    const [line] = resolveCartLines([item('v1', 2)], [slide])
    expect(line?.unitPrice).toBe(800)
    expect(line?.lineTotal).toBe(1600)
    expect(line?.issue).toBeNull()
  })

  it('reduces quantity to available stock and flags it', () => {
    const [line] = resolveCartLines([item('v1', 9)], [slide])
    expect(line?.item.quantity).toBe(5)
    expect(line?.issue).toBe('quantity_reduced')
  })

  it('flags out of stock, missing variant and missing product', () => {
    const lines = resolveCartLines(
      [item('v2', 1), item('v-missing', 1), item('v1', 1, 'p-missing')],
      [slide],
    )
    expect(lines.map((l) => l.issue)).toEqual([
      'out_of_stock',
      'variant_unavailable',
      'product_unavailable',
    ])
    expect(hasBlockingIssues(lines)).toBe(true)
  })

  it('treats unpublished products as unavailable', () => {
    const [line] = resolveCartLines([item('v1', 1)], [{ ...slide, status: 'draft' }])
    expect(line?.issue).toBe('product_unavailable')
  })
})

describe('calculateTotals', () => {
  it('excludes blocked lines and adds shipping', () => {
    const lines = resolveCartLines([item('v1', 2), item('v2', 1)], [slide])
    const totals = calculateTotals(lines)
    expect(totals.subtotal).toBe(1600)
    expect(totals.itemCount).toBe(2)
    expect(totals.shippingFee).toBe(150)
    expect(totals.total).toBe(1750)
    expect(totals.freeShippingThreshold).toBe(2500)
  })

  it('carries the store shipping rule into the totals', () => {
    const lines = resolveCartLines([item('v1', 2)], [slide])
    const totals = calculateTotals(lines, { flatShippingFee: 80, freeShippingThreshold: 1500 })
    expect(totals.shippingFee).toBe(0)
    expect(totals.total).toBe(1600)
    expect(totals.freeShippingThreshold).toBe(1500)
  })

  it('counts quantities', () => {
    expect(countItems([{ quantity: 2 }, { quantity: 3 }])).toBe(5)
  })

  it('clamps quantities to the per-line maximum and availability', () => {
    expect(clampCartQuantity(50, 100)).toBe(10)
    expect(clampCartQuantity(4, 2)).toBe(2)
    expect(clampCartQuantity(-1, 5)).toBe(0)
  })
})
