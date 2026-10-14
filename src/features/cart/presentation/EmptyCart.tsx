import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'

export function EmptyCart() {
  return (
    <EmptyState
      icon={ShoppingBag}
      title="Your shopping cart is empty."
      description="Looks like you haven't added anything yet. Explore the collection to find your next everyday piece."
      action={
        <Button asChild size="lg" className="min-h-11">
          <Link to={routes.shop}>Start shopping</Link>
        </Button>
      }
    />
  )
}
