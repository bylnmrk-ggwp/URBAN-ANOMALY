import type { Category } from '@/features/categories/domain/entities'

import { CATEGORY_IMAGES } from './images'

/**
 * Seed categories. `productCount` is a derived figure; the mock repository
 * recomputes it from published products on every read.
 */
export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-clogs',
    slug: 'clogs',
    name: 'Clogs',
    description:
      'Moulded EVA clogs with a removable heel strap, made in Marikina for Manila streets.',
    imageUrl: CATEGORY_IMAGES.clogs ?? null,
    sortOrder: 1,
    productCount: 0,
    introTitle: 'Clogs that take the heat.',
    introBody:
      'Our clogs are injection-moulded from a single piece of lightweight EVA foam, so there are no seams to split and nothing to soak up rain. Pop the strap behind the heel for errands, flip it over the top for slip-on days. Every colourway is **washable** and dries in minutes.',
  },
  {
    id: 'cat-slides',
    slug: 'slides',
    name: 'Slides',
    description:
      'Cushioned one- and two-strap slides with a non-slip sole for pool, pavement and sari-sari runs.',
    imageUrl: CATEGORY_IMAGES.slides ?? null,
    sortOrder: 2,
    productCount: 0,
    introTitle: 'Slides for the city heat.',
    introBody:
      'Thick EVA footbeds with a moulded arch, wide adjustable straps and a sole that grips wet tile. Slip them on and forget about them.',
  },
  {
    id: 'cat-loafer-mules',
    slug: 'loafer-mules',
    name: 'Loafer Mules',
    description:
      'Closed-toe mules with a loafer silhouette: office-ready uppers on the same cushioned clog sole.',
    imageUrl: CATEGORY_IMAGES['loafer-mules'] ?? null,
    sortOrder: 3,
    productCount: 0,
    introTitle: 'Dressed-up comfort.',
    introBody:
      'The loafer mule puts a cleaner, closed-toe upper on our cushioned sole. Backless so you can kick them off under the desk, structured enough for a client meeting.',
  },
  {
    id: 'cat-straps',
    slug: 'straps-accessories',
    name: 'Straps & Accessories',
    description: 'Replacement straps, charms and care kits to refresh a pair you already own.',
    imageUrl: CATEGORY_IMAGES['straps-accessories'] ?? null,
    sortOrder: 4,
    productCount: 0,
    introTitle: 'Make them yours.',
    introBody:
      'Swap the heel strap for a new colour, add a charm pack, or bring a well-loved pair back to life with the care kit. Straps are sized to match your clog size.',
  },
  {
    id: 'cat-kids',
    slug: 'kids',
    name: 'Kids',
    description:
      'Mini clogs and slides in kids sizes 5–8, with a snug heel strap for the playground.',
    imageUrl: CATEGORY_IMAGES.kids ?? null,
    sortOrder: 5,
    productCount: 0,
    introTitle: 'Small feet, same sole.',
    introBody:
      'The same washable EVA as the grown-up range, scaled down with a secure heel strap. Kids styles use our kids size run (5–8); measure foot length and use the size guide.',
  },
]
