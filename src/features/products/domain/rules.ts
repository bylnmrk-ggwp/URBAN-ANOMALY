import type { Product, ProductBadge, ProductColor, ProductSize, ProductVariant } from './entities'
import { NEW_PRODUCT_WINDOW_DAYS, PRODUCT_SIZES } from './entities'

export function availableStock(variant: Pick<ProductVariant, 'stock' | 'reservedStock'>): number {
  return Math.max(0, variant.stock - variant.reservedStock)
}

export function totalAvailableStock(product: Pick<Product, 'variants'>): number {
  return product.variants.reduce((sum, v) => sum + availableStock(v), 0)
}

export function totalPhysicalStock(product: Pick<Product, 'variants'>): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0)
}

export function isOnSale(product: Pick<Product, 'basePrice' | 'salePrice'>): boolean {
  return product.salePrice !== null && product.salePrice < product.basePrice
}

export function getDisplayPrice(product: Pick<Product, 'basePrice' | 'salePrice'>): number {
  return isOnSale(product) && product.salePrice !== null ? product.salePrice : product.basePrice
}

export function getDiscountPercent(product: Pick<Product, 'basePrice' | 'salePrice'>): number {
  if (!isOnSale(product) || product.salePrice === null) return 0
  return Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
}

export function isNewProduct(product: Pick<Product, 'createdAt'>, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - new Date(product.createdAt).getTime()
  return ageMs <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

export function isSoldOut(product: Pick<Product, 'variants'>): boolean {
  return totalAvailableStock(product) === 0
}

export function getProductBadge(
  product: Pick<Product, 'variants' | 'basePrice' | 'salePrice' | 'createdAt'>,
  now: Date = new Date(),
): ProductBadge | null {
  if (isSoldOut(product)) return 'sold_out'
  if (isOnSale(product)) return 'sale'
  if (isNewProduct(product, now)) return 'new'
  return null
}

export function getPrimaryImage(product: Pick<Product, 'images'>) {
  return product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null
}

export function uniqueColors(product: Pick<Product, 'variants'>): ProductColor[] {
  const seen = new Map<string, ProductColor>()
  for (const v of product.variants) {
    if (!seen.has(v.color.name)) seen.set(v.color.name, v.color)
  }
  return [...seen.values()]
}

export function uniqueSizes(product: Pick<Product, 'variants'>): ProductSize[] {
  const present = new Set(product.variants.map((v) => v.size))
  return PRODUCT_SIZES.filter((s) => present.has(s))
}

export function findVariant(
  product: Pick<Product, 'variants'>,
  size: ProductSize | null,
  colorName: string | null,
): ProductVariant | null {
  if (!size || !colorName) return null
  return product.variants.find((v) => v.size === size && v.color.name === colorName) ?? null
}

/** True when at least one variant with this size (for the given color, if any) is purchasable. */
export function isSizeAvailable(
  product: Pick<Product, 'variants'>,
  size: ProductSize,
  colorName: string | null,
): boolean {
  return product.variants.some(
    (v) => v.size === size && (!colorName || v.color.name === colorName) && availableStock(v) > 0,
  )
}

export function isColorAvailable(
  product: Pick<Product, 'variants'>,
  colorName: string,
  size: ProductSize | null,
): boolean {
  return product.variants.some(
    (v) => v.color.name === colorName && (!size || v.size === size) && availableStock(v) > 0,
  )
}

export function clampQuantity(quantity: number, variant: ProductVariant | null): number {
  const max = variant ? availableStock(variant) : 1
  return Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, max))
}

export function generateSku(productName: string, size: string, colorName: string): string {
  const prefix = productName
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('')
  const color = colorName
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase()
  return `${prefix}-${color}-${size}`
}
