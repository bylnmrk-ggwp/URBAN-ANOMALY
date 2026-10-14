import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { clone, matchesSearch, nowIso } from '@/mocks/helpers'
import type { PaginatedResult } from '@/types/common'
import { paginate } from '@/types/common'

import type {
  AdminProductFilters,
  AdminProductSort,
  Product,
  ProductFilters,
  ProductImage,
  ProductImageInput,
  ProductInput,
  ProductSort,
  ProductStatus,
  ProductVariant,
  ProductVariantInput,
} from '../domain/entities'
import type { ProductRepository } from '../domain/repository'
import { availableStock, getDisplayPrice, totalAvailableStock } from '../domain/rules'

const STOREFRONT_PAGE_SIZE = 12
const ADMIN_PAGE_SIZE = 20

export class MockProductRepository implements ProductRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async getPublishedProducts(filters: ProductFilters): Promise<PaginatedResult<Product>> {
    await this.store.delay()
    let items = this.published()

    if (filters.search) {
      items = items.filter((p) =>
        matchesSearch(filters.search, p.name, p.description, p.categoryName),
      )
    }
    if (filters.categorySlug) {
      items = items.filter((p) => p.categorySlug === filters.categorySlug)
    }
    const sizes = filters.sizes
    if (sizes && sizes.length > 0) {
      items = items.filter((p) =>
        p.variants.some((v) => sizes.includes(v.size) && availableStock(v) > 0),
      )
    }
    const colors = filters.colors?.map((c) => c.toLowerCase())
    if (colors && colors.length > 0) {
      items = items.filter((p) =>
        p.variants.some((v) => colors.includes(v.color.name.toLowerCase())),
      )
    }
    if (filters.minPrice !== undefined) {
      const min = filters.minPrice
      items = items.filter((p) => getDisplayPrice(p) >= min)
    }
    if (filters.maxPrice !== undefined) {
      const max = filters.maxPrice
      items = items.filter((p) => getDisplayPrice(p) <= max)
    }

    items = sortProducts(items, filters.sort ?? 'newest')
    return paginate(clone(items), filters.page ?? 1, filters.pageSize ?? STOREFRONT_PAGE_SIZE)
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    await this.store.delay()
    const product = this.store.products.find((p) => p.slug === slug && p.status === 'published')
    return product ? clone(product) : null
  }

  async getFeaturedProducts(limit: number): Promise<Product[]> {
    await this.store.delay()
    return clone(
      sortProducts(
        this.published().filter((p) => p.isFeatured),
        'best_selling',
      ).slice(0, limit),
    )
  }

  async getNewArrivals(limit: number): Promise<Product[]> {
    await this.store.delay()
    return clone(sortProducts(this.published(), 'newest').slice(0, limit))
  }

  async getBestSellers(limit: number): Promise<Product[]> {
    await this.store.delay()
    return clone(sortProducts(this.published(), 'best_selling').slice(0, limit))
  }

  async getRelatedProducts(productId: string, limit: number): Promise<Product[]> {
    await this.store.delay()
    const source = this.store.findProduct(productId)
    if (!source) return []
    return clone(
      sortProducts(
        this.published().filter((p) => p.id !== productId && p.categoryId === source.categoryId),
        'best_selling',
      ).slice(0, limit),
    )
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    await this.store.delay()
    const wanted = new Set(ids)
    return clone(this.store.products.filter((p) => wanted.has(p.id)))
  }

  async getAdminProducts(filters: AdminProductFilters): Promise<PaginatedResult<Product>> {
    await this.store.delay()
    let items = [...this.store.products]

    if (filters.search) {
      items = items.filter((p) =>
        matchesSearch(
          filters.search,
          p.name,
          p.slug,
          p.categoryName,
          ...p.variants.map((v) => v.sku),
        ),
      )
    }
    if (filters.status && filters.status !== 'all') {
      const status = filters.status
      items = items.filter((p) => p.status === status)
    }
    if (filters.categoryId) {
      items = items.filter((p) => p.categoryId === filters.categoryId)
    }

    items = sortProducts(items, filters.sort ?? 'newest')
    return paginate(clone(items), filters.page ?? 1, filters.pageSize ?? ADMIN_PAGE_SIZE)
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.store.delay()
    const product = this.store.findProduct(id)
    return product ? clone(product) : null
  }

  async createProduct(input: ProductInput): Promise<Product> {
    await this.store.delay()
    this.assertSlugAvailable(input.slug)
    const category = this.requireCategory(input.categoryId)
    const id = this.store.nextId('prod')
    const now = nowIso()
    const product: Product = {
      id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      details: input.details.filter((d) => d.trim().length > 0),
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      basePrice: input.basePrice,
      salePrice: input.salePrice,
      images: this.mapImages(input.images),
      variants: this.mapVariants(id, input.variants, []),
      status: input.status,
      isFeatured: input.isFeatured,
      salesCount: 0,
      seoTitle: input.seoTitle.trim(),
      seoDescription: input.seoDescription.trim(),
      createdAt: now,
      updatedAt: now,
    }
    this.store.products.unshift(product)
    return clone(product)
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    await this.store.delay()
    const index = this.store.products.findIndex((p) => p.id === id)
    const existing = this.store.products[index]
    if (!existing) throw AppError.notFound('Product')
    this.assertSlugAvailable(input.slug, id)
    const category = this.requireCategory(input.categoryId)
    const updated: Product = {
      ...existing,
      slug: input.slug,
      name: input.name,
      description: input.description,
      details: input.details.filter((d) => d.trim().length > 0),
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      basePrice: input.basePrice,
      salePrice: input.salePrice,
      images: this.mapImages(input.images, existing.images),
      variants: this.mapVariants(id, input.variants, existing.variants),
      status: input.status,
      isFeatured: input.isFeatured,
      seoTitle: input.seoTitle.trim(),
      seoDescription: input.seoDescription.trim(),
      updatedAt: nowIso(),
    }
    this.store.products[index] = updated
    return clone(updated)
  }

  async setProductStatus(id: string, status: ProductStatus): Promise<Product> {
    await this.store.delay()
    const product = this.store.findProduct(id)
    if (!product) throw AppError.notFound('Product')
    product.status = status
    product.updatedAt = nowIso()
    return clone(product)
  }

  private published(): Product[] {
    return this.store.products.filter((p) => p.status === 'published')
  }

  private assertSlugAvailable(slug: string, excludeId?: string) {
    const taken = this.store.products.some((p) => p.slug === slug && p.id !== excludeId)
    if (taken) throw new AppError('conflict', 'A product with this slug already exists.')
  }

  private requireCategory(categoryId: string) {
    const category = this.store.categories.find((c) => c.id === categoryId)
    if (!category) throw new AppError('validation', 'Choose a valid category.')
    return category
  }

  private mapImages(inputs: ProductImageInput[], existing: ProductImage[] = []): ProductImage[] {
    const hasPrimary = inputs.some((img) => img.isPrimary)
    return inputs.map((img, index) => {
      const previous = img.id ? existing.find((e) => e.id === img.id) : undefined
      return {
        id: previous?.id ?? img.id ?? this.store.nextId('img'),
        url: img.url,
        alt: img.alt,
        isPrimary: hasPrimary ? img.isPrimary : index === 0,
        sortOrder: index,
      }
    })
  }

  private mapVariants(
    productId: string,
    inputs: ProductVariantInput[],
    existing: ProductVariant[],
  ): ProductVariant[] {
    return inputs.map((v) => {
      const previous = v.id ? existing.find((e) => e.id === v.id) : undefined
      return {
        id: previous?.id ?? v.id ?? this.store.nextId('var'),
        productId,
        sku: v.sku,
        size: v.size,
        color: { ...v.color },
        stock: v.stock,
        reservedStock: previous?.reservedStock ?? 0,
        lowStockThreshold: v.lowStockThreshold,
      }
    })
  }
}

function sortProducts(items: Product[], sort: ProductSort | AdminProductSort): Product[] {
  const sorted = [...items]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case 'price_asc':
      return sorted.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b))
    case 'price_desc':
      return sorted.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a))
    case 'best_selling':
      return sorted.sort((a, b) => b.salesCount - a.salesCount)
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'stock_asc':
      return sorted.sort((a, b) => totalAvailableStock(a) - totalAvailableStock(b))
  }
}
