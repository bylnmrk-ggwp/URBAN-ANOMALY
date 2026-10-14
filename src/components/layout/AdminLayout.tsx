import { Suspense, useState } from 'react'
import { Outlet } from 'react-router'

import { LoadingState } from '@/components/common/LoadingState'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'

import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'

export function AdminLayout() {
  const collapsed = useUiStore((s) => s.adminSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="bg-background min-h-screen">
      <aside
        className={cn(
          'bg-sidebar hidden border-r transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        <AdminSidebar collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar w-72 gap-0 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SheetDescription className="sr-only">Links to the admin sections</SheetDescription>
          <AdminSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <AdminTopbar onOpenMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<LoadingState fullPage />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
