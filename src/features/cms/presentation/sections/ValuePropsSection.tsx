import {
  Heart,
  Leaf,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  type LucideIcon,
} from 'lucide-react'

import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { cn } from '@/lib/utils'

import type { SectionOf, ValueIcon } from '../../domain/sections'
import { anchorClass, anchorId } from './shared'

const ICONS: Record<ValueIcon, LucideIcon> = {
  leaf: Leaf,
  tag: Tag,
  'refresh-cw': RefreshCw,
  truck: Truck,
  'shield-check': ShieldCheck,
  heart: Heart,
  sparkles: Sparkles,
  package: Package,
}

export function ValuePropsSection({ section }: { section: SectionOf<'value_props'> }) {
  return (
    <section
      id={anchorId(section)}
      className={cn(section.bordered && 'bg-muted border-y', anchorClass(section))}
    >
      <div className="container-x py-16 lg:py-24">
        <SectionHeading
          eyebrow={section.eyebrow || undefined}
          title={section.title}
          align="center"
        />
        <ul
          className={cn('grid gap-10', section.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
        >
          {section.items.map((item, index) => {
            const Icon = ICONS[item.icon]
            return (
              <li key={`${index}-${item.title}`} className="text-center">
                <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="heading-display mt-5 text-sm">{item.title}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">{item.body}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
