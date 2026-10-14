import type { ContentFor, DocumentKey, DocumentKind } from '../documents'
import { GLOBAL_KEYS, pageKey } from '../documents'
import type { MediaAsset } from '../media'

import { ABOUT_PAGE_DEFAULT } from './about'
import { ANNOUNCEMENT_DEFAULT, NAVIGATION_DEFAULT, THEME_DEFAULT } from './globals'
import { HOME_PAGE_DEFAULT } from './home'
import { pexels } from './pexels'

export {
  ABOUT_PAGE_DEFAULT,
  ANNOUNCEMENT_DEFAULT,
  HOME_PAGE_DEFAULT,
  NAVIGATION_DEFAULT,
  THEME_DEFAULT,
}

export interface DefaultDocument<K extends DocumentKind = DocumentKind> {
  key: DocumentKey
  kind: K
  title: string
  content: ContentFor<K>
}

/** Seed set: what the storefront shows before any admin edit, and what mock mode starts from. */
export const DEFAULT_DOCUMENTS: DefaultDocument[] = [
  { key: pageKey('home'), kind: 'page', title: 'Home', content: HOME_PAGE_DEFAULT },
  { key: pageKey('about'), kind: 'page', title: 'About', content: ABOUT_PAGE_DEFAULT },
  {
    key: GLOBAL_KEYS.navigation,
    kind: 'navigation',
    title: 'Navigation',
    content: NAVIGATION_DEFAULT,
  },
  {
    key: GLOBAL_KEYS.announcement,
    kind: 'announcement',
    title: 'Announcement bar',
    content: ANNOUNCEMENT_DEFAULT,
  },
  { key: GLOBAL_KEYS.theme, kind: 'theme', title: 'Theme', content: THEME_DEFAULT },
]

/** Pages that ship with the storefront and cannot be deleted. */
export const BUILT_IN_PAGE_SLUGS = ['home', 'about'] as const

export function defaultContentFor<K extends DocumentKind>(
  kind: K,
  key: DocumentKey,
): ContentFor<K> | null {
  const found = DEFAULT_DOCUMENTS.find((d) => d.key === key && d.kind === kind)
  return found ? (found.content as ContentFor<K>) : null
}

/** Library assets referenced by the default pages. */
export const DEFAULT_MEDIA: MediaAsset[] = [
  {
    id: 'media-hero-lava',
    bucket: 'cms-media',
    path: 'seed/hero-lava.jpg',
    url: pexels('12368079', 1800),
    alt: 'Pair of EVA clogs resting on a concrete step',
    mime: 'image/jpeg',
    sizeBytes: 412_000,
    width: 1800,
    height: 1200,
    uploadedBy: 'Store Admin',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'media-hero-ice',
    bucket: 'cms-media',
    path: 'seed/hero-ice.jpg',
    url: pexels('13698233', 1800),
    alt: 'Cushioned slides beside a swimming pool',
    mime: 'image/jpeg',
    sizeBytes: 388_000,
    width: 1800,
    height: 1200,
    uploadedBy: 'Store Admin',
    createdAt: '2026-09-01T08:05:00.000Z',
  },
  {
    id: 'media-hero-street',
    bucket: 'cms-media',
    path: 'seed/hero-street.jpg',
    url: pexels('18188523', 1800),
    alt: 'Matte clogs worn on a Manila sidewalk',
    mime: 'image/jpeg',
    sizeBytes: 401_000,
    width: 1800,
    height: 1200,
    uploadedBy: 'Store Admin',
    createdAt: '2026-09-01T08:10:00.000Z',
  },
  {
    id: 'media-promo-slide',
    bucket: 'cms-media',
    path: 'seed/promo-slide.jpg',
    url: pexels('13698233', 1200),
    alt: 'Two-strap slide on a wet boat deck',
    mime: 'image/jpeg',
    sizeBytes: 268_000,
    width: 1200,
    height: 1500,
    uploadedBy: 'Store Admin',
    createdAt: '2026-09-02T09:00:00.000Z',
  },
  {
    id: 'media-story-workshop',
    bucket: 'cms-media',
    path: 'seed/story-workshop.jpg',
    url: pexels('12368097', 1200),
    alt: 'Finished clogs lined up on a rack in the Marikina workshop',
    mime: 'image/jpeg',
    sizeBytes: 301_000,
    width: 1200,
    height: 1500,
    uploadedBy: 'Store Admin',
    createdAt: '2026-09-02T09:05:00.000Z',
  },
]
