import { Fragment, useEffect } from 'react'

import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/utils'

import {
  isPreviewMode,
  reportSectionClick,
  useSelectedPreviewSection,
} from '../application/previewBridge'
import type { PageContent } from '../domain/sections'
import { SECTION_META } from '../domain/sections'
import { SectionRenderer } from './SectionRenderer'

interface PageRendererProps {
  content: PageContent
  /** Preview mode inside the visual editor: sections become selectable. Defaults to the URL check. */
  editable?: boolean
}

/** Sets the browser title and meta description for the page, restoring the previous values on unmount. */
function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title
    if (title) document.title = title

    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const created = !meta
    const previousDescription = meta?.content ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.append(meta)
    }
    meta.content = description

    return () => {
      document.title = previousTitle
      if (created) meta.remove()
      else if (previousDescription !== null) meta.content = previousDescription
    }
  }, [title, description])
}

export function PageRenderer({ content, editable }: PageRendererProps) {
  const isEditable = editable ?? isPreviewMode()
  const selectedId = useSelectedPreviewSection()
  useDocumentMeta(content.seoTitle, content.seoDescription)

  const sections = content.sections.filter((section) => section.visible)
  const firstCollectionId = sections.find((s) => s.type === 'product_collection')?.id

  return (
    <>
      {sections.map((section, index) => {
        const node = (
          <SectionRenderer
            section={section}
            context={{ isFirst: index === 0, eager: section.id === firstCollectionId }}
          />
        )
        // Storefront: everything after the hero rises in on scroll (Spotlight `scroll-trigger`).
        // The editor preview skips the reveal so nothing is ever hidden while editing.
        if (!isEditable) {
          return index === 0 ? (
            <Fragment key={section.id}>{node}</Fragment>
          ) : (
            <Reveal key={section.id} effect="slide">
              {node}
            </Reveal>
          )
        }
        const selected = selectedId === section.id
        return (
          <div
            key={section.id}
            data-cms-section={section.id}
            onClick={() => reportSectionClick(section.id)}
            className={cn(
              'group relative cursor-pointer',
              selected && 'outline-info outline-2 outline-offset-[-2px]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'bg-info text-info-foreground pointer-events-none absolute top-2 left-2 z-10 rounded-sm px-2 py-0.5 text-xs font-medium transition-opacity',
                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              {SECTION_META[section.type].label}
            </span>
            {node}
          </div>
        )
      })}
    </>
  )
}
