import { Heart } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { pluralize } from '@/lib/format'
import { selectWishlistCount, useWishlistStore } from '@/stores/wishlistStore'

export function WishlistButton() {
  const count = useWishlistStore(selectWishlistCount)

  return (
    <Button asChild variant="ghost" className="relative size-11" aria-label="Wishlist">
      <Link to={routes.wishlist}>
        <Heart className="size-5" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-label={`${pluralize(count, 'item')} in wishlist`}
            className="bg-primary text-primary-foreground absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-5 font-semibold tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
