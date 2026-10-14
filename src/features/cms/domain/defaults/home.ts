import type { PageContent } from '../sections'

import { pexels } from './pexels'

const marquee = (id: string, alt: string) => ({ mediaId: null, url: pexels(id), alt })

/** Default homepage, expressed as data. Mock mode and the SQL seed both start from this. */
export const HOME_PAGE_DEFAULT: PageContent = {
  title: 'Home',
  seoTitle: 'URBAN ANOMALY',
  seoDescription:
    'Washable EVA clogs, slides and loafer mules, made in Marikina for Manila streets.',
  sections: [
    {
      id: 'home-hero',
      type: 'hero',
      visible: true,
      anchor: '',
      eyebrow: 'New drop',
      title: 'Clogs built for Manila streets.',
      subtitle:
        'Single-piece EVA foam, a removable heel strap and a sole that grips wet tile. Rinse them off and wear them again tomorrow.',
      image: {
        mediaId: 'media-hero-lava',
        url: pexels('12368079', 1800),
        alt: 'Pair of EVA clogs resting on a concrete step',
      },
      slides: [
        {
          image: {
            mediaId: 'media-hero-ice',
            url: pexels('13698233', 1800),
            alt: 'Cushioned slides beside a swimming pool',
          },
          eyebrow: 'Restock',
          title: 'Lava & Ice are back.',
          subtitle:
            'Our two best-selling colourways return in every size from 5 to 12, with matching replacement straps.',
          cta: { label: 'Shop the restock', href: '/collections/clogs' },
        },
        {
          image: {
            mediaId: 'media-hero-street',
            url: pexels('18188523', 1800),
            alt: 'Matte clogs worn on a Manila sidewalk',
          },
          eyebrow: 'Soft Tones',
          title: 'Made for Manila streets.',
          subtitle:
            'Sand, Sage and Lilac: chalky matte colourways that shrug off scuffs and pair with everything in your closet.',
          cta: { label: 'Shop Soft Tones', href: '/shop?sort=newest' },
        },
      ],
      autoplaySeconds: 6,
      primaryCta: { label: 'Shop Clogs', href: '/collections/clogs' },
      secondaryCta: { label: 'New Drop', href: '/shop?sort=newest' },
      align: 'left',
      height: 'default',
    },
    {
      id: 'home-categories',
      type: 'category_tiles',
      visible: true,
      anchor: '',
      eyebrow: 'Browse',
      title: 'Shop by category',
      categoryIds: [],
      limit: 5,
    },
    {
      id: 'home-new-drop',
      type: 'product_collection',
      visible: true,
      anchor: '',
      eyebrow: 'Just landed',
      title: 'New Drop',
      source: 'new_arrivals',
      productIds: [],
      limit: 8,
      viewAllHref: '/shop?sort=newest',
    },
    {
      id: 'home-promo',
      type: 'promo_banner',
      visible: true,
      anchor: '',
      image: {
        mediaId: 'media-promo-slide',
        url: pexels('13698233', 1200),
        alt: 'Two-strap slide on a wet boat deck',
      },
      eyebrow: 'Island ready',
      title: 'Two straps. Zero fuss.',
      body: 'The Island Two-Strap Slide locks on for boat decks and jeepney steps, then rinses clean of sand in seconds.',
      cta: { label: 'Shop the slide', href: '/products/island-two-strap-slide' },
      imageSide: 'left',
    },
    {
      id: 'home-best-sellers',
      type: 'product_collection',
      visible: true,
      anchor: '',
      eyebrow: 'Customer favourites',
      title: 'Best Sellers',
      source: 'best_sellers',
      productIds: [],
      limit: 8,
      viewAllHref: '/shop?sort=best_selling',
    },
    {
      id: 'home-marquee',
      type: 'image_marquee',
      visible: true,
      anchor: '',
      images: [
        marquee('12320132', 'Clogs on a concrete step'),
        marquee('12349148', 'Pale clogs by the pool'),
        marquee('13836590', 'Slides on a city sidewalk'),
        marquee('14187813', 'Two-strap slide on a boat deck'),
        marquee('12368097', 'Clogs lined up in the workshop'),
        marquee('14544746', 'Platform clog, side view'),
        marquee('11883902', 'Court slide in Lava'),
        marquee('10117809', 'Loafer mule on a wooden floor'),
      ],
      speed: 45,
      tileHeight: 'md',
      pauseOnHover: true,
    },
    {
      id: 'home-values',
      type: 'value_props',
      visible: true,
      anchor: '',
      eyebrow: 'Why us',
      title: 'Shoes you can stand behind.',
      items: [
        {
          icon: 'heart',
          title: 'Made in the Philippines',
          body: 'Moulded, finished and strapped in our partner workshop in Marikina, the shoe capital of the country.',
        },
        {
          icon: 'shield-check',
          title: 'Washable & waterproof',
          body: 'Closed-cell EVA soaks up nothing. Rinse with soap and water after the flood and they dry in minutes.',
        },
        {
          icon: 'refresh-cw',
          title: '14-day exchanges',
          body: 'Wrong size? Fourteen days to swap any unworn pair for another size or colour. We cover the pickup.',
        },
      ],
      columns: 3,
      bordered: true,
    },
    {
      id: 'home-newsletter',
      type: 'newsletter',
      visible: true,
      anchor: '',
      title: 'Hear about the next drop first',
      body: 'One email a month: new colourways, restocks and the occasional honest sale. No spam.',
      buttonLabel: 'Subscribe',
    },
  ],
}
