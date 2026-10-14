import type { Product } from './entities'

/**
 * Which category slugs pair well with a given category slug, in order of preference.
 * Footwear pairs with straps and charms, accessories pair back with the shoes they fit.
 * Unknown categories fall back to "anything from a different category".
 */
export const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  clogs: ['straps-accessories', 'slides', 'kids'],
  slides: ['straps-accessories', 'clogs'],
  'loafer-mules': ['clogs', 'slides'],
  'straps-accessories': ['clogs', 'slides', 'kids'],
  kids: ['straps-accessories', 'clogs'],
}

/**
 * Picks up to `limit` products that complete the look around `current`:
 * complementary categories first (in `COMPLEMENTARY_CATEGORIES` order), then any other
 * category. The current product and products in its own category are never returned.
 */
export function pickCompleteTheLook(
  current: Pick<Product, 'id' | 'categoryId' | 'categorySlug'>,
  candidates: Product[],
  limit = 4,
): Product[] {
  const preferred = COMPLEMENTARY_CATEGORIES[current.categorySlug] ?? []
  const eligible = candidates.filter(
    (product) =>
      product.id !== current.id &&
      product.categoryId !== current.categoryId &&
      product.status === 'published',
  )
  const rank = (product: Product) => {
    const index = preferred.indexOf(product.categorySlug)
    return index === -1 ? preferred.length : index
  }
  return [...eligible].sort((a, b) => rank(a) - rank(b)).slice(0, limit)
}
