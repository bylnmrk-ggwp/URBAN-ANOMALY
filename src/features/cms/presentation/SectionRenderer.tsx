import type { Section } from '../domain/sections'
import { CategoryTilesSection } from './sections/CategoryTilesSection'
import { ContactSection } from './sections/ContactSection'
import { FaqSection } from './sections/FaqSection'
import { GallerySection } from './sections/GallerySection'
import { HeroSection } from './sections/HeroSection'
import { ImageMarqueeSection } from './sections/ImageMarqueeSection'
import { NewsletterSection } from './sections/NewsletterSection'
import { ProductCollectionSectionCms } from './sections/ProductCollectionSectionCms'
import { PromoBannerSection } from './sections/PromoBannerSection'
import { RichTextSection } from './sections/RichTextSection'
import type { SectionContext } from './sections/shared'
import { DEFAULT_SECTION_CONTEXT } from './sections/shared'
import { ValuePropsSection } from './sections/ValuePropsSection'

interface SectionRendererProps {
  section: Section
  context?: SectionContext
}

/** Maps a section document onto its storefront renderer. Hidden sections render nothing. */
export function SectionRenderer({
  section,
  context = DEFAULT_SECTION_CONTEXT,
}: SectionRendererProps) {
  if (!section.visible) return null
  switch (section.type) {
    case 'hero':
      return <HeroSection section={section} />
    case 'category_tiles':
      return <CategoryTilesSection section={section} />
    case 'product_collection':
      return <ProductCollectionSectionCms section={section} context={context} />
    case 'promo_banner':
      return <PromoBannerSection section={section} />
    case 'value_props':
      return <ValuePropsSection section={section} />
    case 'rich_text':
      return <RichTextSection section={section} context={context} />
    case 'newsletter':
      return <NewsletterSection section={section} />
    case 'contact':
      return <ContactSection section={section} />
    case 'faq':
      return <FaqSection section={section} context={context} />
    case 'gallery':
      return <GallerySection section={section} context={context} />
    case 'image_marquee':
      return <ImageMarqueeSection section={section} />
  }
}
