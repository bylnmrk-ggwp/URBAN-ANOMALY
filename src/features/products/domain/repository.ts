import type { PaginatedResult } from '@/types/common'

import type {
  AdminProductFilters,
  Product,
  ProductFilters,
  ProductInput,
  ProductStatus,
} from './entities'

export interface ProductRepository {
  getPublishedProducts(filters: ProductFilters): Promise<PaginatedResult<Product>>
  getProductBySlug(slug: string): Promise<Product | null>
  getFeaturedProducts(limit: number): Promise<Product[]>
  getNewArrivals(limit: number): Promise<Product[]>
  getBestSellers(limit: number): Promise<Product[]>
  getRelatedProducts(productId: string, limit: number): Promise<Product[]>
  /** Resolve products by id for cart hydration and checkout revalidation. */
  getProductsByIds(ids: string[]): Promise<Product[]>

  // Admin
  getAdminProducts(filters: AdminProductFilters): Promise<PaginatedResult<Product>>
  getProductById(id: string): Promise<Product | null>
  createProduct(input: ProductInput): Promise<Product>
  updateProduct(id: string, input: ProductInput): Promise<Product>
  setProductStatus(id: string, status: ProductStatus): Promise<Product>
}
