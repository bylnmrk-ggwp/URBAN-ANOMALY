import { describe, expect, it } from 'vitest'

import type { Product, ProductVariant } from './entities'
import {
  availableStock,
  clampQuantity,
  findVariant,
  generateSku,
  getDiscountPercent,
  getDisplayPrice,
  getProductBadge,
  isColorAvailable,
  isSizeAvailable,
  totalAvailableStock,
  uniqueColors,
  uniqueSizes,
} from './rules'

const black = { name: 'Black', hex: '#111111' }
const ice = { name: 'Ice', hex: '#DCE8F0' }

function variant(overrides: Partial<ProductVariant>): ProductVariant {
  return {
    id: 'v1',
    productId: 'p1',
    sku: 'SKU',
    size: '8',
    color: black,
    stock: 10,
    reservedStock: 0,
    lowStockThreshold: 5,
    ...overrides,
  }
}

function product(overrides: Partial<Product>): Product {
  return {
    id: 'p1',
    slug: 'clog',
    name: 'Clog',
    description: '',
    details: [],
    categoryId: 'c1',
    categoryName: 'Clogs',
    categorySlug: 'clogs',
    basePrice: 1000,
    salePrice: null,
    images: [],
    variants: [],
    status: 'published',
    isFeatured: false,
    salesCount: 0,
    seoTitle: '',
    seoDescription: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('stock rules', () => {
  it('subtracts reserved stock and never goes negative', () => {
    expect(availableStock({ stock: 10, reservedStock: 3 })).toBe(7)
    expect(availableStock({ stock: 2, reservedStock: 5 })).toBe(0)
  })

  it('sums available stock across variants', () => {
    const p = product({
      variants: [variant({ stock: 5 }), variant({ id: 'v2', stock: 3, reservedStock: 1 })],
    })
    expect(totalAvailableStock(p)).toBe(7)
  })

  it('clamps quantity to available stock with a minimum of 1', () => {
    const v = variant({ stock: 3 })
    expect(clampQuantity(10, v)).toBe(3)
    expect(clampQuantity(0, v)).toBe(1)
    expect(clampQuantity(2.7, v)).toBe(2)
    expect(clampQuantity(5, null)).toBe(1)
  })
})

describe('pricing rules', () => {
  it('uses the sale price only when lower than base', () => {
    expect(getDisplayPrice({ basePrice: 1000, salePrice: 800 })).toBe(800)
    expect(getDisplayPrice({ basePrice: 1000, salePrice: 1200 })).toBe(1000)
    expect(getDisplayPrice({ basePrice: 1000, salePrice: null })).toBe(1000)
  })

  it('computes a rounded discount percent', () => {
    expect(getDiscountPercent({ basePrice: 1000, salePrice: 750 })).toBe(25)
    expect(getDiscountPercent({ basePrice: 1000, salePrice: null })).toBe(0)
  })
})

describe('badges', () => {
  it('prioritises sold out over sale over new', () => {
    const now = new Date('2026-10-11T00:00:00Z')
    const recent = '2026-10-01T00:00:00Z'
    expect(
      getProductBadge(
        product({ salePrice: 500, createdAt: recent, variants: [variant({ stock: 0 })] }),
        now,
      ),
    ).toBe('sold_out')
    expect(
      getProductBadge(product({ salePrice: 500, createdAt: recent, variants: [variant({})] }), now),
    ).toBe('sale')
    expect(getProductBadge(product({ createdAt: recent, variants: [variant({})] }), now)).toBe(
      'new',
    )
    expect(
      getProductBadge(product({ createdAt: '2025-01-01T00:00:00Z', variants: [variant({})] }), now),
    ).toBeNull()
  })
})

describe('variant selection', () => {
  const p = product({
    variants: [
      variant({ id: 'ten-black', size: '10', color: black, stock: 0 }),
      variant({ id: 'eight-black', size: '8', color: black, stock: 2 }),
      variant({ id: 'eight-ice', size: '8', color: ice, stock: 4 }),
      variant({ id: 'five-ice', size: '5', color: ice, stock: 1 }),
    ],
  })

  it('lists unique colors and sizes in catalogue order (numeric, not lexicographic)', () => {
    expect(uniqueColors(p).map((c) => c.name)).toEqual(['Black', 'Ice'])
    expect(uniqueSizes(p)).toEqual(['5', '8', '10'])
  })

  it('finds the exact variant for a size and color', () => {
    expect(findVariant(p, '8', 'Ice')?.id).toBe('eight-ice')
    expect(findVariant(p, '12', 'Ice')).toBeNull()
    expect(findVariant(p, null, 'Ice')).toBeNull()
  })

  it('reports availability for the current selection', () => {
    expect(isSizeAvailable(p, '10', null)).toBe(false)
    expect(isSizeAvailable(p, '8', 'Black')).toBe(true)
    expect(isColorAvailable(p, 'Ice', '10')).toBe(false)
    expect(isColorAvailable(p, 'Ice', null)).toBe(true)
  })

  it('generates readable SKUs', () => {
    expect(generateSku('Lava Premium Clog', '8', 'Lava')).toBe('LAVPRE-LAV-8')
    expect(generateSku('Court Slide', '10', 'Ice')).toBe('COUSLI-ICE-10')
  })
})
