import type { DiscountCode } from '@/features/discounts/domain/entities'

import { daysAgo } from './products'

/** Four demo codes: three usable today and one that expired last month. */
export const SEED_DISCOUNTS: DiscountCode[] = [
  {
    id: 'disc-welcome10',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minSubtotal: 1000,
    maxUses: null,
    usedCount: 42,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: daysAgo(120),
  },
  {
    id: 'disc-freeship',
    code: 'FREESHIP',
    type: 'fixed',
    value: 150,
    minSubtotal: 0,
    maxUses: 500,
    usedCount: 118,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: daysAgo(90),
  },
  {
    id: 'disc-summer500',
    code: 'SUMMER500',
    type: 'fixed',
    value: 500,
    minSubtotal: 2500,
    maxUses: 200,
    usedCount: 27,
    startsAt: daysAgo(10),
    endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: daysAgo(12),
  },
  {
    id: 'disc-launch20',
    code: 'LAUNCH20',
    type: 'percent',
    value: 20,
    minSubtotal: 1500,
    maxUses: 100,
    usedCount: 100,
    startsAt: daysAgo(80),
    endsAt: daysAgo(30),
    isActive: true,
    createdAt: daysAgo(82),
  },
]
