import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { LoadingState } from '@/components/common/LoadingState'
import { useUiStore } from '@/stores/uiStore'

/**
 * `/cart` has no page of its own: the cart is the right-side drawer, like the reference store.
 * Visiting the URL (bookmark, "Back to cart", empty-checkout redirect) sends the visitor back to
 * where they came from, or home, with the drawer open. `CartDrawer` reads `state.openCart`.
 */
export default function CartPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const setCartOpen = useUiStore((state) => state.setCartOpen)

  useEffect(() => {
    setCartOpen(true)
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== routes.cart ? from : routes.home, {
      replace: true,
      state: { openCart: true },
    })
  }, [navigate, location.state, setCartOpen])

  return <LoadingState fullPage label="Opening your cart…" />
}
