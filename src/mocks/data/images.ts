/**
 * Builds a Pexels CDN URL from a photo id. Default width suits product, category and
 * marquee tiles; pass 1800 for hero slides and 1200 for promo / story images.
 */
export function pexels(id: string, width = 900): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`
}

/**
 * Photo pools by silhouette. Every id is a hand-checked, logo-free EVA clog, slide, mule,
 * kids shoe or accessory shot. Each pool is ordered so that a product's contiguous
 * `imageStart` / `imageCount` window reads as one colourway.
 */
export const PHOTO_POOLS = {
  clogs: [
    // 0-3 red and blue (Lava)
    '18368104',
    '18368096',
    '12320132',
    '12349148',
    // 4-7 blue and ice (Ice)
    '9313792',
    '12120326',
    '12189411',
    '10410066',
    // 8-12 navy and black (Midnight, Fleece-Lined)
    '12616156',
    '1689612',
    '18255352',
    '18255346',
    '24509391',
    // 13-15 marbled and printed (Forest Camo)
    '1033774',
    '39048466',
    '25306342',
    // 16-19 beige, cream and lilac (Soft Tones)
    '18188524',
    '18188523',
    '12922455',
    '18188548',
    // 20-23 charms (Evil Eye)
    '13097398',
    '18255347',
    '28211248',
    '10078139',
    // 24-27 studio (Platform)
    '25906614',
    '8801134',
    '8801123',
    '8801175',
  ],
  slides: [
    // 0-5 two-strap and buckle (Island)
    '31129829',
    '4296072',
    '37305536',
    '38621731',
    '9074406',
    '36937550',
    // 6-10 black, navy and brown foam (Court)
    '18186215',
    '26585906',
    '10596762',
    '13698233',
    '13698234',
    // 11-15 sculpted and stacked (Cloud, Crossover)
    '24645252',
    '24645253',
    '24645250',
    '13966800',
    '13966799',
    // 16-19 green, pink and white (Crossover)
    '13836590',
    '11883902',
    '38755593',
    '33987673',
    // 20-24 lime, blue and socks (Recovery)
    '30471939',
    '29320435',
    '9741975',
    '12368093',
    '9741912',
  ],
  mules: [
    // 0-1 brown (Terra)
    '10117809',
    '10117818',
    // 2-4 yellow and bone (Studio)
    '7691385',
    '7691393',
    '5059657',
    // 5-7 pink and monochrome (Dusk)
    '21555668',
    '13066629',
    '1687821',
  ],
  accessories: [
    // 0-4 charms on clogs and slides (Sole Charm Pack)
    '37290957',
    '36550153',
    '28211248',
    '10078139',
    '13097398',
    // 5-8 straps and buckles (Replacement Strap Set)
    '8989596',
    '36937550',
    '31129829',
    '37305536',
    // 9-11 heel strap in use (Sport Heel Strap)
    '18255347',
    '12120326',
    '18368096',
    // 12-15 water, sand and soles (Clog Care Kit)
    '12189411',
    '12349148',
    '8223777',
    '12262095',
  ],
  kids: [
    // 0-3 pink charm clogs (Kids Mini Clog)
    '37305529',
    '37305530',
    '37305528',
    '18255347',
    // 4-7 beige charm clogs and beach (Kids Forest Camo Clog)
    '37242420',
    '4671991',
    '39772270',
    '10078139',
    // 8-10 buckle sandals and charm slide (Kids Two-Strap Slide)
    '8084238',
    '37305536',
    '37290957',
  ],
} as const satisfies Record<string, readonly string[]>

export type PhotoPool = keyof typeof PHOTO_POOLS

/** Every curated photo id, clogs first, used across the demo catalogue. */
export const PHOTO_IDS = [
  ...PHOTO_POOLS.clogs,
  ...PHOTO_POOLS.slides,
  ...PHOTO_POOLS.mules,
  ...PHOTO_POOLS.accessories,
  ...PHOTO_POOLS.kids,
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
  clogs: pexels('18368104'),
  slides: pexels('18186215'),
  'loafer-mules': pexels('10117809'),
  'straps-accessories': pexels('37290957'),
  kids: pexels('37305529'),
}
