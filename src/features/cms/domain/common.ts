import { z } from 'zod'

/** Relative storefront path or an https URL. Blocks javascript:, data:, protocol-relative. */
export const safeHrefSchema = z
  .string()
  .trim()
  .min(1, 'Enter a link.')
  .max(500)
  .refine(
    (v) => (v.startsWith('/') && !v.startsWith('//') ? true : /^https:\/\/[^\s]+$/i.test(v)),
    'Use a relative path (/shop) or an https:// URL.',
  )

export const optionalSafeHrefSchema = z.union([safeHrefSchema, z.literal('')])

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #111111.')

/** Reference to an image: a library asset id and/or a direct URL. The URL is what renders. */
export const imageRefSchema = z.object({
  mediaId: z.string().nullable(),
  url: z.union([z.url({ protocol: /^https?$/ }), z.string().startsWith('blob:'), z.literal('')]),
  alt: z.string().trim().max(160),
})
export type ImageRef = z.infer<typeof imageRefSchema>

export const emptyImage: ImageRef = { mediaId: null, url: '', alt: '' }

export const ctaSchema = z.object({
  label: z.string().trim().max(60),
  href: optionalSafeHrefSchema,
})
export type Cta = z.infer<typeof ctaSchema>

export function isCtaSet(cta: Cta | undefined | null): cta is Cta {
  return Boolean(cta && cta.label.trim() && cta.href)
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export const shortText = (max: number) => z.string().trim().max(max)
