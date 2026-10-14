import { useMemo } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { useCategories } from '@/features/categories/application/hooks'
import { CategoryTiles } from '@/features/products/presentation/CategoryTiles'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import { anchorClass, anchorId } from './shared'

export function CategoryTilesSection({ section }: { section: SectionOf<'category_tiles'> }) {
  const categories = useCategories()
  const { categoryIds } = section

  const selected = useMemo(() => {
    if (!categories.data) return undefined
    if (categoryIds.length === 0) return categories.data
    // Keep the editor's chosen order rather than catalog order.
    return categoryIds.flatMap((id) => categories.data.filter((category) => category.id === id))
  }, [categories.data, categoryIds])

  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      <SectionHeading eyebrow={section.eyebrow || undefined} title={section.title} align="center" />
      {categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : (
        <CategoryTiles
          categories={selected}
          isLoading={categories.isPending}
          limit={section.limit}
        />
      )}
    </section>
  )
}
