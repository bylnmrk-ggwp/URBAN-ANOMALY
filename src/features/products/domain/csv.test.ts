import { describe, expect, it } from 'vitest'

import { SEED_CATEGORIES } from '@/mocks/data/categories'
import { SEED_PRODUCTS } from '@/mocks/data/products'

import { PRODUCT_CSV_COLUMNS, csvRowsToProductInputs, parseCsv, productsToCsv } from './csv'

const HEADER =
  'name,slug,description,category_slug,base_price,sale_price,status,is_featured,sizes,colors,stock_per_variant,image_urls'

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
  const clogs = SEED_CATEGORIES.find((c) => c.slug === 'clogs')
  if (!clogs) throw new Error('seed category missing')

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
      categoryId: clogs.id,
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
    const csv = productsToCsv(SEED_PRODUCTS.slice(0, 3))
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual([...PRODUCT_CSV_COLUMNS])
    expect(rows).toHaveLength(4)

    const { valid, errors } = csvRowsToProductInputs(rows, SEED_CATEGORIES)
    expect(errors).toEqual([])
    expect(valid.map((p) => p.slug)).toEqual(SEED_PRODUCTS.slice(0, 3).map((p) => p.slug))
  })
})
