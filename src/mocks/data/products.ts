import type {
  Product,
  ProductColor,
  ProductImage,
  ProductSize,
  ProductStatus,
  ProductVariant,
} from '@/features/products/domain/entities'
import { generateSku } from '@/features/products/domain/rules'

import { pexels, type PhotoPool, pickPhotoIds } from './images'

/** Named colourways shared across the range. */
export const COLORS = {
  lava: { name: 'Lava', hex: '#B3261E' },
  ice: { name: 'Ice', hex: '#DCE8F0' },
  midnight: { name: 'Midnight', hex: '#1C2230' },
  forest: { name: 'Forest', hex: '#4A5D3A' },
  sand: { name: 'Sand', hex: '#D9C7A7' },
  bone: { name: 'Bone', hex: '#EFE9DC' },
  charcoal: { name: 'Charcoal', hex: '#333333' },
  lilac: { name: 'Lilac', hex: '#C9B8E8' },
  sage: { name: 'Sage', hex: '#9DB39A' },
} satisfies Record<string, ProductColor>

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = new Date()

/** ISO timestamp relative to module load time. */
export function daysAgo(days: number, hours = 0): string {
  return new Date(NOW.getTime() - days * DAY_MS - hours * 60 * 60 * 1000).toISOString()
}

/** Deterministic stock pattern: mixes healthy, low (<= 5) and sold-out variants. */
const STOCK_PATTERN = [34, 0, 4, 48, 17, 3, 56, 22, 0, 11, 40, 2, 27, 8, 60, 5, 19, 0, 31, 44]
const RESERVED_PATTERN = [0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 0, 1]

interface ProductSpec {
  id: string
  slug: string
  name: string
  description: string
  details: string[]
  categoryId: string
  categoryName: string
  categorySlug: string
  basePrice: number
  salePrice?: number
  colors: ProductColor[]
  sizes: ProductSize[]
  /** Which photo pool the product's images are drawn from (matches its silhouette). */
  imagePool: PhotoPool
  imageStart: number
  imageCount: number
  status?: ProductStatus
  isFeatured?: boolean
  salesCount: number
  createdDaysAgo: number
  stockSeed: number
}

/** Stable variant id so orders and movements can reference variants by name. */
export function variantId(productId: string, size: ProductSize, colorName: string): string {
  return `var-${productId}-${size}-${colorName.toLowerCase()}`
}

function buildVariants(spec: ProductSpec): ProductVariant[] {
  const variants: ProductVariant[] = []
  let index = 0
  for (const color of spec.colors) {
    for (const size of spec.sizes) {
      const slot = (spec.stockSeed + index) % STOCK_PATTERN.length
      const stock = STOCK_PATTERN[slot] ?? 0
      const reserved = stock === 0 ? 0 : Math.min(RESERVED_PATTERN[slot] ?? 0, stock)
      variants.push({
        id: variantId(spec.id, size, color.name),
        productId: spec.id,
        sku: generateSku(spec.name, size, color.name),
        size,
        color,
        stock,
        reservedStock: reserved,
        lowStockThreshold: 5,
      })
      index += 1
    }
  }
  return variants
}

function buildImages(spec: ProductSpec): ProductImage[] {
  const views = ['side view', 'detail', 'top view', 'on foot']
  return pickPhotoIds(spec.imagePool, spec.imageStart, spec.imageCount).map((photoId, i) => ({
    id: `img-${spec.id}-${i + 1}`,
    url: pexels(photoId),
    alt: `${spec.name} - ${views[i] ?? 'view'}`,
    isPrimary: i === 0,
    sortOrder: i,
  }))
}

function buildProduct(spec: ProductSpec): Product {
  return {
    id: spec.id,
    slug: spec.slug,
    name: spec.name,
    description: spec.description,
    details: spec.details,
    categoryId: spec.categoryId,
    categoryName: spec.categoryName,
    categorySlug: spec.categorySlug,
    basePrice: spec.basePrice,
    salePrice: spec.salePrice ?? null,
    images: buildImages(spec),
    variants: buildVariants(spec),
    status: spec.status ?? 'published',
    isFeatured: spec.isFeatured ?? false,
    salesCount: spec.salesCount,
    seoTitle: '',
    seoDescription: '',
    createdAt: daysAgo(spec.createdDaysAgo, 9),
    updatedAt: daysAgo(Math.max(0, Math.floor(spec.createdDaysAgo / 3)), 4),
  }
}

/** Category fields plus the default photo pool for that silhouette. */
const CLOGS = {
  categoryId: 'cat-clogs',
  categoryName: 'Clogs',
  categorySlug: 'clogs',
  imagePool: 'clogs',
} satisfies Partial<ProductSpec>
const SLIDES = {
  categoryId: 'cat-slides',
  categoryName: 'Slides',
  categorySlug: 'slides',
  imagePool: 'slides',
} satisfies Partial<ProductSpec>
const MULES = {
  categoryId: 'cat-loafer-mules',
  categoryName: 'Loafer Mules',
  categorySlug: 'loafer-mules',
  imagePool: 'mules',
} satisfies Partial<ProductSpec>
/** Straps and charms are photographed on the clogs they fit. */
const STRAPS = {
  categoryId: 'cat-straps',
  categoryName: 'Straps & Accessories',
  categorySlug: 'straps-accessories',
  imagePool: 'clogs',
} satisfies Partial<ProductSpec>
/** Kids styles are mini clogs by default; the kids slide overrides the pool. */
const KIDS = {
  categoryId: 'cat-kids',
  categoryName: 'Kids',
  categorySlug: 'kids',
  imagePool: 'clogs',
} satisfies Partial<ProductSpec>

/** US unisex size runs. Kids styles use the low end of the same union as a kids run. */
const FULL_RUN: ProductSize[] = ['5', '6', '7', '8', '9', '10', '11', '12']
const CORE_RUN: ProductSize[] = ['6', '7', '8', '9', '10', '11']
const SMALL_RUN: ProductSize[] = ['5', '6', '7', '8', '9', '10', '11']
const KIDS_RUN: ProductSize[] = ['5', '6', '7', '8']
/** Accessories that come in one size are listed under size 8. */
const ONE_SIZE: ProductSize[] = ['8']

const FIT_NOTE = 'Runs true to size; size up if you wear them with socks'
const CARE_NOTE = 'Rinse with soap and water, air dry away from direct sun'

const SPECS: ProductSpec[] = [
  // Clogs
  {
    id: 'prod-01',
    slug: 'lava-premium-clog',
    name: 'Lava Premium Clog',
    description:
      'Our signature clog in a deep volcanic red. Injection-moulded from a single piece of lightweight EVA foam with a roomy toe box, a contoured arch and a removable heel strap you can wear back or flipped forward.',
    details: [
      'Single-piece EVA foam, 220 g per pair (size 8)',
      FIT_NOTE,
      'Removable heel strap with matte rivets',
      'Ventilation ports drain water in seconds',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1190,
    colors: [COLORS.lava, COLORS.ice, COLORS.midnight],
    sizes: FULL_RUN,
    imageStart: 0,
    imageCount: 4,
    isFeatured: true,
    salesCount: 412,
    createdDaysAgo: 120,
    stockSeed: 0,
  },
  {
    id: 'prod-02',
    slug: 'ice-premium-clog',
    name: 'Ice Premium Clog',
    description:
      'The Premium Clog in a cool, pale blue that reads almost white in the sun. Same cushioned footbed, same removable strap, with a tonal strap rivet.',
    details: [
      'Single-piece EVA foam',
      FIT_NOTE,
      'Removable heel strap, tonal rivets',
      'Non-slip tread pattern',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1190,
    colors: [COLORS.ice, COLORS.bone],
    sizes: FULL_RUN,
    imageStart: 1,
    imageCount: 3,
    salesCount: 64,
    createdDaysAgo: 12,
    stockSeed: 3,
  },
  {
    id: 'prod-03',
    slug: 'midnight-clog',
    name: 'Midnight Clog',
    description:
      'A near-black navy clog that hides scuffs and goes with everything. Slightly firmer EVA compound for people who stand all day, with the same removable strap.',
    details: [
      'Firm-density EVA foam',
      FIT_NOTE,
      'Removable heel strap',
      'Odour-resistant footbed',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1090,
    salePrice: 890,
    colors: [COLORS.midnight, COLORS.charcoal],
    sizes: CORE_RUN,
    imageStart: 2,
    imageCount: 2,
    salesCount: 150,
    createdDaysAgo: 95,
    stockSeed: 7,
  },
  {
    id: 'prod-04',
    slug: 'forest-camo-clog',
    name: 'Forest Camo Clog',
    description:
      'A hydro-dipped woodland camo over our Forest base. Every pair takes the print slightly differently, so no two are identical. Removable strap in solid Forest.',
    details: [
      'Single-piece EVA foam with hydro-dip print',
      FIT_NOTE,
      'Removable heel strap',
      'Print is sealed and will not peel in the wash',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1390,
    colors: [COLORS.forest, COLORS.sand],
    sizes: CORE_RUN,
    imageStart: 3,
    imageCount: 3,
    salesCount: 30,
    createdDaysAgo: 5,
    stockSeed: 11,
  },
  {
    id: 'prod-05',
    slug: 'soft-tone-clog-sand',
    name: 'Soft Tone Clog – Sand',
    description:
      'From the Soft Tones drop: muted, chalky colourways that pair with linen and denim alike. The Sand base ships with a Bone strap for a two-tone look; swap in any strap from the accessories range.',
    details: [
      'Single-piece EVA foam, matte finish',
      FIT_NOTE,
      'Two-tone removable heel strap',
      'Contoured arch support',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1290,
    colors: [COLORS.sand, COLORS.bone, COLORS.lilac],
    sizes: SMALL_RUN,
    imageStart: 4,
    imageCount: 4,
    isFeatured: true,
    salesCount: 230,
    createdDaysAgo: 150,
    stockSeed: 2,
  },
  {
    id: 'prod-06',
    slug: 'soft-tone-clog-sage',
    name: 'Soft Tone Clog – Sage',
    description:
      'The Soft Tones clog in a dusty green with a Lilac strap. Matte EVA that resists scuffing, with the same cushioned footbed as the Premium Clog.',
    details: [
      'Single-piece EVA foam, matte finish',
      FIT_NOTE,
      'Two-tone removable heel strap',
      'Ventilation ports',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1290,
    colors: [COLORS.sage, COLORS.lilac],
    sizes: SMALL_RUN,
    imageStart: 5,
    imageCount: 3,
    salesCount: 98,
    createdDaysAgo: 80,
    stockSeed: 5,
  },
  {
    id: 'prod-07',
    slug: 'evil-eye-charm-clog',
    name: 'Evil Eye Charm Clog',
    description:
      'The Premium Clog pre-loaded with a set of six evil-eye charms in blue, white and gold enamel. Charms pop in and out of the ventilation ports so you can rearrange them.',
    details: [
      'Single-piece EVA foam',
      FIT_NOTE,
      'Includes 6 enamel charms',
      'Removable heel strap',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1490,
    salePrice: 1190,
    colors: [COLORS.midnight, COLORS.bone],
    sizes: ['6', '7', '8', '9', '10'],
    imageStart: 6,
    imageCount: 2,
    salesCount: 140,
    createdDaysAgo: 110,
    stockSeed: 9,
  },
  {
    id: 'prod-08',
    slug: 'fleece-lined-clog',
    name: 'Fleece-Lined Clog',
    description:
      'A closed-port clog with a removable brushed-fleece liner for Baguio weekends and over-chilled offices. Liner washes separately; the shell is the same EVA as the rest of the range.',
    details: [
      'Closed-port EVA shell with removable fleece liner',
      'Runs true to size with the liner in; size down without it',
      'Removable heel strap',
      'Machine wash the liner cold; rinse the shell',
    ],
    ...CLOGS,
    basePrice: 1690,
    colors: [COLORS.charcoal, COLORS.forest],
    sizes: CORE_RUN,
    imageStart: 7,
    imageCount: 3,
    status: 'draft',
    salesCount: 0,
    createdDaysAgo: 3,
    stockSeed: 13,
  },
  {
    id: 'prod-09',
    slug: 'platform-clog',
    name: 'Platform Clog',
    description:
      'An extra 2.5 cm of EVA under the Premium Clog. Same weight class thanks to a lower-density core, with a wider outsole for stability and the removable strap.',
    details: [
      'Dual-density EVA foam, 4.5 cm total stack',
      FIT_NOTE,
      'Removable heel strap',
      'Wide-base non-slip outsole',
      CARE_NOTE,
    ],
    ...CLOGS,
    basePrice: 1590,
    colors: [COLORS.lava, COLORS.midnight, COLORS.bone],
    sizes: SMALL_RUN,
    imageStart: 8,
    imageCount: 4,
    isFeatured: true,
    salesCount: 280,
    createdDaysAgo: 130,
    stockSeed: 4,
  },
  // Slides
  {
    id: 'prod-10',
    slug: 'island-two-strap-slide',
    name: 'Island Two-Strap Slide',
    description:
      'Two wide, adjustable straps on a thick contoured footbed. Built for island hopping: the sole grips wet boat decks and the whole thing rinses clean of sand.',
    details: [
      'EVA footbed with moulded arch, 3 cm heel',
      'Two adjustable hook-and-loop straps',
      FIT_NOTE,
      'Non-slip wet-grip tread',
      CARE_NOTE,
    ],
    ...SLIDES,
    basePrice: 990,
    colors: [COLORS.midnight, COLORS.sand],
    sizes: FULL_RUN,
    imageStart: 0,
    imageCount: 4,
    isFeatured: true,
    salesCount: 45,
    createdDaysAgo: 20,
    stockSeed: 6,
  },
  {
    id: 'prod-11',
    slug: 'court-slide',
    name: 'Court Slide',
    description:
      'A classic single-band slide with a debossed logo and a softer footbed than the clogs. The everyday pair for condos, gyms and quick runs to the sari-sari.',
    details: ['Soft EVA footbed', 'Single moulded band', FIT_NOTE, 'Non-slip tread', CARE_NOTE],
    ...SLIDES,
    basePrice: 890,
    colors: [COLORS.lava, COLORS.ice, COLORS.charcoal],
    sizes: CORE_RUN,
    imageStart: 1,
    imageCount: 3,
    salesCount: 72,
    createdDaysAgo: 70,
    stockSeed: 8,
  },
  {
    id: 'prod-12',
    slug: 'cloud-slide',
    name: 'Cloud Slide',
    description:
      'Our softest footbed, a pillowy low-density EVA that compresses underfoot and springs back. A wide single strap keeps it secure without pressure points.',
    details: [
      'Low-density EVA, 4 cm stack',
      'Wide single strap',
      'Runs half a size large; size down if between sizes',
      'Non-slip tread',
      CARE_NOTE,
    ],
    ...SLIDES,
    basePrice: 1190,
    salePrice: 890,
    colors: [COLORS.bone, COLORS.lilac],
    sizes: SMALL_RUN,
    imageStart: 2,
    imageCount: 2,
    salesCount: 95,
    createdDaysAgo: 100,
    stockSeed: 10,
  },
  {
    id: 'prod-13',
    slug: 'crossover-slide',
    name: 'Crossover Slide',
    description:
      'Two straps that cross over the instep for a more secure hold than a single band. A slightly firmer footbed suits long walking days.',
    details: [
      'Medium-density EVA footbed',
      'Crossed moulded straps',
      FIT_NOTE,
      'Non-slip tread',
      CARE_NOTE,
    ],
    ...SLIDES,
    basePrice: 1090,
    colors: [COLORS.forest, COLORS.midnight],
    sizes: CORE_RUN,
    imageStart: 3,
    imageCount: 4,
    isFeatured: true,
    salesCount: 160,
    createdDaysAgo: 140,
    stockSeed: 1,
  },
  {
    id: 'prod-14',
    slug: 'recovery-slide',
    name: 'Recovery Slide',
    description:
      'A deep-cradle footbed with a pronounced arch and a raised heel cup, designed for the day after a long run or a long shift on your feet.',
    details: [
      'Dual-density EVA with deep heel cup',
      'Single adjustable strap',
      FIT_NOTE,
      'Non-slip tread',
      CARE_NOTE,
    ],
    ...SLIDES,
    basePrice: 1290,
    colors: [COLORS.charcoal, COLORS.sage],
    sizes: CORE_RUN,
    imageStart: 0,
    imageCount: 3,
    salesCount: 58,
    createdDaysAgo: 60,
    stockSeed: 12,
  },
  // Loafer Mules
  {
    id: 'prod-15',
    slug: 'terra-loafer-mule',
    name: 'Terra Loafer Mule',
    description:
      'A closed-toe, backless loafer silhouette moulded in matte EVA. Office-appropriate from the front, slip-on easy from the back, and still fully washable.',
    details: [
      'Matte EVA upper and footbed',
      FIT_NOTE,
      'Backless loafer cut',
      'Contoured arch support',
      CARE_NOTE,
    ],
    ...MULES,
    basePrice: 1890,
    colors: [COLORS.sand, COLORS.charcoal],
    sizes: SMALL_RUN,
    imageStart: 0,
    imageCount: 3,
    salesCount: 20,
    createdDaysAgo: 9,
    stockSeed: 14,
  },
  {
    id: 'prod-16',
    slug: 'studio-loafer-mule',
    name: 'Studio Loafer Mule',
    description:
      'The first-run loafer mule with a squared toe and a thinner sole. Replaced by the Terra and Dusk, kept here for anyone who wants to re-order their pair.',
    details: ['Matte EVA upper and footbed', FIT_NOTE, 'Squared toe', CARE_NOTE],
    ...MULES,
    basePrice: 1990,
    colors: [COLORS.midnight, COLORS.bone],
    sizes: ['5', '6', '7', '8', '9', '10'],
    imageStart: 3,
    imageCount: 2,
    status: 'archived',
    salesCount: 40,
    createdDaysAgo: 200,
    stockSeed: 15,
  },
  {
    id: 'prod-17',
    slug: 'dusk-loafer-mule',
    name: 'Dusk Loafer Mule',
    description:
      'Our dressiest shape: a loafer mule with a moulded penny strap detail and a slightly tapered toe. Cushioned like a clog, finished like a shoe.',
    details: [
      'Matte EVA upper with moulded penny strap',
      FIT_NOTE,
      'Backless loafer cut',
      'Non-slip tread',
      CARE_NOTE,
    ],
    ...MULES,
    basePrice: 2490,
    colors: [COLORS.midnight, COLORS.lilac],
    sizes: SMALL_RUN,
    imageStart: 2,
    imageCount: 4,
    isFeatured: true,
    salesCount: 190,
    createdDaysAgo: 160,
    stockSeed: 16,
  },
  // Straps & Accessories
  {
    id: 'prod-18',
    slug: 'replacement-strap-set',
    name: 'Replacement Strap Set',
    description:
      'A pair of heel straps with rivets, sized to match your clog. Swap colours to refresh a pair or replace a strap that has gone missing.',
    details: [
      'Moulded EVA strap, two rivets per pair',
      'Order the same size as your clog',
      'Fits every clog in the range',
      CARE_NOTE,
    ],
    ...STRAPS,
    basePrice: 390,
    colors: [COLORS.lava, COLORS.ice, COLORS.midnight],
    sizes: FULL_RUN,
    imageStart: 5,
    imageCount: 2,
    salesCount: 310,
    createdDaysAgo: 85,
    stockSeed: 17,
  },
  {
    id: 'prod-19',
    slug: 'sole-charm-pack',
    name: 'Sole Charm Pack',
    description:
      'Eight enamel charms — sun, jeepney, mango, wave and friends — that push into the ventilation ports of any clog. One size fits every pair; select 8 at checkout.',
    details: [
      '8 enamel charms with rubber backs',
      'One size (listed as 8)',
      'Fits all clog ventilation ports',
      'Wipe clean',
    ],
    ...STRAPS,
    basePrice: 290,
    colors: [COLORS.bone, COLORS.lilac],
    sizes: ONE_SIZE,
    imageStart: 7,
    imageCount: 2,
    salesCount: 42,
    createdDaysAgo: 25,
    stockSeed: 18,
  },
  {
    id: 'prod-20',
    slug: 'sport-heel-strap',
    name: 'Sport Heel Strap',
    description:
      'An elasticated heel strap with a hook-and-loop closure that locks a clog on for cycling, commuting and chasing kids. Swaps onto the standard rivets in seconds.',
    details: [
      'Elastic webbing with hook-and-loop closure',
      'Order the same size as your clog',
      'Fits every clog in the range',
      'Hand wash',
    ],
    ...STRAPS,
    basePrice: 490,
    salePrice: 390,
    colors: [COLORS.charcoal, COLORS.lava],
    sizes: FULL_RUN,
    imageStart: 6,
    imageCount: 2,
    salesCount: 80,
    createdDaysAgo: 105,
    stockSeed: 19,
  },
  {
    id: 'prod-21',
    slug: 'clog-care-kit',
    name: 'Clog Care Kit',
    description:
      'A soft brush, a scuff eraser and a bottle of EVA-safe cleaner to bring a well-loved pair back to new. Retired while we reformulate the cleaner.',
    details: [
      'Brush, eraser and 120 ml cleaner',
      'One size (listed as 8)',
      'Safe on all colourways',
    ],
    ...STRAPS,
    basePrice: 590,
    colors: [COLORS.bone],
    sizes: ONE_SIZE,
    imageStart: 1,
    imageCount: 2,
    status: 'archived',
    salesCount: 73,
    createdDaysAgo: 180,
    stockSeed: 3,
  },
  // Kids
  {
    id: 'prod-22',
    slug: 'kids-mini-clog',
    name: 'Kids Mini Clog',
    description:
      'The Premium Clog scaled down for small feet, with a snugger heel strap that stays put on the playground. Kids sizes 5–8 (our kids run, not US adult sizing); measure foot length and use the size guide.',
    details: [
      'Single-piece EVA foam',
      'Kids run 5–8; size up if between sizes',
      'Snug-fit heel strap',
      'Non-slip tread',
      CARE_NOTE,
    ],
    ...KIDS,
    basePrice: 890,
    colors: [COLORS.lava, COLORS.ice],
    sizes: KIDS_RUN,
    imageStart: 4,
    imageCount: 3,
    salesCount: 75,
    createdDaysAgo: 28,
    stockSeed: 6,
  },
  {
    id: 'prod-23',
    slug: 'kids-forest-camo-clog',
    name: 'Kids Forest Camo Clog',
    description:
      'The hydro-dipped camo clog in kids sizes 5–8, with a solid Forest heel strap. Each pair takes the print a little differently.',
    details: [
      'Single-piece EVA foam with hydro-dip print',
      'Kids run 5–8; size up if between sizes',
      'Snug-fit heel strap',
      CARE_NOTE,
    ],
    ...KIDS,
    basePrice: 990,
    colors: [COLORS.forest, COLORS.sand],
    sizes: KIDS_RUN,
    imageStart: 3,
    imageCount: 3,
    salesCount: 30,
    createdDaysAgo: 15,
    stockSeed: 9,
  },
  {
    id: 'prod-24',
    slug: 'kids-two-strap-slide',
    name: 'Kids Two-Strap Slide',
    description:
      'The Island Two-Strap Slide in kids sizes 5–8 with shorter, grippier straps and a brighter strap rivet. Launching with the next drop.',
    details: [
      'EVA footbed with moulded arch',
      'Kids run 5–8',
      'Two adjustable hook-and-loop straps',
      CARE_NOTE,
    ],
    ...KIDS,
    imagePool: 'slides',
    basePrice: 890,
    colors: [COLORS.ice, COLORS.lilac],
    sizes: KIDS_RUN,
    imageStart: 1,
    imageCount: 2,
    status: 'draft',
    salesCount: 0,
    createdDaysAgo: 2,
    stockSeed: 12,
  },
]

export const SEED_PRODUCTS: Product[] = SPECS.map(buildProduct)
