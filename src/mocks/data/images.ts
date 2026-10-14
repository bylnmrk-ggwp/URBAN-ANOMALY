/**
 * Builds a Pexels CDN URL from a photo id. Default width suits product, category and
 * marquee tiles; pass 1800 for hero slides and 1200 for promo / story images.
 */
export function pexels(id: string, width = 900): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`
}

/** Photo pools by silhouette. Every id is a verified unbranded clog, slide, mule or sandal. */
export const PHOTO_POOLS = {
  clogs: [
    '12320132',
    '12349148',
    '14544746',
    '18188523',
    '18188524',
    '12922455',
    '12368079',
    '12368090',
    '12368097',
  ],
  slides: ['13698233', '13836590', '11883902', '14187813'],
  mules: ['10117809', '10117818', '15314755', '13066629', '1687821'],
} as const satisfies Record<string, readonly string[]>

export type PhotoPool = keyof typeof PHOTO_POOLS

/** Every curated photo id, clogs first, used across the demo catalogue. */
export const PHOTO_IDS = [
  ...PHOTO_POOLS.clogs,
  ...PHOTO_POOLS.slides,
  ...PHOTO_POOLS.mules,
] as const

/** Returns `count` ids from `pool` starting at `start`, wrapping around the pool. */
export function pickPhotoIds(pool: PhotoPool, start: number, count: number): string[] {
  const source = PHOTO_POOLS[pool]
  const ids: string[] = []
  for (let i = 0; i < count; i += 1) {
    const id = source[(start + i) % source.length]
    if (id) ids.push(id)
  }
  return ids
}

export const HERO_IMAGES: string[] = [
  pexels('12368079', 1800),
  pexels('13698233', 1800),
  pexels('18188523', 1800),
]

export const CATEGORY_IMAGES: Record<string, string> = {
  clogs: pexels('14544746'),
  slides: pexels('13836590'),
  'loafer-mules': pexels('10117809'),
  'straps-accessories': pexels('12922455'),
  kids: pexels('18188524'),
}
