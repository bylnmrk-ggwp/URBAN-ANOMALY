import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { storefrontButton } from '@/features/products/presentation/buttonStyles'
import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import { anchorClass, anchorId } from './shared'

export function NewsletterSection({ section }: { section: SectionOf<'newsletter'> }) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast('Demo only — newsletter sign-up is not connected yet.')
    event.currentTarget.reset()
  }

  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 className="heading-display text-2xl sm:text-3xl">{section.title}</h2>
        {section.body ? <p className="text-muted-foreground mt-3">{section.body}</p> : null}
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Label htmlFor="newsletter-email" className="sr-only">
            Email address
          </Label>
          <Input
            id="newsletter-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="min-h-12 flex-1"
          />
          <Button type="submit" size="lg" className={storefrontButton('min-h-12 px-8')}>
            {section.buttonLabel || 'Subscribe'}
          </Button>
        </form>
        <p className="text-muted-foreground mt-3 text-xs">
          Demo: sign-ups are not stored while the newsletter integration is pending.
        </p>
      </div>
    </section>
  )
}
