import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { SizeGuideTable } from '@/features/products/presentation/SizeGuideDialog'
import { cn } from '@/lib/utils'

import { isCtaSet } from '../../domain/common'
import type { SectionOf } from '../../domain/sections'
import { MarkdownBlocks } from '../MarkdownBlocks'
import { CtaLink } from './CtaLink'
import type { SectionContext } from './shared'
import { anchorClass, anchorId } from './shared'

type RichText = SectionOf<'rich_text'>

interface RichTextSectionProps {
  section: RichText
  context: SectionContext
}

function SizeGuide({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-xl', className)}>
      <SizeGuideTable />
    </div>
  )
}

function Cta({ section }: { section: RichText }) {
  if (!isCtaSet(section.cta)) return null
  return (
    <Button asChild size="lg" className="mt-8 min-h-12">
      <CtaLink href={section.cta.href}>{section.cta.label}</CtaLink>
    </Button>
  )
}

/** Two-column "story" layout: text beside a tall image. */
function StoryLayout({ section, context }: RichTextSectionProps) {
  const Heading = context.isFirst ? 'h1' : 'h2'
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        {section.eyebrow ? (
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.25em] uppercase">
            {section.eyebrow}
          </p>
        ) : null}
        <Heading className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {section.title}
        </Heading>
        {section.description ? (
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            {section.description}
          </p>
        ) : null}
        <MarkdownBlocks
          body={section.body}
          className="text-muted-foreground mt-6 space-y-4 leading-relaxed"
        />
        {section.showSizeGuide ? <SizeGuide className="mt-8" /> : null}
        <Cta section={section} />
      </div>
      <ProductImage
        src={section.image.url}
        alt={section.image.alt}
        aspect="4/5"
        className="rounded-md"
        priority={context.isFirst}
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    </div>
  )
}

function TextLayout({ section, context }: RichTextSectionProps) {
  return (
    <>
      <SectionHeading
        eyebrow={section.eyebrow || undefined}
        title={section.title}
        description={section.description || undefined}
        as={context.isFirst ? 'h1' : 'h2'}
      />
      <MarkdownBlocks
        body={section.body}
        className={cn(
          'text-muted-foreground space-y-4 leading-relaxed',
          section.width === 'narrow' ? 'max-w-2xl' : 'max-w-4xl',
        )}
      />
      {section.showSizeGuide ? <SizeGuide className={cn(section.body && 'mt-8')} /> : null}
      <Cta section={section} />
    </>
  )
}

export function RichTextSection(props: RichTextSectionProps) {
  const { section } = props
  const isStory = section.width === 'wide' && Boolean(section.image.url)
  const body = isStory ? <StoryLayout {...props} /> : <TextLayout {...props} />

  if (section.background === 'muted') {
    return (
      <section id={anchorId(section)} className={cn('bg-muted/40 border-y', anchorClass(section))}>
        <div className="container-x py-16 lg:py-24">{body}</div>
      </section>
    )
  }
  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      {body}
    </section>
  )
}
