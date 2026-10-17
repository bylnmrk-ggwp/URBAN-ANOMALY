import type { AuthUser } from '@/features/auth/domain/entities'

import { daysAgo } from './products'

/**
 * Demo account. The password lives next to, never inside, the `AuthUser` so it
 * can never leak through a session object. The pending verification code is
 * kept out of `AuthUser` for the same reason.
 */
export interface MockUserAccount {
  user: AuthUser
  password: string
  /** Code the buyer still has to confirm; `null` once the address is verified. */
  pendingVerificationCode: string | null
  createdAt: string
}

export const SEED_USERS: MockUserAccount[] = [
  {
    user: {
      id: 'user-admin-1',
      email: 'admin@demo.local',
      fullName: 'Store Admin',
      phone: '09170000001',
      role: 'admin',
      adminRole: 'owner',
      addresses: [],
    },
    password: 'password',
    pendingVerificationCode: null,
    createdAt: daysAgo(365),
  },
  {
    user: {
      id: 'user-staff-1',
      email: 'staff@demo.local',
      fullName: 'Jamie Reyes',
      phone: '09170000002',
      role: 'admin',
      adminRole: 'staff',
      addresses: [],
    },
    password: 'password',
    pendingVerificationCode: null,
    createdAt: daysAgo(140),
  },
  {
    user: {
      id: 'user-buyer-1',
      email: 'buyer@demo.local',
      fullName: 'Maria Santos',
      phone: '09171234567',
      role: 'buyer',
      adminRole: null,
      addresses: [
        {
          id: 'addr-buyer-1-home',
          label: 'Home',
          addressLine: '24 Maginhawa Street, Unit 3B',
          barangay: 'Teachers Village East',
          city: 'Quezon City',
          province: 'Metro Manila',
          postalCode: '1101',
          deliveryInstructions: 'Leave with the guard if no answer.',
          isDefault: true,
        },
      ],
    },
    password: 'password',
    pendingVerificationCode: null,
    createdAt: daysAgo(90),
  },
]
