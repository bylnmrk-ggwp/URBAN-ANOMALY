import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

/** Narrow centered card shared by the sign-in, register and reset screens. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="container-x flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        </header>
        {children}
        {footer ? (
          <footer className="text-muted-foreground mt-8 space-y-2 text-center text-sm">
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  )
}
