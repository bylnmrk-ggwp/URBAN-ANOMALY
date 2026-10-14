import { z } from 'zod'

import { ctaSchema, emptyImage, imageRefSchema, shortText } from './common'

/** Allow-listed lucide icon names for value props. Rendering maps these to components. */
export const VALUE_ICONS = [
  'leaf',
  'tag',
  'refresh-cw',
  'truck',
  'shield-check',
  'heart',
  'sparkles',
  'package',
] as const
export type ValueIcon = (typeof VALUE_ICONS)[number]

const base = {
  id: z.string().min(1),
  visible: z.boolean(),
  /** Optional DOM id for in-page links (#shipping). */
  anchor: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and hyphens only.'),
}

export const heroSectionSchema = z.object({
  ...base,
  type: z.literal('hero'),
  eyebrow: shortText(60),
  title: shortText(120),
  subtitle: shortText(300),
  image: imageRefSchema,
  /** Extra slides. When non-empty the hero becomes an autoplaying slideshow starting with `image`. */
  slides: z
    .array(
      z.object({
        image: imageRefSchema,
        eyebrow: shortText(60),
        title: shortText(120),
        subtitle: shortText(300),
        cta: ctaSchema,
      }),
    )
    .max(5),
  autoplaySeconds: z.number().int().min(0).max(30),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema,
  align: z.enum(['left', 'center']),
  height: z.enum(['compact', 'default', 'tall']),
})

export const categoryTilesSectionSchema = z.object({
  ...base,
  type: z.literal('category_tiles'),
  eyebrow: shortText(60),
  title: shortText(120),
  /** Empty means all categories, in catalog order. */
  categoryIds: z.array(z.string()),
  limit: z.number().int().min(1).max(12),
})

export const productCollectionSectionSchema = z.object({
  ...base,
  type: z.literal('product_collection'),
  eyebrow: shortText(60),
  title: shortText(120),
  source: z.enum(['new_arrivals', 'best_sellers', 'featured', 'manual']),
  productIds: z.array(z.string()),
  limit: z.number().int().min(1).max(24),
  viewAllHref: z.union([z.string().trim().max(300), z.literal('')]),
})

export const promoBannerSectionSchema = z.object({
  ...base,
  type: z.literal('promo_banner'),
  image: imageRefSchema,
  eyebrow: shortText(60),
  title: shortText(120),
  body: shortText(400),
  cta: ctaSchema,
  imageSide: z.enum(['left', 'right']),
})

export const valuePropsSectionSchema = z.object({
  ...base,
  type: z.literal('value_props'),
  eyebrow: shortText(60),
  title: shortText(120),
  items: z
    .array(
      z.object({
        icon: z.enum(VALUE_ICONS),
        title: shortText(60),
        body: shortText(300),
      }),
    )
    .min(1)
    .max(6),
  columns: z.union([z.literal(2), z.literal(3)]),
  bordered: z.boolean(),
})

export const richTextSectionSchema = z.object({
  ...base,
  type: z.literal('rich_text'),
  eyebrow: shortText(60),
  title: shortText(120),
  description: shortText(300),
  /** Restricted Markdown; see markdown.ts. */
  body: z.string().max(10_000),
  width: z.enum(['narrow', 'wide']),
  background: z.enum(['none', 'muted']),
  /** Optional side image for the "story" layout. */
  image: imageRefSchema,
  cta: ctaSchema,
  /** Appends the size guide table below the body. */
  showSizeGuide: z.boolean(),
})

export const imageMarqueeSectionSchema = z.object({
  ...base,
  type: z.literal('image_marquee'),
  images: z.array(imageRefSchema).min(2).max(16),
  /** Seconds per loop; lower is faster. */
  speed: z.number().int().min(10).max(120),
  /** Tile height in px at desktop; mobile scales down. */
  tileHeight: z.enum(['sm', 'md', 'lg']),
  pauseOnHover: z.boolean(),
})

export const newsletterSectionSchema = z.object({
  ...base,
  type: z.literal('newsletter'),
  title: shortText(120),
  body: shortText(300),
  buttonLabel: shortText(40),
})

export const contactSectionSchema = z.object({
  ...base,
  type: z.literal('contact'),
  title: shortText(120),
  body: shortText(300),
  email: z.union([z.email(), z.literal('')]),
  phone: shortText(40),
  address: shortText(160),
})

export const faqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(1, 'Enter a question.').max(160),
  /** Restricted Markdown; see markdown.ts. */
  answer: z.string().trim().min(1, 'Enter an answer.').max(2000),
})
export type FaqItem = z.infer<typeof faqItemSchema>

export const faqSectionSchema = z.object({
  ...base,
  type: z.literal('faq'),
  eyebrow: shortText(60),
  title: shortText(120),
  items: z.array(faqItemSchema).min(1, 'Add at least one question.').max(20),
})

export const galleryImageSchema = imageRefSchema.extend({
  caption: shortText(160),
})
export type GalleryImage = z.infer<typeof galleryImageSchema>

export const gallerySectionSchema = z.object({
  ...base,
  type: z.literal('gallery'),
  eyebrow: shortText(60),
  title: shortText(120),
  images: z.array(galleryImageSchema).min(2, 'Add at least two images.').max(12),
  layout: z.enum(['grid', 'columns']),
  showCaptions: z.boolean(),
})

export const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  categoryTilesSectionSchema,
  productCollectionSectionSchema,
  promoBannerSectionSchema,
  valuePropsSectionSchema,
  richTextSectionSchema,
  newsletterSectionSchema,
  contactSectionSchema,
  faqSectionSchema,
  gallerySectionSchema,
  imageMarqueeSectionSchema,
])

export type Section = z.infer<typeof sectionSchema>
export type SectionType = Section['type']
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>

export const pageContentSchema = z.object({
  title: shortText(120),
  /** Browser title / meta description. */
  seoTitle: shortText(70),
  seoDescription: shortText(160),
  sections: z.array(sectionSchema),
})
export type PageContent = z.infer<typeof pageContentSchema>

export interface SectionMeta {
  label: string
  description: string
}

export const SECTION_META: Record<SectionType, SectionMeta> = {
  hero: { label: 'Hero', description: 'Full-width image with headline and buttons.' },
  category_tiles: { label: 'Category tiles', description: 'Image tiles linking to collections.' },
  product_collection: {
    label: 'Product collection',
    description: 'A row of products from the catalog.',
  },
  promo_banner: { label: 'Promo banner', description: 'Image beside a short message and button.' },
  value_props: { label: 'Value props', description: 'Icons with short promises.' },
  rich_text: { label: 'Text block', description: 'Heading and formatted paragraphs.' },
  newsletter: { label: 'Newsletter', description: 'Email sign-up band.' },
  contact: { label: 'Contact', description: 'Email, phone and address block.' },
  image_marquee: { label: 'Image marquee', description: 'Endless scrolling strip of photos.' },
  faq: { label: 'FAQ', description: 'Questions that expand to show their answers.' },
  gallery: { label: 'Gallery', description: 'Grid or columns of images with a lightbox.' },
}

export function newSectionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Sensible blank section for the "Add section" menu. Defaults reuse today's styling choices. */
export function createSection(type: SectionType): Section {
  const common = { id: newSectionId(), visible: true, anchor: '' }
  switch (type) {
    case 'hero':
      return {
        ...common,
        type,
        eyebrow: 'New Season',
        title: 'Your headline here',
        subtitle: '',
        image: emptyImage,
        slides: [],
        autoplaySeconds: 6,
        primaryCta: { label: 'Shop Collection', href: '/shop' },
        secondaryCta: { label: '', href: '' },
        align: 'left',
        height: 'default',
      }
    case 'category_tiles':
      return {
        ...common,
        type,
        eyebrow: 'Browse',
        title: 'Shop by category',
        categoryIds: [],
        limit: 6,
      }
    case 'product_collection':
      return {
        ...common,
        type,
        eyebrow: '',
        title: 'Featured',
        source: 'featured',
        productIds: [],
        limit: 8,
        viewAllHref: '/shop',
      }
    case 'promo_banner':
      return {
        ...common,
        type,
        image: emptyImage,
        eyebrow: '',
        title: 'Promotion title',
        body: '',
        cta: { label: 'Explore', href: '/shop' },
        imageSide: 'left',
      }
    case 'value_props':
      return {
        ...common,
        type,
        eyebrow: '',
        title: 'Why shop with us',
        items: [{ icon: 'sparkles', title: 'Promise', body: 'Describe it here.' }],
        columns: 3,
        bordered: true,
      }
    case 'rich_text':
      return {
        ...common,
        type,
        eyebrow: '',
        title: 'Section title',
        description: '',
        body: 'Write your content here.',
        width: 'narrow',
        background: 'none',
        image: emptyImage,
        cta: { label: '', href: '' },
        showSizeGuide: false,
      }
    case 'newsletter':
      return {
        ...common,
        type,
        title: 'Stay in the loop',
        body: 'New drops, restocks and the occasional honest sale. No spam.',
        buttonLabel: 'Subscribe',
      }
    case 'contact':
      return { ...common, type, title: 'Talk to us', body: '', email: '', phone: '', address: '' }
    case 'image_marquee':
      return {
        ...common,
        type,
        images: [{ ...emptyImage }, { ...emptyImage }],
        speed: 40,
        tileHeight: 'md',
        pauseOnHover: true,
      }
    case 'faq':
      return {
        ...common,
        type,
        eyebrow: '',
        title: 'Frequently asked questions',
        items: [
          {
            id: newSectionId(),
            question: 'How long does delivery take?',
            answer: 'Metro Manila orders arrive in 1-3 working days; provincial orders in 3-7.',
          },
        ],
      }
    case 'gallery':
      return {
        ...common,
        type,
        eyebrow: '',
        title: 'Gallery',
        images: [
          { ...emptyImage, caption: '' },
          { ...emptyImage, caption: '' },
        ],
        layout: 'grid',
        showCaptions: true,
      }
  }
}
