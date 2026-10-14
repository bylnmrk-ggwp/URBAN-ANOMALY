import type { Section } from '../../domain/sections'
import { CategoryTilesForm } from './forms/CategoryTilesForm'
import { ContactForm } from './forms/ContactForm'
import { FaqForm } from './forms/FaqForm'
import { GalleryForm } from './forms/GalleryForm'
import { HeroForm } from './forms/HeroForm'
import { ImageMarqueeForm } from './forms/ImageMarqueeForm'
import { NewsletterForm } from './forms/NewsletterForm'
import { ProductCollectionForm } from './forms/ProductCollectionForm'
import { PromoBannerForm } from './forms/PromoBannerForm'
import { RichTextForm } from './forms/RichTextForm'
import { ValuePropsForm } from './forms/ValuePropsForm'

export interface SectionFormProps {
  section: Section
  onChange: (next: Section) => void
}

/** Picks the form for a section type. Mount with `key={section.id}` so the form resets per section. */
export function SectionForm({ section, onChange }: SectionFormProps) {
  switch (section.type) {
    case 'hero':
      return <HeroForm section={section} onChange={onChange} />
    case 'category_tiles':
      return <CategoryTilesForm section={section} onChange={onChange} />
    case 'product_collection':
      return <ProductCollectionForm section={section} onChange={onChange} />
    case 'promo_banner':
      return <PromoBannerForm section={section} onChange={onChange} />
    case 'value_props':
      return <ValuePropsForm section={section} onChange={onChange} />
    case 'rich_text':
      return <RichTextForm section={section} onChange={onChange} />
    case 'newsletter':
      return <NewsletterForm section={section} onChange={onChange} />
    case 'contact':
      return <ContactForm section={section} onChange={onChange} />
    case 'faq':
      return <FaqForm section={section} onChange={onChange} />
    case 'gallery':
      return <GalleryForm section={section} onChange={onChange} />
    case 'image_marquee':
      return <ImageMarqueeForm section={section} onChange={onChange} />
  }
}
