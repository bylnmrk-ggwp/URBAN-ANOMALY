import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <section className="container-x flex flex-col items-center py-24 text-center sm:py-32">
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Page not found</h1>
      <p className="text-muted-foreground mt-4 max-w-md text-base">
        The page you are looking for has moved or never existed. Try the shop instead.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to={routes.shop}>Browse the shop</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to={routes.home}>Back to home</Link>
        </Button>
      </div>
    </section>
  )
}
