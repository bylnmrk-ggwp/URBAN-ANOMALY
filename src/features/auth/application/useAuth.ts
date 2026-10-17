import type { UseMutationResult } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import type {
  AuthSession,
  AuthStatus,
  AuthUser,
  SavedAddress,
  SignUpResult,
} from '@/features/auth/domain/entities'

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput extends SignInInput {
  fullName: string
  phone: string
}

export interface VerifyEmailInput {
  email: string
  code: string
}

export interface ProfileInput {
  fullName: string
  phone: string
}

export type SaveAddressInput = Omit<SavedAddress, 'id'> & { id?: string }

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAdmin: boolean
  signIn: UseMutationResult<AuthSession, Error, SignInInput>
  /** Resolves to `verification_required` whenever the backend mailed a code. */
  signUp: UseMutationResult<SignUpResult, Error, SignUpInput>
  verifyEmail: UseMutationResult<AuthSession, Error, VerifyEmailInput>
  resendVerificationCode: UseMutationResult<void, Error, string>
  signOut: UseMutationResult<void, Error, void>
  requestPasswordReset: UseMutationResult<void, Error, string>
  updateProfile: UseMutationResult<AuthUser, Error, ProfileInput>
  saveAddress: UseMutationResult<AuthUser, Error, SaveAddressInput>
  removeAddress: UseMutationResult<AuthUser, Error, string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.')
  return ctx
}
