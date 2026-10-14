import type { Category, CategoryInput } from '@/features/categories/domain/entities'
import type { CategoryRepository } from '@/features/categories/domain/repository'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toCategory, unwrap } from '@/lib/supabase/mappers'
import type { CategoryRow } from '@/lib/supabase/mappers'

/** `products(count)` embeds an aggregate; filtered to published rows so counts match the storefront. */
const CATEGORY_SELECT = '*, products(count)'

type CategoryWithCount = CategoryRow & { products: { count: number }[] }

function productCount(row: CategoryWithCount): number {
  return row.products[0]?.count ?? 0
}

export class SupabaseCategoryRepository implements CategoryRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(): Promise<Category[]> {
    const result = await this.db
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('products.status', 'published')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .overrideTypes<CategoryWithCount[], { merge: false }>()
    return unwrap(result).map((row) => toCategory(row, productCount(row)))
  }

  async getBySlug(slug: string): Promise<Category | null> {
    const result = await this.db
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('products.status', 'published')
      .eq('slug', slug)
      .maybeSingle()
      .overrideTypes<CategoryWithCount | null, { merge: false }>()
    const row = unwrap(result)
    return row ? toCategory(row, productCount(row)) : null
  }

  async create(input: CategoryInput): Promise<Category> {
    const maxRow = unwrap(
      await this.db
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle(),
    )
    const result = await this.db
      .from('categories')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description,
        image_url: input.imageUrl || null,
        sort_order: (maxRow?.sort_order ?? 0) + 1,
        intro_title: input.introTitle.trim(),
        intro_body: input.introBody.trim(),
      })
      .select('*')
      .single()
    return toCategory(unwrap(result), 0)
  }

  async update(id: string, input: CategoryInput): Promise<Category> {
    unwrap(
      await this.db
        .from('categories')
        .update({
          name: input.name,
          slug: input.slug,
          description: input.description,
          image_url: input.imageUrl || null,
          intro_title: input.introTitle.trim(),
          intro_body: input.introBody.trim(),
        })
        .eq('id', id),
    )
    const result = await this.db
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('products.status', 'published')
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<CategoryWithCount | null, { merge: false }>()
    const row = unwrap(result)
    if (!row) throw AppError.notFound('Category')
    return toCategory(row, productCount(row))
  }

  async remove(id: string): Promise<void> {
    const inUse = await this.db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
    unwrap(inUse)
    if ((inUse.count ?? 0) > 0) {
      throw new AppError(
        'conflict',
        'This category still has products. Move or archive them before deleting it.',
      )
    }
    unwrap(await this.db.from('categories').delete().eq('id', id))
  }
}
