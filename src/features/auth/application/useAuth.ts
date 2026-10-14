import type { UseMutationResult } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import type {
  AuthSession,
  AuthStatus,
  AuthUser,
  SavedAddress,
} from '@/features/auth/domain/entities'

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput extends SignInInput {
  fullName: string
  phone: string
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
  signUp: UseMutationResult<AuthSession, Error, SignUpInput>
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
