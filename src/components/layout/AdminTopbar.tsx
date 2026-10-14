import { LogOut, Menu, Store } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/application/useAuth'
import { NotificationBell } from '@/features/notifications/presentation/NotificationBell'

import { AdminBreadcrumbs } from './AdminBreadcrumbs'
import { ThemeToggle } from './ThemeToggle'

interface AdminTopbarProps {
  onOpenMenu: () => void
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function AdminTopbar({ onOpenMenu }: AdminTopbarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const onSignOut = async () => {
    await signOut.mutateAsync()
    navigate(routes.home)
  }

  return (
    <header className="bg-background sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        className="size-11 lg:hidden"
        onClick={onOpenMenu}
        aria-label="Open admin menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <AdminBreadcrumbs />
      </div>
      <ThemeToggle />
      <NotificationBell />
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="size-11 rounded-full"
              aria-label="Admin account menu"
            >
              <Avatar>
                <AvatarFallback className="text-xs">{initialsOf(user.fullName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate font-medium">{user.fullName}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={routes.home}>
                <Store aria-hidden="true" />
                View storefront
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut} disabled={signOut.isPending}>
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  )
}
