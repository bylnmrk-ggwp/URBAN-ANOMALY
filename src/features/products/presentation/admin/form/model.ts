import type { UseFormReturn } from 'react-hook-form'

import type { Product, ProductColor, ProductInput, ProductSize } from '../../../domain/entities'
import { generateSku, uniqueColors, uniqueSizes } from '../../../domain/rules'
import type { ProductFormInput, ProductFormValues } from '../../../domain/schema'

export type ProductFormApi = UseFormReturn<ProductFormInput, unknown, ProductFormValues>
export type VariantFormRow = ProductFormInput['variants'][number]

export const DEFAULT_LOW_STOCK_THRESHOLD = 5

/** Coerced numeric fields are typed `unknown` on the input side; keep inputs controlled. */
export function inputValue(value: unknown): string | number {
  return typeof value === 'number' || typeof value === 'string' ? value : ''
}

export function emptyProductForm(): ProductFormInput {
  return {
    name: '',
    slug: '',
    description: '',
    details: [],
    categoryId: '',
    basePrice: '',
    salePrice: null,
    status: 'draft',
    isFeatured: false,
    seoTitle: '',
    seoDescription: '',
    images: [],
    sizes: [],
    colors: [],
    variants: [],
  }
}

export function productToFormValues(product: Product): ProductFormInput {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    details: [...product.details],
    categoryId: product.categoryId,
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    status: product.status,
    isFeatured: product.isFeatured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({ id: img.id, url: img.url, alt: img.alt, isPrimary: img.isPrimary })),
    sizes: uniqueSizes(product),
    colors: uniqueColors(product),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: { ...v.color },
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
    })),
  }
}

export function formValuesToInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    details: values.details.map((d) => d.trim()).filter(Boolean),
    categoryId: values.categoryId,
    basePrice: values.basePrice,
    salePrice: values.salePrice,
    status: values.status,
    isFeatured: values.isFeatured,
    seoTitle: values.seoTitle ?? '',
    seoDescription: values.seoDescription ?? '',
    images: values.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
    })),
    variants: values.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
    })),
  }
}

/**
 * Builds the size x color matrix. Rows that already exist for the same size
 * and color name are preserved (id, SKU, stock, threshold); new combinations
 * get a generated SKU and zero stock.
 */
export function buildVariantRows(
  productName: string,
  sizes: ProductSize[],
  colors: ProductColor[],
  existing: VariantFormRow[],
): VariantFormRow[] {
  const rows: VariantFormRow[] = []
  for (const size of sizes) {
    for (const color of colors) {
      const match = existing.find((v) => v.size === size && v.color.name === color.name)
      rows.push(
        match
          ? { ...match, color: { ...color } }
          : {
              sku: generateSku(productName, size, color.name),
              size,
              color: { ...color },
              stock: 0,
              lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
            },
      )
    }
  }
  return rows
}
