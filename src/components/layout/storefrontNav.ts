import { usePublishedDocument } from '@/features/cms/application/usePublishedDocument'
import { isExternalHref } from '@/features/cms/domain/common'
import { GLOBAL_KEYS } from '@/features/cms/domain/documents'
import type { NavLink, NavigationContent } from '@/features/cms/domain/navigation'
import { useStoreSettings } from '@/features/settings/application/hooks'
import { cn } from '@/lib/utils'

export interface StorefrontNavLink {
  id: string
  label: string
  href: string
  /** Internal links use the router; external ones render a plain anchor. */
  kind: 'internal' | 'external'
  /** Match only the exact path (used for the home link). */
  end: boolean
}

/** Fallback brand name while store settings load (or when they fail). */
export const BRAND_NAME = 'URBAN ANOMALY'

export function toStorefrontNavLink(link: NavLink): StorefrontNavLink {
  return {
    id: link.id,
    label: link.label,
    href: link.href,
    kind: isExternalHref(link.href) ? 'external' : 'internal',
    end: link.href === '/',
  }
}

export interface StorefrontNavigation {
  navigation: NavigationContent
  primaryLinks: StorefrontNavLink[]
  secondaryLinks: StorefrontNavLink[]
}

/** Published navigation document (defaults while loading), with links ready to render. */
export function useStorefrontNavigation(): StorefrontNavigation {
  const { content } = usePublishedDocument('navigation', GLOBAL_KEYS.navigation)
  return {
    navigation: content,
    primaryLinks: content.primaryLinks.map(toStorefrontNavLink),
    secondaryLinks: content.secondaryLinks.map(toStorefrontNavLink),
  }
}

/** Brand identity comes from store settings; the CMS never duplicates it. */
export function useBrand(): { name: string; logoUrl: string | null } {
  const { data } = useStoreSettings()
  return { name: data?.storeName || BRAND_NAME, logoUrl: data?.logoUrl ?? null }
}

/**
 * Desktop header link styling; NavLink supplies `isActive` and `aria-current`.
 * Spotlight register: small uppercase tracked label with an underline that grows from the
 * left on hover and stays full-width on the active route.
 */
export function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'hover:text-foreground relative py-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors',
    'after:bg-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-out after:content-[""] hover:after:scale-x-100 motion-reduce:after:transition-none',
    isActive ? 'text-foreground after:scale-x-100' : 'text-muted-foreground',
  )
}
