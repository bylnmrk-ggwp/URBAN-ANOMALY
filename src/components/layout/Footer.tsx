import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategories } from '@/features/categories/application/hooks'
import { isExternalHref } from '@/features/cms/domain/common'

import { useBrand, useStorefrontNavigation } from './storefrontNav'

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="heading-display text-xs">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm">{children}</ul>
    </div>
  )
}

const footerLinkClass = 'text-muted-foreground hover:text-foreground transition-colors'

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      {isExternalHref(to) ? (
        <a href={to} target="_blank" rel="noopener noreferrer" className={footerLinkClass}>
          {children}
        </a>
      ) : (
        <Link to={to} className={footerLinkClass}>
          {children}
        </Link>
      )}
    </li>
  )
}

export function Footer() {
  const { data: categories } = useCategories()
  const { name } = useBrand()
  const { navigation } = useStorefrontNavigation()
  const [email, setEmail] = useState('')

  const onSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast('Thanks — newsletter signup isn’t connected yet', {
      description: 'This is a demo store; no email was stored.',
    })
    setEmail('')
  }

  return (
    <footer className="border-t">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {navigation.showCategoryColumn ? (
          <FooterColumn title="Shop">
            <FooterLink to={routes.shop}>All products</FooterLink>
            {categories?.slice(0, 6).map((category) => (
              <FooterLink key={category.id} to={routes.collection(category.slug)}>
                {category.name}
              </FooterLink>
            ))}
          </FooterColumn>
        ) : null}
        {navigation.footerColumns.map((column) => (
          <FooterColumn key={column.id} title={column.title}>
            {column.links.map((link) => (
              <FooterLink key={link.id} to={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
        ))}
        {navigation.newsletterTitle ? (
          <div>
            <h2 className="heading-display text-xs">{navigation.newsletterTitle}</h2>
            {navigation.newsletterBody ? (
              <p className="text-muted-foreground mt-4 text-sm">{navigation.newsletterBody}</p>
            ) : null}
            <form onSubmit={onSubscribe} className="mt-4 flex gap-2">
              <Input
                type="email"
                name="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                autoComplete="email"
                className="h-11"
              />
              <Button type="submit" className="h-11">
                Subscribe
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      <div className="border-t">
        <div className="container-x text-muted-foreground flex flex-col gap-3 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {name}. {navigation.legalLine}
          </p>
          {navigation.paymentLine ? (
            <p aria-label="Accepted payment methods">{navigation.paymentLine}</p>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
