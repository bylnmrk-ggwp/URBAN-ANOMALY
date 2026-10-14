import { ArrowRight, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/application/useAuth'
import { AddressList } from '@/features/auth/presentation/AddressList'
import { ProfileForm } from '@/features/auth/presentation/ProfileForm'
import { getErrorMessage } from '@/lib/errors'

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return <LoadingState fullPage label="Loading your account…" />
  }

  const firstName = user.fullName.split(' ')[0] ?? user.fullName

  const handleSignOut = async () => {
    try {
      await signOut.mutateAsync(undefined)
      navigate(routes.home)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not sign you out.'))
    }
  }

  return (
    <div className="container-x py-12 lg:py-16">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            Account
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Hi, {firstName}
          </h1>
          <p className="text-muted-foreground mt-2">{user.email}</p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={handleSignOut}
          disabled={signOut.isPending}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </header>

      <Tabs defaultValue="profile" className="gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="profile" className="min-h-9 px-4">
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className="min-h-9 px-4">
              Addresses
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="link" className="px-0">
              <Link to={routes.accountWishlist}>Wishlist</Link>
            </Button>
            <Button asChild variant="link" className="px-0">
              <Link to={routes.myOrders}>
                My orders
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <TabsContent value="profile">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">Profile</h2>
          <ProfileForm />
        </TabsContent>
        <TabsContent value="addresses">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">Saved addresses</h2>
          <AddressList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
