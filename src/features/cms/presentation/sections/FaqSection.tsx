import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import { MarkdownBlocks } from '../MarkdownBlocks'
import type { SectionContext } from './shared'
import { anchorClass, anchorId, DEFAULT_SECTION_CONTEXT } from './shared'

interface FaqSectionProps {
  section: SectionOf<'faq'>
  context?: SectionContext
}

/** Questions in a single-open accordion; answers are restricted Markdown. */
export function FaqSection({ section, context = DEFAULT_SECTION_CONTEXT }: FaqSectionProps) {
  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow={section.eyebrow || undefined}
          title={section.title}
          align="center"
          as={context.isFirst ? 'h1' : 'h2'}
        />
        <Accordion type="single" collapsible className="border-t">
          {section.items.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="min-h-14 py-5 text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <MarkdownBlocks
                  body={item.answer}
                  className="text-muted-foreground space-y-3 text-base leading-relaxed"
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
