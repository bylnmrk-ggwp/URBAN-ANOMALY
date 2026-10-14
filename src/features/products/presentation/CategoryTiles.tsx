import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import { Skeleton } from '@/components/ui/skeleton'
import type { Category } from '@/features/categories/domain/entities'
import { pluralize } from '@/lib/format'

interface CategoryTilesProps {
  categories?: Category[]
  isLoading?: boolean
  limit?: number
}

export function CategoryTiles({
  categories = [],
  isLoading = false,
  limit = 4,
}: CategoryTilesProps) {
  const visible = [...categories].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit)

  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6"
      aria-busy={isLoading || undefined}
    >
      {isLoading
        ? Array.from({ length: limit }, (_, index) => (
            <div key={index} aria-hidden="true">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="mx-auto mt-4 h-4 w-1/2" />
            </div>
          ))
        : visible.map((category) => (
            <Link
              key={category.id}
              to={routes.collection(category.slug)}
              className="group block rounded-lg outline-offset-4"
            >
              <div className="overflow-hidden rounded-lg">
                <ProductImage
                  src={category.imageUrl}
                  alt=""
                  decorative
                  aspect="square"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <h3 className="heading-display mt-4 text-center text-sm">{category.name}</h3>
              <p className="text-muted-foreground mt-1 text-center text-xs">
                {pluralize(category.productCount, 'piece')}
              </p>
            </Link>
          ))}
    </div>
  )
}
