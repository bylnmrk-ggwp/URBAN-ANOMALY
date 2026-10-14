import type { ISODateString } from '@/types/common'

export type ProductStatus = 'draft' | 'published' | 'archived'

/** US unisex footwear sizes carried by the store. */
export const PRODUCT_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12'] as const
export type ProductSize = (typeof PRODUCT_SIZES)[number]

export interface ProductColor {
  name: string
  hex: string
}

export interface ProductImage {
  id: string
  url: string
  alt: string
  isPrimary: boolean
  sortOrder: number
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  size: ProductSize
  color: ProductColor
  /** Physical units on hand. */
  stock: number
  /** Units held by unpaid or unconfirmed orders. */
  reservedStock: number
  lowStockThreshold: number
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  details: string[]
  categoryId: string
  categoryName: string
  categorySlug: string
  basePrice: number
  salePrice: number | null
  images: ProductImage[]
  variants: ProductVariant[]
  status: ProductStatus
  isFeatured: boolean
  salesCount: number
  /** Optional search-engine title; falls back to the product name when empty. */
  seoTitle: string
  /** Optional meta description; falls back to the first 160 chars of the description. */
  seoDescription: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'name_asc'

export interface ProductFilters {
  search?: string
  categorySlug?: string
  sizes?: ProductSize[]
  colors?: string[]
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
  page?: number
  pageSize?: number
}

export type AdminProductSort =
  'newest' | 'oldest' | 'name_asc' | 'price_asc' | 'price_desc' | 'stock_asc'

export interface AdminProductFilters {
  search?: string
  status?: ProductStatus | 'all'
  categoryId?: string
  sort?: AdminProductSort
  page?: number
  pageSize?: number
}

export interface ProductVariantInput {
  id?: string
  sku: string
  size: ProductSize
  color: ProductColor
  stock: number
  lowStockThreshold: number
}

export interface ProductImageInput {
  id?: string
  url: string
  alt: string
  isPrimary: boolean
}

export interface ProductInput {
  name: string
  slug: string
  description: string
  details: string[]
  categoryId: string
  basePrice: number
  salePrice: number | null
  status: ProductStatus
  isFeatured: boolean
  seoTitle: string
  seoDescription: string
  images: ProductImageInput[]
  variants: ProductVariantInput[]
}

export type ProductBadge = 'new' | 'sale' | 'sold_out'

export const NEW_PRODUCT_WINDOW_DAYS = 30
