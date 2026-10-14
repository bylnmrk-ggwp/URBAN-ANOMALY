import { LayoutDashboard, LogOut, Package, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
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

export function AccountMenu() {
  const { status, user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  if (status !== 'authenticated' || !user) {
    return (
      <Button asChild variant="ghost" className="size-11" aria-label="Sign in">
        <Link to={routes.login}>
          <User className="size-5" aria-hidden="true" />
        </Link>
      </Button>
    )
  }

  const onSignOut = async () => {
    await signOut.mutateAsync()
    navigate(routes.home)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-11" aria-label="Account menu">
          <User className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{user.fullName}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={routes.account}>
            <User aria-hidden="true" />
            My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={routes.myOrders}>
            <Package aria-hidden="true" />
            My orders
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to={routes.admin.dashboard}>
              <LayoutDashboard aria-hidden="true" />
              Admin dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut} disabled={signOut.isPending}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
