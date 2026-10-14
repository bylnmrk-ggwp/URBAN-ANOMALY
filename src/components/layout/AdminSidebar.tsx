import { LogOut, PanelLeftClose, PanelLeftOpen, Store } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth/application/useAuth'
import { hasPermission } from '@/features/team/domain/entities'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'

import { adminNavItems } from './adminNav'
import { BrandMark, BrandWordmark } from './BrandMark'
import { BRAND_NAME } from './storefrontNav'

interface AdminSidebarProps {
  collapsed: boolean
  /** Called after a link is chosen so the mobile sheet can close. */
  onNavigate?: () => void
}

function WithTooltip({
  label,
  show,
  children,
}: {
  label: string
  show: boolean
  children: ReactNode
}) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const itemClass =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent'

export function AdminSidebar({ collapsed, onNavigate }: AdminSidebarProps) {
  const toggle = useUiStore((s) => s.toggleAdminSidebar)
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const visibleItems = adminNavItems.filter(
    (item) => !item.permission || hasPermission(user?.adminRole, item.permission),
  )

  const onSignOut = async () => {
    await signOut.mutateAsync()
    onNavigate?.()
    navigate(routes.home)
  }

  return (
    <div className="text-sidebar-foreground flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 items-center border-b px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <Link
          to={routes.admin.dashboard}
          className="flex min-w-0 items-center gap-2"
          onClick={onNavigate}
          aria-label={`${BRAND_NAME} admin`}
        >
          {collapsed ? (
            <BrandMark />
          ) : (
            <BrandWordmark alt={BRAND_NAME} compact className="min-w-0" />
          )}
        </Link>
        {collapsed ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 lg:inline-flex"
            onClick={toggle}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose aria-hidden="true" />
          </Button>
        )}
      </div>

      <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-2">
        <WithTooltip label="Back to storefront" show={collapsed}>
          <Link
            to={routes.home}
            className={cn(
              itemClass,
              'text-muted-foreground mb-2',
              collapsed && 'justify-center px-0',
            )}
            onClick={onNavigate}
            aria-label="Back to storefront"
          >
            <Store className="size-4 shrink-0" aria-hidden="true" />
            {collapsed ? null : <span>Back to storefront</span>}
          </Link>
        </WithTooltip>
        {visibleItems.map(({ label, to, icon: Icon }) => (
          <WithTooltip key={to} label={label} show={collapsed}>
            <NavLink
              to={to}
              onClick={onNavigate}
              aria-label={collapsed ? label : undefined}
              className={cn(
                itemClass,
                'text-muted-foreground',
                'aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {collapsed ? null : <span>{label}</span>}
            </NavLink>
          </WithTooltip>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t p-2">
        {collapsed ? (
          <WithTooltip label="Expand sidebar" show>
            <Button
              variant="ghost"
              className="hidden min-h-11 lg:inline-flex"
              onClick={toggle}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen aria-hidden="true" />
            </Button>
          </WithTooltip>
        ) : null}
        <WithTooltip label="Logout" show={collapsed}>
          <Button
            variant="ghost"
            className={cn(
              itemClass,
              'text-muted-foreground w-full',
              collapsed ? 'justify-center px-0' : 'justify-start',
            )}
            onClick={onSignOut}
            disabled={signOut.isPending}
            aria-label="Logout"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {collapsed ? null : <span>Logout</span>}
          </Button>
        </WithTooltip>
      </div>
    </div>
  )
}
