import { z } from 'zod'

import type { ShippingAddress } from '@/features/orders/domain/entities'
import type { AdminRole } from '@/features/team/domain/entities'

export type UserRole = 'buyer' | 'admin'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone: string
  /** Resolved from the backend profile table, never from client storage. */
  role: UserRole
  /** Admin sub-role (`owner` | `staff`); `null` for buyers. Drives permission-gated UI only. */
  adminRole: AdminRole | null
  addresses: SavedAddress[]
}

export interface SavedAddress extends ShippingAddress {
  id: string
  label: string
  isDefault: boolean
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'expired'

export interface AuthSession {
  user: AuthUser
  expiresAt: string
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>
  signIn(input: { email: string; password: string }): Promise<AuthSession>
  signUp(input: {
    email: string
    password: string
    fullName: string
    phone: string
  }): Promise<AuthSession>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updateProfile(input: { fullName: string; phone: string }): Promise<AuthUser>
  saveAddress(input: Omit<SavedAddress, 'id'> & { id?: string }): Promise<AuthUser>
  removeAddress(id: string): Promise<AuthUser>
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void
}

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
    email: z.email('Enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .regex(/^(09\d{9}|\+639\d{9})$/, 'Enter a valid PH mobile number.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
export type RegisterFormValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address.'),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(09\d{9}|\+639\d{9})$/, 'Enter a valid PH mobile number.'),
})
export type ProfileFormValues = z.infer<typeof profileSchema>

export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Give this address a label.').max(30),
  addressLine: z.string().trim().min(5, 'Enter your street address.').max(160),
  barangay: z.string().trim().min(2, 'Enter your barangay.').max(80),
  city: z.string().trim().min(2, 'Enter your city or municipality.').max(80),
  province: z.string().trim().min(2, 'Enter your province.').max(80),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Postal code must be 4 digits.'),
  deliveryInstructions: z.string().trim().max(300),
  isDefault: z.boolean(),
})
export type AddressFormValues = z.infer<typeof addressSchema>
