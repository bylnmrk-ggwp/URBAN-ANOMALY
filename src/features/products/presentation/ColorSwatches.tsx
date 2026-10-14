import type { Product, ProductColor, ProductSize } from '@/features/products/domain/entities'
import { isColorAvailable } from '@/features/products/domain/rules'
import { cn } from '@/lib/utils'

interface ColorSwatchesProps {
  product: Pick<Product, 'variants'>
  colors: ProductColor[]
  selected: string | null
  /** Narrow availability to the chosen size when one is selected. */
  size: ProductSize | null
  onChange: (colorName: string) => void
  className?: string
}

export function ColorSwatches({
  product,
  colors,
  selected,
  size,
  onChange,
  className,
}: ColorSwatchesProps) {
  return (
    <div role="radiogroup" aria-label="Color" className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((color) => {
        const available = isColorAvailable(product, color.name, size)
        const checked = selected === color.name
        return (
          <button
            key={color.name}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={available ? color.name : `${color.name} (unavailable)`}
            title={color.name}
            disabled={!available}
            onClick={() => onChange(color.name)}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full transition-shadow',
              checked && 'ring-foreground ring-offset-background ring-2 ring-offset-2',
              !available && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className="block size-8 rounded-full border border-black/10 dark:border-white/20"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            {!available ? (
              <svg
                className="text-foreground absolute inset-0 size-full"
                viewBox="0 0 44 44"
                aria-hidden="true"
              >
                <line
                  x1="10"
                  y1="34"
                  x2="34"
                  y2="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
