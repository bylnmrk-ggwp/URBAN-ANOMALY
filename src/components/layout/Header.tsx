import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'

import { routes } from '@/app/router/routes'
import { cn } from '@/lib/utils'

import { AccountMenu } from './AccountMenu'
import { BrandWordmark } from './BrandMark'
import { CartButton } from './CartButton'
import { CollectionsMenu } from './CollectionsMenu'
import { HeaderSearch } from './HeaderSearch'
import { MobileNavigation } from './MobileNavigation'
import type { StorefrontNavLink } from './storefrontNav'
import { navLinkClass, useBrand, useStorefrontNavigation } from './storefrontNav'
import { WishlistButton } from './WishlistButton'

/** Scroll distance (px) after which the sticky header draws its bottom rule. */
const SCROLLED_AFTER = 8

function HeaderLink({ link }: { link: StorefrontNavLink }) {
  if (link.kind === 'external') {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={navLinkClass({ isActive: false })}
      >
        {link.label}
      </a>
    )
  }
  return (
    <NavLink to={link.href} end={link.end} className={navLinkClass}>
      {link.label}
    </NavLink>
  )
}

/** True once the page has scrolled past the threshold; passive listener, no layout reads. */
function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(() =>
    typeof window === 'undefined' ? false : window.scrollY > threshold,
  )
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export function Header() {
  const { name, logoUrl } = useBrand()
  const { navigation, primaryLinks, secondaryLinks } = useStorefrontNavigation()
  const scrolled = useScrolled(SCROLLED_AFTER)

  return (
    <header
      className={cn(
        'bg-background/95 sticky top-0 z-40 border-b backdrop-blur transition-colors duration-200',
        scrolled ? 'border-border' : 'border-transparent',
      )}
      data-scrolled={scrolled || undefined}
    >
      <div className="container-x flex h-16 items-center gap-2 lg:gap-8">
        <MobileNavigation />

        <Link
          to={routes.home}
          className="text-foreground flex min-w-0 items-center gap-2"
          aria-label={`${name} home`}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-6 w-auto" />
          ) : (
            <BrandWordmark alt={name} />
          )}
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-8 lg:flex">
          {primaryLinks.map((link) => (
            <HeaderLink key={link.id} link={link} />
          ))}
          {navigation.showCollectionsMenu ? <CollectionsMenu /> : null}
          {secondaryLinks.map((link) => (
            <HeaderLink key={link.id} link={link} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <HeaderSearch />
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
          {/* Below `sm` the wishlist lives in the mobile menu; the header has no room for a fourth icon. */}
          <div className="hidden sm:block">
            <WishlistButton />
          </div>
          <CartButton />
        </div>
      </div>
    </header>
  )
}
