import type { Category } from '@/features/categories/domain/entities'

import type {
  Product,
  ProductColor,
  ProductInput,
  ProductSize,
  ProductStatus,
  ProductVariant,
  ProductVariantInput,
} from './entities'
import { PRODUCT_SIZES } from './entities'
import { generateSku } from './rules'
import { productFormSchema } from './schema'

/**
 * Product CSV column set (header row required, order free, names case-insensitive):
 *
 * | column              | format                              | notes                         |
 * | ------------------- | ----------------------------------- | ----------------------------- |
 * | name                | text                                | required                      |
 * | slug                | lowercase-hyphens                   | required                      |
 * | description         | text                                | required (>= 10 chars)        |
 * | category_slug       | existing category slug              | required                      |
 * | base_price          | number                              | required                      |
 * | sale_price          | number or empty                     | optional                      |
 * | status              | draft | published | archived        | default `draft`               |
 * | is_featured         | true | false | 1 | 0 | yes | no     | default `false`               |
 * | sizes               | "7|8|9"                             | required, from PRODUCT_SIZES  |
 * | colors              | "Black:#111111|Ecru:#E8E2D6"        | required, name:hex            |
 * | stock_per_variant   | integer or "7:Lava:12|8:Lava:0"     | default 0, see below          |
 * | image_urls          | "https://a|https://b"               | required, first is primary    |
 * | seo_title           | text (<= 70)                        | optional                      |
 * | seo_description     | text (<= 160)                       | optional                      |
 * | details             | "100% cotton|Machine wash"          | optional                      |
 * | low_stock_threshold | integer or "7:Lava:2|8:Lava:5"      | default 5, see below          |
 *
 * `PRODUCT_CSV_COLUMNS` fixes the export order. Later columns are appended rather than inserted,
 * so a file written by an earlier build still imports with its own columns in place.
 *
 * Variants are generated as size x color with `generateSku`. The two per-variant number columns
 * accept either shape:
 *
 * - a single integer, which every variant of the row receives (what earlier exports wrote);
 * - a `size:color:number` list joined with `|`, which gives each variant its own value. Such a
 *   list has to name every generated variant exactly once: a missing or unrecognised entry fails
 *   the row instead of guessing a number. `productsToCsv` writes this shape only when the
 *   variants disagree, so a product with uniform stock still exports as a single integer.
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
  'low_stock_threshold',
] as const
export type ProductCsvColumn = (typeof PRODUCT_CSV_COLUMNS)[number]

const LIST_SEPARATOR = '|'
/** Separates the parts of a pair, as in `Name:#RRGGBB` and `size:color:number`. */
const PAIR_SEPARATOR = ':'
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

/** Names one variant inside the per-variant number columns, ignoring case. */
function variantKey(size: string, colorName: string): string {
  return `${size}${PAIR_SEPARATOR}${colorName}`.toLowerCase()
}

/**
 * Renders a per-variant number column: a single value while the variants agree, otherwise the
 * `size:color:number` list. A product without variants falls back to `whenEmpty`.
 */
function variantNumbersToCell(
  variants: ProductVariant[],
  read: (variant: ProductVariant) => number,
  whenEmpty: number,
): string | number {
  const first = variants[0]
  if (!first) return whenEmpty
  const shared = read(first)
  if (variants.every((v) => read(v) === shared)) return shared
  return variants
    .map((v) => `${v.size}${PAIR_SEPARATOR}${v.color.name}${PAIR_SEPARATOR}${read(v)}`)
    .join(LIST_SEPARATOR)
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
    // Listing variants in the size x color order the importer regenerates keeps the per-variant
    // cells readable next to the sizes and colors columns.
    const colorOrder = new Map([...colors.keys()].map((name, i) => [name, i] as const))
    const variants = [...p.variants].sort((a, b) => {
      const bySize = PRODUCT_SIZES.indexOf(a.size) - PRODUCT_SIZES.indexOf(b.size)
      if (bySize !== 0) return bySize
      return (colorOrder.get(a.color.name) ?? 0) - (colorOrder.get(b.color.name) ?? 0)
    })
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
      colors: [...colors.entries()]
        .map(([n, hex]) => `${n}${PAIR_SEPARATOR}${hex}`)
        .join(LIST_SEPARATOR),
      stock_per_variant: variantNumbersToCell(variants, (v) => v.stock, 0),
      image_urls: images.join(LIST_SEPARATOR),
      seo_title: p.seoTitle,
      seo_description: p.seoDescription,
      details: p.details.join(LIST_SEPARATOR),
      low_stock_threshold: variantNumbersToCell(
        variants,
        (v) => v.lowStockThreshold,
        DEFAULT_LOW_STOCK_THRESHOLD,
      ),
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
    const idx = entry.lastIndexOf(PAIR_SEPARATOR)
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

/** A single number the whole row shares, which is all an older file could express. */
interface UniformVariantNumbers {
  kind: 'uniform'
  value: number
}

/** One number per variant, each keeping the `size:color` text the file wrote for its messages. */
interface KeyedVariantNumbers {
  kind: 'keyed'
  byVariant: Map<string, { value: number; label: string }>
}

/** One of the two shapes a per-variant number column may hold. */
type VariantNumbers = UniformVariantNumbers | KeyedVariantNumbers

/**
 * Reads a per-variant number column. A cell holding no pair separator is a single number for the
 * whole row, which is how every file written before the keyed shape existed stores its stock;
 * anything else is read as a `size:color:number` list.
 */
function parseVariantNumbers(
  raw: string | undefined,
  column: ProductCsvColumn,
  whenEmpty: number,
): { numbers: VariantNumbers; error: string | null } {
  const uniform = (value: number) => ({
    numbers: { kind: 'uniform' as const, value },
    error: null,
  })
  const reject = (message: string) => ({
    numbers: { kind: 'uniform' as const, value: whenEmpty },
    error: message,
  })

  const cell = (raw ?? '').trim()
  if (cell === '') return uniform(whenEmpty)
  if (!cell.includes(PAIR_SEPARATOR)) {
    const value = Number(cell)
    if (!Number.isInteger(value) || value < 0) return reject(`${column} must be a whole number.`)
    return uniform(value)
  }

  const byVariant: KeyedVariantNumbers['byVariant'] = new Map()
  for (const entry of splitList(cell)) {
    const shape = `${column} entry "${entry}" must be written as size:color:number.`
    const sizeEnd = entry.indexOf(PAIR_SEPARATOR)
    const numberStart = entry.lastIndexOf(PAIR_SEPARATOR)
    if (sizeEnd === numberStart) return reject(shape)
    const size = entry.slice(0, sizeEnd).trim()
    // Everything between the two outer separators is the color name, which may contain a colon.
    const colorName = entry.slice(sizeEnd + 1, numberStart).trim()
    const numberRaw = entry.slice(numberStart + 1).trim()
    const value = Number(numberRaw)
    if (!size || !colorName || numberRaw === '' || !Number.isInteger(value) || value < 0) {
      return reject(shape)
    }
    const label = `${size}${PAIR_SEPARATOR}${colorName}`
    const key = variantKey(size, colorName)
    if (byVariant.has(key)) return reject(`${column} lists "${label}" twice.`)
    byVariant.set(key, { value, label })
  }
  return { numbers: { kind: 'keyed', byVariant }, error: null }
}

function numberFor(numbers: VariantNumbers, key: string): number | null {
  if (numbers.kind === 'uniform') return numbers.value
  return numbers.byVariant.get(key)?.value ?? null
}

/** The first keyed entry that matched none of the generated variants, if there is one. */
function unmatchedLabel(numbers: VariantNumbers, generated: Set<string>): string | null {
  if (numbers.kind === 'uniform') return null
  const stray = [...numbers.byVariant.entries()].find(([key]) => !generated.has(key))
  return stray?.[1].label ?? null
}

/**
 * Pairs every size with every color and gives each variant the stock and low-stock threshold its
 * row asked for. A keyed column has to cover the generated variants exactly, so that renaming a
 * size or color is reported rather than silently importing a zero.
 */
function buildVariants(
  name: string,
  sizes: ProductSize[],
  colors: ProductColor[],
  stock: VariantNumbers,
  threshold: VariantNumbers,
): { variants: ProductVariantInput[]; error: string | null } {
  const variants: ProductVariantInput[] = []
  const generated = new Set<string>()
  for (const size of sizes) {
    for (const color of colors) {
      const key = variantKey(size, color.name)
      generated.add(key)
      const stockValue = numberFor(stock, key)
      if (stockValue === null) {
        return { variants, error: `stock_per_variant has no entry for ${size}:${color.name}.` }
      }
      const thresholdValue = numberFor(threshold, key)
      if (thresholdValue === null) {
        return { variants, error: `low_stock_threshold has no entry for ${size}:${color.name}.` }
      }
      variants.push({
        sku: generateSku(name, size, color.name),
        size,
        color,
        stock: stockValue,
        lowStockThreshold: thresholdValue,
      })
    }
  }
  const strayStock = unmatchedLabel(stock, generated)
  if (strayStock !== null) {
    return { variants, error: `stock_per_variant entry "${strayStock}" matches no variant.` }
  }
  const strayThreshold = unmatchedLabel(threshold, generated)
  if (strayThreshold !== null) {
    return { variants, error: `low_stock_threshold entry "${strayThreshold}" matches no variant.` }
  }
  return { variants, error: null }
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

    const stock = parseVariantNumbers(get('stock_per_variant'), 'stock_per_variant', 0)
    if (stock.error) return fail(stock.error)
    const threshold = parseVariantNumbers(
      get('low_stock_threshold'),
      'low_stock_threshold',
      DEFAULT_LOW_STOCK_THRESHOLD,
    )
    if (threshold.error) return fail(threshold.error)

    const name = get('name') ?? ''
    const salePriceRaw = get('sale_price') ?? ''
    const { variants, error: variantError } = buildVariants(
      name,
      sizes.filter(isSize),
      colors,
      stock.numbers,
      threshold.numbers,
    )
    if (variantError) return fail(variantError)
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
