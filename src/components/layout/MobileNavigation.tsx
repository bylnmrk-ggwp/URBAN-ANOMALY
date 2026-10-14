import { Menu } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/application/useAuth'
import { useCategories } from '@/features/categories/application/hooks'
import { cn } from '@/lib/utils'
import { selectWishlistCount, useWishlistStore } from '@/stores/wishlistStore'

import type { StorefrontNavLink } from './storefrontNav'
import { useBrand, useStorefrontNavigation } from './storefrontNav'

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'hover:bg-muted flex min-h-11 items-center rounded-md px-3 text-base transition-colors',
    isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
  )
}

function MobileLink({ link, onClick }: { link: StorefrontNavLink; onClick: () => void }) {
  if (link.kind === 'external') {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={mobileLinkClass({ isActive: false })}
        onClick={onClick}
      >
        {link.label}
      </a>
    )
  }
  return (
    <NavLink to={link.href} end={link.end} className={mobileLinkClass} onClick={onClick}>
      {link.label}
    </NavLink>
  )
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { status, user, isAdmin, signOut } = useAuth()
  const { data: categories } = useCategories()
  const { name } = useBrand()
  const { navigation, primaryLinks, secondaryLinks } = useStorefrontNavigation()
  const wishlistCount = useWishlistStore(selectWishlistCount)
  const close = () => setOpen(false)

  const onSignOut = async () => {
    await signOut.mutateAsync()
    close()
    navigate(routes.home)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="size-11 lg:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle className="tracking-[0.2em]">{name}</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-2 py-4">
          {primaryLinks.map((link) => (
            <MobileLink key={link.id} link={link} onClick={close} />
          ))}
          {navigation.showCollectionsMenu && categories?.length ? (
            <div className="mt-3">
              <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
                Collections
              </p>
              {categories.map((category) => (
                <NavLink
                  key={category.id}
                  to={routes.collection(category.slug)}
                  className={mobileLinkClass}
                  onClick={close}
                >
                  {category.name}
                </NavLink>
              ))}
            </div>
          ) : null}
          {secondaryLinks.length ? (
            <div className="mt-3">
              {secondaryLinks.map((link) => (
                <MobileLink key={link.id} link={link} onClick={close} />
              ))}
            </div>
          ) : null}
          <NavLink to={routes.wishlist} className={mobileLinkClass} onClick={close}>
            Wishlist
            {wishlistCount > 0 ? (
              <span className="bg-muted text-foreground ml-auto rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
                {wishlistCount}
              </span>
            ) : null}
          </NavLink>
        </nav>
        <Separator />
        <div className="flex flex-col gap-1 px-2 py-4">
          {status === 'authenticated' && user ? (
            <>
              <p className="px-3 pb-2 text-sm">
                <span className="block font-medium">{user.fullName}</span>
                <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
              </p>
              <NavLink to={routes.account} end className={mobileLinkClass} onClick={close}>
                My account
              </NavLink>
              <NavLink to={routes.myOrders} className={mobileLinkClass} onClick={close}>
                My orders
              </NavLink>
              {isAdmin ? (
                <NavLink to={routes.admin.dashboard} className={mobileLinkClass} onClick={close}>
                  Admin dashboard
                </NavLink>
              ) : null}
              <Button
                variant="ghost"
                className="min-h-11 justify-start px-3 text-base font-normal"
                onClick={onSignOut}
                disabled={signOut.isPending}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <NavLink to={routes.login} className={mobileLinkClass} onClick={close}>
                Sign in
              </NavLink>
              <NavLink to={routes.register} className={mobileLinkClass} onClick={close}>
                Create an account
              </NavLink>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
