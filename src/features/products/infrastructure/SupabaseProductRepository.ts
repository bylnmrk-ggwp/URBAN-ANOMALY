import type {
  AdminProductFilters,
  Product,
  ProductFilters,
  ProductInput,
  ProductStatus,
} from '@/features/products/domain/entities'
import type { ProductRepository } from '@/features/products/domain/repository'
import { totalPhysicalStock } from '@/features/products/domain/rules'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { toProductFromJoin, unwrap } from '@/lib/supabase/mappers'
import type { ProductJoinRow } from '@/lib/supabase/mappers'
import type { PaginatedResult } from '@/types/common'

const DEFAULT_PAGE_SIZE = 12

/**
 * Full product graph. `categories!inner` is safe because `category_id` is NOT NULL.
 * `variant_filter` is a second, aliased embed used only to filter by size/colour so that
 * `product_variants(*)` still returns every variant of the matching products.
 */
const PRODUCT_SELECT = '*, product_images(*), product_variants(*), categories!inner(*)'
const PRODUCT_SELECT_WITH_VARIANT_FILTER = `${PRODUCT_SELECT}, variant_filter:product_variants!inner(id)`

type JoinRowWithFilter = ProductJoinRow & { variant_filter?: { id: string }[] }

function sanitizeSearch(term: string): string {
  // Commas and parentheses have meaning inside PostgREST `or()` filters.
  return term.replace(/[,()]/g, ' ').trim()
}

function stripFilterEmbed(row: JoinRowWithFilter): ProductJoinRow {
  const { variant_filter: _ignored, ...rest } = row
  return rest
}

export class SupabaseProductRepository implements ProductRepository {
  private get db() {
    return getSupabaseClient()
  }

  async getPublishedProducts(filters: ProductFilters): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
    const from = (page - 1) * pageSize
    const hasVariantFilter = Boolean(filters.sizes?.length || filters.colors?.length)

    let query = this.db
      .from('products')
      .select(hasVariantFilter ? PRODUCT_SELECT_WITH_VARIANT_FILTER : PRODUCT_SELECT, {
        count: 'exact',
      })
      .eq('status', 'published')

    if (filters.categorySlug) query = query.eq('categories.slug', filters.categorySlug)
    if (filters.sizes?.length) query = query.in('variant_filter.size', filters.sizes)
    if (filters.colors?.length) query = query.in('variant_filter.color_name', filters.colors)
    if (filters.minPrice !== undefined) query = query.gte('display_price', filters.minPrice)
    if (filters.maxPrice !== undefined) query = query.lte('display_price', filters.maxPrice)
    if (filters.search) {
      const term = sanitizeSearch(filters.search)
      if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    switch (filters.sort ?? 'newest') {
      case 'price_asc':
        query = query.order('display_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('display_price', { ascending: false })
        break
      case 'best_selling':
        query = query.order('sales_count', { ascending: false })
        break
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }
    query = query.order('id', { ascending: true }).range(from, from + pageSize - 1)

    const result = await query.overrideTypes<JoinRowWithFilter[], { merge: false }>()
    const rows = unwrap(result)
    const total = result.count ?? rows.length
    return {
      items: rows.map((r) => toProductFromJoin(stripFilterEmbed(r))),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('slug', slug)
      .maybeSingle()
      .overrideTypes<ProductJoinRow | null, { merge: false }>()
    const row = unwrap(result)
    return row ? toProductFromJoin(row) : null
  }

  async getFeaturedProducts(limit: number): Promise<Product[]> {
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .overrideTypes<ProductJoinRow[], { merge: false }>()
    return unwrap(result).map(toProductFromJoin)
  }

  async getNewArrivals(limit: number): Promise<Product[]> {
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)
      .overrideTypes<ProductJoinRow[], { merge: false }>()
    return unwrap(result).map(toProductFromJoin)
  }

  async getBestSellers(limit: number): Promise<Product[]> {
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .order('sales_count', { ascending: false })
      .limit(limit)
      .overrideTypes<ProductJoinRow[], { merge: false }>()
    return unwrap(result).map(toProductFromJoin)
  }

  async getRelatedProducts(productId: string, limit: number): Promise<Product[]> {
    const source = unwrap(
      await this.db.from('products').select('category_id').eq('id', productId).maybeSingle(),
    )
    if (!source) return []
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .eq('category_id', source.category_id)
      .neq('id', productId)
      .order('sales_count', { ascending: false })
      .limit(limit)
      .overrideTypes<ProductJoinRow[], { merge: false }>()
    return unwrap(result).map(toProductFromJoin)
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return []
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', ids)
      .overrideTypes<ProductJoinRow[], { merge: false }>()
    return unwrap(result).map(toProductFromJoin)
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async getAdminProducts(filters: AdminProductFilters): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = filters.pageSize ?? 20
    const from = (page - 1) * pageSize

    let query = this.db.from('products').select(PRODUCT_SELECT, { count: 'exact' })

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.search) {
      const term = sanitizeSearch(filters.search)
      if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
    }

    switch (filters.sort ?? 'newest') {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'name_asc':
        query = query.order('name', { ascending: true })
        break
      case 'price_asc':
        query = query.order('display_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('display_price', { ascending: false })
        break
      case 'stock_asc':
        // Total stock is an aggregate over variants and cannot be ordered server-side with
        // PostgREST; rows are ordered by name on the server and re-sorted by stock within
        // the fetched page below.
        query = query.order('name', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }
    query = query.order('id', { ascending: true }).range(from, from + pageSize - 1)

    const result = await query.overrideTypes<ProductJoinRow[], { merge: false }>()
    const rows = unwrap(result)
    let items = rows.map(toProductFromJoin)
    if (filters.sort === 'stock_asc') {
      items = [...items].sort((a, b) => totalPhysicalStock(a) - totalPhysicalStock(b))
    }
    const total = result.count ?? rows.length
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    const result = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<ProductJoinRow | null, { merge: false }>()
    const row = unwrap(result)
    return row ? toProductFromJoin(row) : null
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const id = await this.saveProduct(null, input)
    return this.requireProduct(id)
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const savedId = await this.saveProduct(id, input)
    return this.requireProduct(savedId)
  }

  async setProductStatus(id: string, status: ProductStatus): Promise<Product> {
    unwrap(await this.db.from('products').update({ status }).eq('id', id))
    return this.requireProduct(id)
  }

  /**
   * Product + images + variants are written in one transaction by the `save_product`
   * SECURITY DEFINER function, which also records inventory movements for stock changes.
   */
  private async saveProduct(id: string | null, input: ProductInput): Promise<string> {
    const payload: Json = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      details: input.details,
      category_id: input.categoryId,
      base_price: input.basePrice,
      sale_price: input.salePrice,
      status: input.status,
      is_featured: input.isFeatured,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      images: input.images.map((img, index) => ({
        id: img.id ?? null,
        url: img.url,
        alt: img.alt,
        is_primary: img.isPrimary,
        sort_order: index,
      })),
      variants: input.variants.map((v) => ({
        id: v.id ?? null,
        sku: v.sku,
        size: v.size,
        color_name: v.color.name,
        color_hex: v.color.hex,
        stock: v.stock,
        low_stock_threshold: v.lowStockThreshold,
      })),
    }
    const result = await this.db.rpc('save_product', { p_product_id: id, p_payload: payload })
    return unwrap(result)
  }

  private async requireProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id)
    if (!product) throw AppError.notFound('Product')
    return product
  }
}
