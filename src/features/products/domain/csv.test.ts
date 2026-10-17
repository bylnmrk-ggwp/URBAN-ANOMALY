import { describe, expect, it } from 'vitest'

import type { Category } from '@/features/categories/domain/entities'
import { SEED_CATEGORIES } from '@/mocks/data/categories'
import { SEED_PRODUCTS } from '@/mocks/data/products'

import {
  PRODUCT_CSV_COLUMNS,
  type ProductCsvColumn,
  csvRowsToProductInputs,
  parseCsv,
  productsToCsv,
} from './csv'
import type { Product, ProductColor, ProductSize } from './entities'

/** The column set as it stood before `low_stock_threshold` and the keyed stock shape existed. */
const HEADER =
  'name,slug,description,category_slug,base_price,sale_price,status,is_featured,sizes,colors,stock_per_variant,image_urls'

function seedCategory(slug: string): Category {
  const category = SEED_CATEGORIES.find((c) => c.slug === slug)
  if (!category) throw new Error(`seed category "${slug}" is missing`)
  return category
}

const CLOGS = seedCategory('clogs')

const LAVA: ProductColor = { name: 'Lava', hex: '#B3261E' }
const ICE: ProductColor = { name: 'Ice', hex: '#DCE8F0' }

interface VariantSpec {
  size: ProductSize
  color: ProductColor
  stock: number
  lowStockThreshold: number
}

/**
 * A product whose variants are exactly the size x color cross product, which is what the
 * importer rebuilds from the `sizes` and `colors` columns.
 */
function makeProduct(specs: VariantSpec[]): Product {
  return {
    id: 'p-round-trip',
    slug: 'round-trip-clog',
    name: 'Round Trip Clog',
    description: 'A clog that has to survive the CSV round trip.',
    details: ['100% recycled EVA'],
    categoryId: CLOGS.id,
    categoryName: CLOGS.name,
    categorySlug: CLOGS.slug,
    basePrice: 1290,
    salePrice: null,
    images: [
      { id: 'img-1', url: 'https://img/1', alt: 'Round Trip Clog', isPrimary: true, sortOrder: 0 },
    ],
    variants: specs.map((spec, i) => ({
      id: `v-${i + 1}`,
      productId: 'p-round-trip',
      sku: `rt-${i + 1}`,
      reservedStock: 0,
      ...spec,
    })),
    status: 'published',
    isFeatured: false,
    salesCount: 0,
    seoTitle: '',
    seoDescription: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

/** Reads one cell of an exported row by column name, so the tests ignore the column order. */
function cell(row: string[] | undefined, column: ProductCsvColumn): string | undefined {
  return (row ?? [])[PRODUCT_CSV_COLUMNS.indexOf(column)]
}

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes, embedded newlines and CRLF', () => {
    const text = 'a,b,c\r\n"hello, world","she said ""hi""","line1\nline2"\r\nplain,,last\r\n'
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['hello, world', 'she said "hi"', 'line1\nline2'],
      ['plain', '', 'last'],
    ])
  })

  it('skips blank lines and strips a BOM', () => {
    expect(parseCsv('﻿x,y\n\n1,2\n')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ])
  })
})

describe('csvRowsToProductInputs', () => {
  it('builds ProductInputs with size x color variants and reports bad rows', () => {
    const text = [
      HEADER,
      '"Garden Clog, Matte",garden-clog,"A closed-toe, matte clog.",clogs,1290,,published,true,7|8,Lava:#B3261E|Ice:#DCE8F0,7,https://img/1|https://img/2',
      'Bad Category,bad-cat,Some description here,nope,500,,draft,false,S,Black:#111111,0,https://img/1',
      'Bad Size,bad-size,Some description here,clogs,500,,draft,false,XXXL,Lava:#B3261E,0,https://img/1',
      'Bad Color,bad-color,Some description here,clogs,500,,draft,false,8,Lava,0,https://img/1',
      'Bad Price,bad-price,Some description here,clogs,abc,,draft,false,8,Lava:#B3261E,0,https://img/1',
      'No Image,no-image,Some description here,clogs,500,,draft,false,8,Lava:#B3261E,0,',
    ].join('\r\n')

    const { valid, errors } = csvRowsToProductInputs(parseCsv(text), SEED_CATEGORIES)

    expect(valid).toHaveLength(1)
    const clog = valid[0]
    expect(clog).toMatchObject({
      name: 'Garden Clog, Matte',
      slug: 'garden-clog',
      categoryId: CLOGS.id,
      basePrice: 1290,
      salePrice: null,
      status: 'published',
      isFeatured: true,
      seoTitle: '',
    })
    expect(clog?.variants).toHaveLength(4)
    expect(clog?.variants.map((v) => `${v.size}/${v.color.name}`)).toEqual([
      '7/Lava',
      '7/Ice',
      '8/Lava',
      '8/Ice',
    ])
    expect(clog?.variants.every((v) => v.stock === 7 && v.sku.length > 3)).toBe(true)
    expect(clog?.images).toEqual([
      { url: 'https://img/1', alt: 'Garden Clog, Matte', isPrimary: true },
      { url: 'https://img/2', alt: 'Garden Clog, Matte - view 2', isPrimary: false },
    ])

    expect(errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 6])
    expect(errors[0]?.message).toMatch(/Unknown category "nope"/)
    expect(errors[1]?.message).toMatch(/Unknown size "XXXL"/)
    expect(errors[2]?.message).toMatch(/Name:#RRGGBB/)
    expect(errors[3]?.message).toMatch(/basePrice/)
    expect(errors[4]?.message).toMatch(/images/)
  })

  it('rejects files without the required columns and duplicate slugs', () => {
    expect(csvRowsToProductInputs(parseCsv('name,slug\nA,a'), SEED_CATEGORIES).errors).toEqual([
      { row: 0, message: 'Missing required column(s): category_slug, base_price.' },
    ])
    const dup = [
      HEADER,
      'Clog One,same-slug,Some description here,clogs,500,,draft,false,8,Lava:#B3261E,0,https://img/1',
      'Clog Two,same-slug,Some description here,clogs,500,,draft,false,8,Lava:#B3261E,0,https://img/1',
    ].join('\n')
    const result = csvRowsToProductInputs(parseCsv(dup), SEED_CATEGORIES)
    expect(result.valid).toHaveLength(1)
    expect(result.errors).toEqual([{ row: 2, message: 'Duplicate slug "same-slug" in this file.' }])
  })
})

describe('productsToCsv', () => {
  it('round-trips the seed catalogue through the documented columns', () => {
    const sample = SEED_PRODUCTS.slice(0, 3)
    const csv = productsToCsv(sample)
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual([...PRODUCT_CSV_COLUMNS])
    expect(rows).toHaveLength(4)

    const { valid, errors } = csvRowsToProductInputs(rows, SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid.map((p) => p.slug)).toEqual(sample.map((p) => p.slug))

    // The seed catalogue mixes healthy, low and sold-out variants, so every one of them has to
    // come back with its own number rather than the first variant's.
    sample.forEach((product, i) => {
      const imported = valid[i]
      expect(imported?.variants).toHaveLength(product.variants.length)
      const byVariant = new Map(imported?.variants.map((v) => [`${v.size}:${v.color.name}`, v]))
      for (const variant of product.variants) {
        expect(byVariant.get(`${variant.size}:${variant.color.name}`)).toMatchObject({
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
        })
      }
    })
  })
})

describe('per-variant stock and low-stock threshold', () => {
  it('exports differing stock as a size:color list and imports each variant back', () => {
    const product = makeProduct([
      { size: '7', color: LAVA, stock: 5, lowStockThreshold: 2 },
      { size: '7', color: ICE, stock: 0, lowStockThreshold: 2 },
      { size: '8', color: LAVA, stock: 12, lowStockThreshold: 2 },
      { size: '8', color: ICE, stock: 3, lowStockThreshold: 2 },
    ])
    const rows = parseCsv(productsToCsv([product]))
    expect(cell(rows[1], 'stock_per_variant')).toBe('7:Lava:5|7:Ice:0|8:Lava:12|8:Ice:3')
    // A threshold every variant agrees on still exports as a single readable number.
    expect(cell(rows[1], 'low_stock_threshold')).toBe('2')

    const { valid, errors } = csvRowsToProductInputs(rows, SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid[0]?.variants.map((v) => [`${v.size}:${v.color.name}`, v.stock])).toEqual([
      ['7:Lava', 5],
      ['7:Ice', 0],
      ['8:Lava', 12],
      ['8:Ice', 3],
    ])
    expect(valid[0]?.variants.every((v) => v.lowStockThreshold === 2)).toBe(true)
  })

  it('keeps differing low-stock thresholds across the round trip', () => {
    const product = makeProduct([
      { size: '7', color: LAVA, stock: 4, lowStockThreshold: 1 },
      { size: '8', color: LAVA, stock: 4, lowStockThreshold: 6 },
    ])
    const rows = parseCsv(productsToCsv([product]))
    expect(cell(rows[1], 'stock_per_variant')).toBe('4')
    expect(cell(rows[1], 'low_stock_threshold')).toBe('7:Lava:1|8:Lava:6')

    const { valid, errors } = csvRowsToProductInputs(rows, SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid[0]?.variants.map((v) => v.lowStockThreshold)).toEqual([1, 6])
    expect(valid[0]?.variants.every((v) => v.stock === 4)).toBe(true)
  })

  it('applies a legacy single stock value to every variant and defaults the threshold', () => {
    const legacy = [
      HEADER,
      'Legacy Clog,legacy-clog,Some description here,clogs,500,,draft,false,7|8,Lava:#B3261E|Ice:#DCE8F0,9,https://img/1',
    ].join('\r\n')

    const { valid, errors } = csvRowsToProductInputs(parseCsv(legacy), SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid[0]?.variants).toHaveLength(4)
    expect(valid[0]?.variants.every((v) => v.stock === 9 && v.lowStockThreshold === 5)).toBe(true)
  })

  it('rejects malformed, incomplete and stray per-variant cells', () => {
    const header = `${HEADER},low_stock_threshold`
    const text = [
      header,
      'Bad Number,bad-number,Some description here,clogs,500,,draft,false,7|8,Lava:#B3261E,7:Lava:x|8:Lava:2,https://img/1,',
      'Missing Entry,missing-entry,Some description here,clogs,500,,draft,false,7|8,Lava:#B3261E,7:Lava:3,https://img/1,',
      'Stray Entry,stray-entry,Some description here,clogs,500,,draft,false,7,Lava:#B3261E,7:Lava:3|9:Lava:1,https://img/1,',
      'Bad Threshold,bad-threshold,Some description here,clogs,500,,draft,false,7,Lava:#B3261E,3,https://img/1,nope',
    ].join('\r\n')

    const { valid, errors } = csvRowsToProductInputs(parseCsv(text), SEED_CATEGORIES)
    expect(valid).toEqual([])
    expect(errors.map((e) => e.row)).toEqual([1, 2, 3, 4])
    expect(errors.map((e) => e.message)).toEqual([
      'stock_per_variant entry "7:Lava:x" must be written as size:color:number.',
      'stock_per_variant has no entry for 8:Lava.',
      'stock_per_variant entry "9:Lava" matches no variant.',
      'low_stock_threshold must be a whole number.',
    ])
  })

  it('matches keyed entries regardless of case and accepts colors holding a colon', () => {
    const header = `${HEADER},low_stock_threshold`
    const text = [
      header,
      'Odd Names,odd-names,Some description here,clogs,500,,draft,false,7,Lava:Deep:#B3261E,7:lava:deep:6,https://img/1,7:LAVA:DEEP:1',
    ].join('\r\n')

    const { valid, errors } = csvRowsToProductInputs(parseCsv(text), SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid[0]?.variants).toEqual([
      expect.objectContaining({
        color: { name: 'Lava:Deep', hex: '#B3261E' },
        stock: 6,
        lowStockThreshold: 1,
      }),
    ])
  })
})
