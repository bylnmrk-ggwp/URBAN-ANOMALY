import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { clone, nowIso } from '@/mocks/helpers'

import type { Category, CategoryInput } from '../domain/entities'
import type { CategoryRepository } from '../domain/repository'

export class MockCategoryRepository implements CategoryRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async list(): Promise<Category[]> {
    await this.store.delay()
    return [...this.store.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => this.withCount(c))
  }

  async getBySlug(slug: string): Promise<Category | null> {
    await this.store.delay()
    const category = this.store.categories.find((c) => c.slug === slug)
    return category ? this.withCount(category) : null
  }

  async create(input: CategoryInput): Promise<Category> {
    await this.store.delay()
    this.assertSlugAvailable(input.slug)
    const nextOrder = this.store.categories.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1
    const category: Category = {
      id: this.store.nextId('cat'),
      slug: input.slug,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl || null,
      sortOrder: nextOrder,
      productCount: 0,
      introTitle: input.introTitle.trim(),
      introBody: input.introBody.trim(),
    }
    this.store.categories.push(category)
    return clone(category)
  }

  async update(id: string, input: CategoryInput): Promise<Category> {
    await this.store.delay()
    const category = this.store.categories.find((c) => c.id === id)
    if (!category) throw AppError.notFound('Category')
    this.assertSlugAvailable(input.slug, id)
    category.name = input.name
    category.slug = input.slug
    category.description = input.description
    category.imageUrl = input.imageUrl || null
    category.introTitle = input.introTitle.trim()
    category.introBody = input.introBody.trim()
    // Keep the denormalised category fields on products in sync.
    for (const product of this.store.products) {
      if (product.categoryId === id) {
        product.categoryName = category.name
        product.categorySlug = category.slug
        product.updatedAt = nowIso()
      }
    }
    return this.withCount(category)
  }

  async remove(id: string): Promise<void> {
    await this.store.delay()
    const index = this.store.categories.findIndex((c) => c.id === id)
    if (index === -1) throw AppError.notFound('Category')
    const inUse = this.store.products.filter((p) => p.categoryId === id).length
    if (inUse > 0) {
      throw new AppError(
        'conflict',
        `This category still has ${inUse} product${inUse === 1 ? '' : 's'}. Reassign them before deleting it.`,
      )
    }
    this.store.categories.splice(index, 1)
  }

  private withCount(category: Category): Category {
    const productCount = this.store.products.filter(
      (p) => p.categoryId === category.id && p.status === 'published',
    ).length
    return { ...clone(category), productCount }
  }

  private assertSlugAvailable(slug: string, excludeId?: string) {
    const taken = this.store.categories.some((c) => c.slug === slug && c.id !== excludeId)
    if (taken) throw new AppError('conflict', 'A category with this slug already exists.')
  }
}
