import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'

import { LoadingState } from '@/components/common/LoadingState'
import { installPreviewReceiver, isPreviewMode } from '@/features/cms/application/previewBridge'
import { ThemeApplier } from '@/features/cms/presentation/ThemeApplier'
import { useCartStore } from '@/stores/cartStore'

import { AnnouncementBar } from './AnnouncementBar'
import { Footer } from './Footer'
import { Header } from './Header'
import { CartDrawer } from '@/features/cart/presentation/CartDrawer'

export function StorefrontLayout() {
  const announcement = useCartStore((s) => s.lastAnnouncement)

  // Inside the visual editor's iframe only: accept draft pushes from the parent window.
  useEffect(() => {
    if (!isPreviewMode()) return
    return installPreviewReceiver()
  }, [])

  // The product page's fixed "Add to cart" bar (below `lg`) covers the bottom 7rem of the shell;
  // pad the whole shell, footer included, whenever that bar is mounted.
  return (
    <div className="flex min-h-screen flex-col max-lg:has-data-[slot=mobile-add-to-cart-bar]:pb-28">
      <ThemeApplier />
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<LoadingState fullPage />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}
