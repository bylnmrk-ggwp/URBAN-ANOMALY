import { Heart } from 'lucide-react'
import type { MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'
import { useWishlist } from '@/features/wishlist/application/useWishlist'
import { cn } from '@/lib/utils'

interface WishlistToggleProps {
  product: Pick<Product, 'id' | 'name'>
  /** `overlay` floats over a product image; `inline` sits next to another action. */
  variant?: 'overlay' | 'inline'
  className?: string
}

export function WishlistToggle({ product, variant = 'overlay', className }: WishlistToggleProps) {
  const { has, toggle } = useWishlist()
  const active = has(product.id)

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Cards wrap the button in a link-like group; never let the click navigate.
    event.preventDefault()
    event.stopPropagation()
    toggle(product)
  }

  return (
    <Button
      type="button"
      variant={variant === 'overlay' ? 'secondary' : 'outline'}
      size="icon"
      aria-pressed={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={onClick}
      className={cn(
        'size-11 shrink-0 rounded-full',
        variant === 'overlay' && 'bg-background/90 hover:bg-background shadow-none backdrop-blur',
        variant === 'inline' && 'min-h-12 min-w-12',
        className,
      )}
    >
      <Heart
        className={cn('size-5 transition-colors', active && 'text-destructive fill-current')}
        aria-hidden="true"
      />
    </Button>
  )
}
