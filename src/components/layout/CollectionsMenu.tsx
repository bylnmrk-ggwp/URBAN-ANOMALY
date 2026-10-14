import { ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { routes } from '@/app/router/routes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCategories } from '@/features/categories/application/hooks'
import { cn } from '@/lib/utils'

import { navLinkClass } from './storefrontNav'

/** Desktop "Collections" dropdown listing live categories. */
export function CollectionsMenu() {
  const { pathname } = useLocation()
  const { data: categories, isPending, isError } = useCategories()
  const isActive = pathname.startsWith('/collections')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(navLinkClass({ isActive }), 'inline-flex items-center gap-1 outline-none')}
        aria-current={isActive ? 'page' : undefined}
      >
        Collections
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {isPending ? (
          <DropdownMenuItem disabled>Loading collections…</DropdownMenuItem>
        ) : isError || !categories?.length ? (
          <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuItem key={category.id} asChild>
              <Link to={routes.collection(category.slug)}>{category.name}</Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={routes.shop} className="font-medium">
            View all products
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
