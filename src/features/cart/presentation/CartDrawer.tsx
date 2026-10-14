import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/application/useAuth'
import { useCart } from '@/features/cart/application/useCart'
import { useCategories } from '@/features/categories/application/hooks'
import { storefrontButton } from '@/features/products/presentation/buttonStyles'
import { formatPrice } from '@/lib/format'
import { useUiStore } from '@/stores/uiStore'

import { CartLineItem } from './CartLineItem'

/**
 * Right-side cart drawer. Opens from the header bag icon and after adding an item. The empty
 * state mirrors the reference store: a large "Continue shopping" action, a log-in hint, and a
 * featured collection tile. Full editing stays on /cart; payment stays on /checkout.
 */
export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen)
  const setOpen = useUiStore((s) => s.setCartOpen)
  const location = useLocation()

  // Navigating to a different page closes the drawer (mounting must not). A navigation that
  // carries `state.openCart` (the /cart redirect) opens it instead.
  const lastPath = useRef(location.pathname)
  const openCart = Boolean((location.state as { openCart?: boolean } | null)?.openCart)
  useEffect(() => {
    if (openCart) {
      setOpen(true)
      lastPath.current = location.pathname
      return
    }
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    setOpen(false)
  }, [location.pathname, openCart, setOpen])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Items you have added, ready to check out.</SheetDescription>
        </SheetHeader>
        {open ? <DrawerBody onClose={() => setOpen(false)} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({ onClose }: { onClose: () => void }) {
  const cart = useCart()
  if (cart.items.length === 0) return <EmptyDrawer onClose={onClose} />
  return (
    <>
      <div className="flex items-baseline justify-between border-b px-6 pt-12 pb-4">
        <h2 className="heading-display text-base">Your cart</h2>
        <span className="text-muted-foreground text-xs">{cart.totals.itemCount} items</span>
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto px-6">
        {cart.lines.map((line) => (
          <CartLineItem
            key={line.item.variantId}
            line={line}
            reducedTo={cart.adjustments[line.item.variantId]}
            onQuantityChange={(quantity) => cart.setQuantity(line, quantity)}
            onRemove={() => cart.removeLine(line)}
            className="py-5"
          />
        ))}
      </div>
      <div className="space-y-3 border-t px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span className="heading-display text-sm">Subtotal</span>
          <span className="text-base font-semibold tabular-nums">
            {formatPrice(cart.totals.subtotal)}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Shipping and discounts are calculated at checkout.
        </p>
        {cart.hasBlockingIssues ? (
          <>
            <Button size="lg" className={storefrontButton('min-h-12 w-full')} disabled>
              Check out
            </Button>
            <p className="text-destructive text-xs" role="alert">
              Some items are unavailable. Review your cart before checking out.
            </p>
          </>
        ) : (
          <Button asChild size="lg" className={storefrontButton('min-h-12 w-full')}>
            <Link to={routes.checkout}>Check out</Link>
          </Button>
        )}
      </div>
    </>
  )
}

function EmptyDrawer({ onClose }: { onClose: () => void }) {
  const { status } = useAuth()
  const categories = useCategories()
  const featured = categories.data?.find((category) => category.imageUrl) ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col items-center px-6 pt-20 pb-10 text-center">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Your cart is empty</h2>
        <Button
          size="lg"
          className={storefrontButton(
            'bg-primary text-primary-foreground hover:bg-primary/90 mt-6 min-h-12 px-8 hover:shadow-none',
          )}
          onClick={onClose}
        >
          Continue shopping
        </Button>
        {status !== 'authenticated' ? (
          <>
            <p className="mt-10 text-base">Have an account?</p>
            <p className="text-muted-foreground mt-2 text-sm">
              <Link
                to={routes.login}
                className="text-foreground underline underline-offset-4"
                onClick={onClose}
              >
                Log in
              </Link>{' '}
              to check out faster.
            </p>
          </>
        ) : null}
      </div>
      {featured ? (
        <div className="mt-auto px-6 pb-8">
          <Link
            to={routes.collection(featured.slug)}
            onClick={onClose}
            className="group block"
            aria-label={`Shop ${featured.name}`}
          >
            <ProductImage
              src={featured.imageUrl}
              alt={featured.name}
              aspect="square"
              className="rounded-lg"
              imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="448px"
            />
            <span className="mt-4 inline-flex items-center gap-2 text-lg font-medium">
              {featured.name}
              <ArrowRight
                className="size-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
