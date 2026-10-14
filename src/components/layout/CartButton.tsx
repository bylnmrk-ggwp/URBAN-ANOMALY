import { ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { pluralize } from '@/lib/format'
import { selectCartCount, useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'

/** Opens the cart drawer. Rendered as a link to /cart so it still works as a plain link. */
export function CartButton() {
  const count = useCartStore(selectCartCount)
  const setCartOpen = useUiStore((s) => s.setCartOpen)

  return (
    <Button asChild variant="ghost" className="relative size-11" aria-label="Cart">
      <a
        href="/cart"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          setCartOpen(true)
        }}
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-label={`${pluralize(count, 'item')} in cart`}
            className="bg-primary text-primary-foreground absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] leading-5 font-semibold tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </a>
    </Button>
  )
}
