import { z } from 'zod'

import { safeHrefSchema, shortText } from './common'

export const navLinkSchema = z.object({
  id: z.string().min(1),
  label: shortText(40).min(1, 'Enter a label.'),
  href: safeHrefSchema,
})
export type NavLink = z.infer<typeof navLinkSchema>

export const footerColumnSchema = z.object({
  id: z.string().min(1),
  title: shortText(40).min(1, 'Enter a title.'),
  links: z.array(navLinkSchema).max(12),
})
export type FooterColumn = z.infer<typeof footerColumnSchema>

export const navigationContentSchema = z.object({
  /** Header links shown before the Collections menu. */
  primaryLinks: z.array(navLinkSchema).max(6),
  /** Header links shown after the Collections menu. */
  secondaryLinks: z.array(navLinkSchema).max(6),
  showCollectionsMenu: z.boolean(),
  /** Footer columns; the category column is generated from the catalog when `showCategoryColumn`. */
  showCategoryColumn: z.boolean(),
  footerColumns: z.array(footerColumnSchema).max(4),
  newsletterTitle: shortText(40),
  newsletterBody: shortText(160),
  paymentLine: shortText(120),
  legalLine: shortText(120),
})
export type NavigationContent = z.infer<typeof navigationContentSchema>

export const announcementContentSchema = z.object({
  text: shortText(160),
  href: z.union([safeHrefSchema, z.literal('')]),
  visible: z.boolean(),
})
export type AnnouncementContent = z.infer<typeof announcementContentSchema>
