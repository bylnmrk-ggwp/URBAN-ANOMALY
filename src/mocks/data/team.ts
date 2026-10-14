import type { TeamMember } from '@/features/team/domain/entities'

import { daysAgo } from './products'

/** The seeded owner mirrors `admin@demo.local`; the staff member mirrors `staff@demo.local`. */
export const SEED_TEAM: TeamMember[] = [
  {
    id: 'user-admin-1',
    email: 'admin@demo.local',
    fullName: 'Store Admin',
    role: 'owner',
    status: 'active',
    lastActiveAt: daysAgo(0, 1),
    createdAt: daysAgo(365),
  },
  {
    id: 'user-staff-1',
    email: 'staff@demo.local',
    fullName: 'Jamie Reyes',
    role: 'staff',
    status: 'active',
    lastActiveAt: daysAgo(1, 3),
    createdAt: daysAgo(140),
  },
]
