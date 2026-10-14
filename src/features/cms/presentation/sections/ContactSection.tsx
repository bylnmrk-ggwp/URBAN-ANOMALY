import { Mail, MapPin, Phone } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import { anchorClass, anchorId, telHref } from './shared'

export function ContactSection({ section }: { section: SectionOf<'contact'> }) {
  return (
    // Bottom padding only: the block is designed to close a page (About today).
    <section
      id={anchorId(section)}
      className={cn('container-x pb-16 lg:pb-24', anchorClass(section))}
    >
      <div className="bg-foreground text-background rounded-lg p-8 lg:p-16">
        <h2 className="heading-display text-2xl sm:text-3xl">{section.title}</h2>
        {section.body ? <p className="text-background/70 mt-3 max-w-md">{section.body}</p> : null}
        {section.email || section.phone || section.address ? (
          <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
            {section.email ? (
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <a href={`mailto:${section.email}`} className="underline-offset-4 hover:underline">
                  {section.email}
                </a>
              </li>
            ) : null}
            {section.phone ? (
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <a href={telHref(section.phone)} className="underline-offset-4 hover:underline">
                  {section.phone}
                </a>
              </li>
            ) : null}
            {section.address ? (
              <li className="flex items-center gap-3">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span>{section.address}</span>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
