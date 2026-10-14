import type { Review, ReviewStatus } from '@/features/reviews/domain/entities'

import { pexels } from './images'
import { daysAgo, SEED_PRODUCTS } from './products'

/** Demo buyer (buyer@demo.local). Her reviews are verified via delivered seed orders. */
const MARIA_ID = 'user-buyer-1'

interface ReviewSpec {
  id: string
  productId: string
  userId?: string
  authorName: string
  rating: Review['rating']
  title: string
  body: string
  photoIds?: string[]
  isVerifiedPurchase?: boolean
  status?: ReviewStatus
  daysAgo: number
}

function buildReview(spec: ReviewSpec): Review {
  const product = SEED_PRODUCTS.find((p) => p.id === spec.productId)
  if (!product)
    throw new Error(`Seed review ${spec.id} references unknown product ${spec.productId}`)
  return {
    id: spec.id,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    userId: spec.userId ?? null,
    authorName: spec.authorName,
    rating: spec.rating,
    title: spec.title,
    body: spec.body,
    photoUrls: (spec.photoIds ?? []).map((id) => pexels(id)),
    isVerifiedPurchase: spec.isVerifiedPurchase ?? false,
    status: spec.status ?? 'approved',
    createdAt: daysAgo(spec.daysAgo, (spec.id.length * 3) % 12),
  }
}

const SPECS: ReviewSpec[] = [
  {
    id: 'rev-01',
    productId: 'prod-01',
    userId: MARIA_ID,
    authorName: 'Maria S.',
    rating: 5,
    title: 'Finally a clog that survives the rainy season',
    body: 'Walked through two flooded streets in Maginhawa and just rinsed them under the tap when I got home. The arch support is real, and the Lava red has not faded after a month in the sun.',
    photoIds: ['12320132'],
    isVerifiedPurchase: true,
    daysAgo: 40,
  },
  {
    id: 'rev-02',
    productId: 'prod-01',
    authorName: 'Juan D.',
    rating: 4,
    title: 'Light, in a good way',
    body: 'Lighter than my old rubber clogs and the strap flips forward without feeling loose. Took one star off because the footbed squeaks a little on wet tile. Would still buy again.',
    daysAgo: 33,
  },
  {
    id: 'rev-03',
    productId: 'prod-01',
    authorName: 'Carlo M.',
    rating: 2,
    title: 'Runs small with socks',
    body: 'Ordered my usual 9 and it pinches at the toes when I wear socks. Barefoot it is fine. Quality is good but I had to give them to my brother. Size up if you are between sizes.',
    daysAgo: 21,
  },
  {
    id: 'rev-04',
    productId: 'prod-13',
    userId: MARIA_ID,
    authorName: 'Maria S.',
    rating: 4,
    title: 'Secure for long walks',
    body: 'The crossed straps actually hold your foot, unlike a flat slide. Walked the whole of BGC in these. The Midnight is a little darker than the photos.',
    photoIds: ['13698233', '11883902'],
    isVerifiedPurchase: true,
    daysAgo: 38,
  },
  {
    id: 'rev-05',
    productId: 'prod-13',
    authorName: 'Rafael T.',
    rating: 5,
    title: 'Worth every peso',
    body: 'I have been looking for a slide that does not slap against my heel. These are it. Firm footbed, grippy sole, and the straps have not stretched after two months.',
    daysAgo: 15,
  },
  {
    id: 'rev-06',
    productId: 'prod-11',
    userId: MARIA_ID,
    authorName: 'Maria S.',
    rating: 5,
    title: 'Soft and grippy',
    body: 'I keep a pair by the door for quick errands. Softer than the clogs underfoot and the sole grips wet condo tiles. The Lava colour is rich and matches my clogs.',
    photoIds: ['13836590'],
    isVerifiedPurchase: true,
    daysAgo: 27,
  },
  {
    id: 'rev-07',
    productId: 'prod-11',
    authorName: 'Isabel C.',
    rating: 3,
    title: 'Nice but marks easily',
    body: 'Lovely colour and very comfortable, but the Ice shows every scuff after two weeks. It does wash off with soap. Still wearing them though.',
    status: 'pending',
    daysAgo: 3,
  },
  {
    id: 'rev-08',
    productId: 'prod-12',
    userId: MARIA_ID,
    authorName: 'Maria S.',
    rating: 4,
    title: 'Pillowy, solid strap',
    body: 'The footbed really is cloud-soft and the wide strap does not dig in. They run a touch big — I should have sized down like the listing says.',
    isVerifiedPurchase: true,
    daysAgo: 12,
  },
  {
    id: 'rev-09',
    productId: 'prod-12',
    authorName: 'anon_user_99',
    rating: 1,
    title: 'Terrible',
    body: 'Do not buy from this store!!! Check out my page for cheaper slides instead, link in bio. Total scam.',
    status: 'rejected',
    daysAgo: 9,
  },
  {
    id: 'rev-10',
    productId: 'prod-09',
    authorName: 'Paolo V.',
    rating: 5,
    title: 'My new favourite clog',
    body: 'The extra height is noticeable without feeling wobbly. The wide base keeps you steady on gravel and the strap rivets feel solid. Shipping to Davao was fast too.',
    photoIds: ['12368090'],
    daysAgo: 30,
  },
  {
    id: 'rev-11',
    productId: 'prod-09',
    authorName: 'Dennis L.',
    rating: 4,
    title: 'Great platform, slightly stiff',
    body: 'Comfort and grip are excellent. The dual-density sole is stiffer than the regular clog so it reads more fashion than beach. Good value overall.',
    status: 'pending',
    daysAgo: 1,
  },
  {
    id: 'rev-12',
    productId: 'prod-02',
    authorName: 'Christine T.',
    rating: 3,
    title: 'Decent everyday clog',
    body: 'The Ice colour is versatile and the strap swaps easily. It picks up dirt faster than the darker colours so expect to rinse it often. Fine for the price.',
    daysAgo: 18,
  },
  {
    id: 'rev-13',
    productId: 'prod-17',
    authorName: 'Miguel B.',
    rating: 5,
    title: 'Perfect for the office and the commute',
    body: 'Looks like a loafer from the front, feels like a clog underfoot. Wore them to a client pitch and then through a Makati downpour the same evening. Rinsed clean.',
    photoIds: ['10117818', '15314755'],
    daysAgo: 24,
  },
  {
    id: 'rev-14',
    productId: 'prod-05',
    authorName: 'Andrea R.',
    rating: 4,
    title: 'Soft colours, soft footbed',
    body: 'The Sand and Bone combination is lovely and the matte finish does not look plasticky. Would love a slightly higher heel cup but otherwise a beautiful clog.',
    status: 'pending',
    daysAgo: 2,
  },
]

export const SEED_REVIEWS: Review[] = SPECS.map(buildReview)
