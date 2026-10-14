import type { Product, ProductSize } from '@/features/products/domain/entities'
import { isSizeAvailable } from '@/features/products/domain/rules'
import { cn } from '@/lib/utils'

interface SizeSelectorProps {
  product: Pick<Product, 'variants'>
  sizes: ProductSize[]
  selected: ProductSize | null
  /** Narrow availability to the chosen color when one is selected. */
  colorName: string | null
  onChange: (size: ProductSize) => void
  className?: string
}

export function SizeSelector({
  product,
  sizes,
  selected,
  colorName,
  onChange,
  className,
}: SizeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Size" className={cn('flex flex-wrap gap-2', className)}>
      {sizes.map((size) => {
        const available = isSizeAvailable(product, size, colorName)
        const checked = selected === size
        return (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={available ? size : `${size} (unavailable)`}
            disabled={!available}
            onClick={() => onChange(size)}
            className={cn(
              'min-h-11 min-w-11 rounded-md border px-4 text-sm font-medium transition-colors',
              checked
                ? 'border-foreground bg-foreground text-background'
                : 'border-border hover:border-foreground bg-background',
              !available &&
                'text-muted-foreground border-border hover:border-border cursor-not-allowed border-dashed line-through',
            )}
          >
            {size}
          </button>
        )
      })}
    </div>
  )
}
