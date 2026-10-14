import type { Category } from '@/features/categories/domain/entities'

import type { Product, ProductColor, ProductInput, ProductSize, ProductStatus } from './entities'
import { PRODUCT_SIZES } from './entities'
import { generateSku } from './rules'
import { productFormSchema } from './schema'

/**
 * Product CSV column set (header row required, order free, names case-insensitive):
 *
 * | column            | format                                   | notes                         |
 * | ----------------- | ---------------------------------------- | ----------------------------- |
 * | name              | text                                     | required                      |
 * | slug              | lowercase-hyphens                        | required                      |
 * | description       | text                                     | required (>= 10 chars)        |
 * | category_slug     | existing category slug                   | required                      |
 * | base_price        | number                                   | required                      |
 * | sale_price        | number or empty                          | optional                      |
 * | status            | draft | published | archived             | default `draft`               |
 * | is_featured       | true | false | 1 | 0 | yes | no          | default `false`               |
 * | sizes             | "S|M|L"                                  | required, from PRODUCT_SIZES  |
 * | colors            | "Black:#111111|Ecru:#E8E2D6"             | required, name:hex            |
 * | stock_per_variant | integer                                  | default 0                     |
 * | image_urls        | "https://a|https://b"                    | required, first is primary    |
 * | seo_title         | text (<= 70)                             | optional                      |
 * | seo_description   | text (<= 160)                            | optional                      |
 * | details           | "100% cotton|Machine wash"               | optional                      |
 *
 * Variants are generated as size x color with `generateSku`.
 */
export const PRODUCT_CSV_COLUMNS = [
  'name',
  'slug',
  'description',
  'category_slug',
  'base_price',
  'sale_price',
  'status',
  'is_featured',
  'sizes',
  'colors',
  'stock_per_variant',
  'image_urls',
  'seo_title',
  'seo_description',
  'details',
] as const
export type ProductCsvColumn = (typeof PRODUCT_CSV_COLUMNS)[number]

const LIST_SEPARATOR = '|'
const DEFAULT_LOW_STOCK_THRESHOLD = 5

/** RFC 4180 parser: quoted fields, doubled quotes, embedded newlines, CRLF or LF line ends. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.startsWith('﻿') ? text.slice(1) : text

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop fully blank trailing/interior lines.
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

function escapeCsv(value: string | number | boolean | null): string {
  const s = value === null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Serialises products using the documented column set (header row first, CRLF line ends). */
export function productsToCsv(products: Product[]): string {
  const lines = [PRODUCT_CSV_COLUMNS.join(',')]
  for (const p of products) {
    const sizes = [...new Set(p.variants.map((v) => v.size))].sort(
      (a, b) => PRODUCT_SIZES.indexOf(a) - PRODUCT_SIZES.indexOf(b),
    )
    const colors = new Map<string, string>()
    for (const v of p.variants) colors.set(v.color.name, v.color.hex)
    const stock = p.variants[0]?.stock ?? 0
    const images = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.url)
    const values: Record<ProductCsvColumn, string | number | boolean | null> = {
      name: p.name,
      slug: p.slug,
      description: p.description,
      category_slug: p.categorySlug,
      base_price: p.basePrice,
      sale_price: p.salePrice,
      status: p.status,
      is_featured: p.isFeatured,
      sizes: sizes.join(LIST_SEPARATOR),
      colors: [...colors.entries()].map(([n, hex]) => `${n}:${hex}`).join(LIST_SEPARATOR),
      stock_per_variant: stock,
      image_urls: images.join(LIST_SEPARATOR),
      seo_title: p.seoTitle,
      seo_description: p.seoDescription,
      details: p.details.join(LIST_SEPARATOR),
    }
    lines.push(PRODUCT_CSV_COLUMNS.map((c) => escapeCsv(values[c])).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

export interface CsvRowError {
  /** 1-based data row number (header is row 0). */
  row: number
  message: string
}

export interface CsvImportResult {
  valid: ProductInput[]
  errors: CsvRowError[]
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(LIST_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseBool(value: string | undefined): boolean | null {
  const v = (value ?? '').trim().toLowerCase()
  if (v === '' || v === 'false' || v === '0' || v === 'no') return false
  if (v === 'true' || v === '1' || v === 'yes') return true
  return null
}

function isSize(value: string): value is ProductSize {
  return (PRODUCT_SIZES as readonly string[]).includes(value)
}

function isStatus(value: string): value is ProductStatus {
  return value === 'draft' || value === 'published' || value === 'archived'
}

function parseColors(raw: string[]): { colors: ProductColor[]; error: string | null } {
  const colors: ProductColor[] = []
  for (const entry of raw) {
    const idx = entry.lastIndexOf(':')
    if (idx === -1) return { colors, error: `Color "${entry}" must be written as Name:#RRGGBB.` }
    const name = entry.slice(0, idx).trim()
    const hex = entry.slice(idx + 1).trim()
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return { colors, error: `Color "${entry}" must be written as Name:#RRGGBB.` }
    }
    colors.push({ name, hex })
  }
  return { colors, error: null }
}

/**
 * Maps parsed CSV rows (header first) to `ProductInput`s, validating each row with
 * `productFormSchema`. Rows that fail are reported with a 1-based row number.
 */
export function csvRowsToProductInputs(rows: string[][], categories: Category[]): CsvImportResult {
  const result: CsvImportResult = { valid: [], errors: [] }
  const [header, ...data] = rows
  if (!header) {
    result.errors.push({ row: 0, message: 'The file is empty.' })
    return result
  }
  const index = new Map<string, number>()
  header.forEach((h, i) => index.set(h.trim().toLowerCase(), i))
  const missing = (['name', 'slug', 'category_slug', 'base_price'] as const).filter(
    (c) => !index.has(c),
  )
  if (missing.length > 0) {
    result.errors.push({ row: 0, message: `Missing required column(s): ${missing.join(', ')}.` })
    return result
  }
  const categoryBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c]))
  const seenSlugs = new Set<string>()

  data.forEach((cells, i) => {
    const rowNumber = i + 1
    const get = (col: ProductCsvColumn) => {
      const at = index.get(col)
      return at === undefined ? undefined : cells[at]?.trim()
    }
    const fail = (message: string) => result.errors.push({ row: rowNumber, message })

    const category = categoryBySlug.get((get('category_slug') ?? '').toLowerCase())
    if (!category) return fail(`Unknown category "${get('category_slug') ?? ''}".`)

    const sizes = splitList(get('sizes'))
    const badSize = sizes.find((s) => !isSize(s))
    if (badSize !== undefined) return fail(`Unknown size "${badSize}".`)

    const { colors, error: colorError } = parseColors(splitList(get('colors')))
    if (colorError) return fail(colorError)

    const statusRaw = (get('status') || 'draft').toLowerCase()
    if (!isStatus(statusRaw)) return fail(`Unknown status "${statusRaw}".`)

    const featured = parseBool(get('is_featured'))
    if (featured === null) return fail(`is_featured must be true or false.`)

    const stockRaw = get('stock_per_variant') || '0'
    const stock = Number(stockRaw)
    if (!Number.isInteger(stock) || stock < 0)
      return fail('stock_per_variant must be a whole number.')

    const name = get('name') ?? ''
    const salePriceRaw = get('sale_price') ?? ''
    const variants = sizes.flatMap((size) =>
      colors.map((color) => ({
        sku: generateSku(name, size, color.name),
        size: size as ProductSize,
        color,
        stock,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      })),
    )
    const images = splitList(get('image_urls')).map((url, n) => ({
      url,
      alt: n === 0 ? name : `${name} - view ${n + 1}`,
      isPrimary: n === 0,
    }))

    const parsed = productFormSchema.safeParse({
      name,
      slug: get('slug') ?? '',
      description: get('description') ?? '',
      details: splitList(get('details')),
      categoryId: category.id,
      basePrice: get('base_price') ?? '',
      salePrice: salePriceRaw === '' ? null : salePriceRaw,
      status: statusRaw,
      isFeatured: featured,
      seoTitle: get('seo_title') ?? '',
      seoDescription: get('seo_description') ?? '',
      images,
      sizes,
      colors,
      variants,
    })
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      const where = first?.path.length ? `${String(first.path[0])}: ` : ''
      return fail(`${where}${first?.message ?? 'Invalid row.'}`)
    }
    const slug = parsed.data.slug
    if (seenSlugs.has(slug)) return fail(`Duplicate slug "${slug}" in this file.`)
    seenSlugs.add(slug)

    result.valid.push({
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      details: parsed.data.details.filter(Boolean),
      categoryId: parsed.data.categoryId,
      basePrice: parsed.data.basePrice,
      salePrice: parsed.data.salePrice,
      status: parsed.data.status,
      isFeatured: parsed.data.isFeatured,
      seoTitle: parsed.data.seoTitle ?? '',
      seoDescription: parsed.data.seoDescription ?? '',
      images: parsed.data.images,
      variants: parsed.data.variants,
    })
  })

  return result
}
