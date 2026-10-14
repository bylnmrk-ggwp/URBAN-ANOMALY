import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { repositories } from '@/config/repositories'
import {
  AuthContext,
  type AuthContextValue,
  type ProfileInput,
  type SaveAddressInput,
  type SignInInput,
  type SignUpInput,
} from '@/features/auth/application/useAuth'
import type { AuthSession, AuthStatus, AuthUser } from '@/features/auth/domain/entities'
import { queryKeys } from '@/lib/queryKeys'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
}

const auth = repositories.auth

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  /** Distinguishes an explicit sign-out from a session that silently went away. */
  const signingOutRef = useRef(false)

  const applySession = useCallback((session: AuthSession | null) => {
    setState((prev) => {
      if (session) return { status: 'authenticated', user: session.user }
      const expired = prev.status === 'authenticated' && !signingOutRef.current
      return { status: expired ? 'expired' : 'unauthenticated', user: null }
    })
  }, [])

  useEffect(() => {
    let active = true
    auth
      .getSession()
      .then((session) => {
        if (active) applySession(session)
      })
      .catch(() => {
        if (active) setState({ status: 'unauthenticated', user: null })
      })
    const unsubscribe = auth.onAuthStateChange((session) => {
      if (active) applySession(session)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [applySession])

  const invalidateUserScoped = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session }),
    ])
  }, [queryClient])

  const onSession = useCallback(
    async (session: AuthSession) => {
      signingOutRef.current = false
      setState({ status: 'authenticated', user: session.user })
      await invalidateUserScoped()
    },
    [invalidateUserScoped],
  )

  const onUser = useCallback(
    async (user: AuthUser) => {
      setState({ status: 'authenticated', user })
      await invalidateUserScoped()
    },
    [invalidateUserScoped],
  )

  const signIn = useMutation({
    mutationFn: (input: SignInInput) => auth.signIn(input),
    onSuccess: onSession,
  })
  const signUp = useMutation({
    mutationFn: (input: SignUpInput) => auth.signUp(input),
    onSuccess: onSession,
  })
  const signOut = useMutation({
    mutationFn: async () => {
      signingOutRef.current = true
      await auth.signOut()
    },
    onSuccess: async () => {
      setState({ status: 'unauthenticated', user: null })
      // Drop user-scoped data so the next account never sees a stale cache.
      queryClient.removeQueries({ queryKey: queryKeys.orders.all })
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all })
      await invalidateUserScoped()
      // The cart is intentionally kept: it is a device-local guest cart (persisted
      // Zustand store), not account data. Shoppers who sign out to switch accounts
      // or browse anonymously expect the items they picked to still be there, and
      // nothing in it is private to the previous account.
    },
    onError: () => {
      signingOutRef.current = false
    },
  })
  const requestPasswordReset = useMutation({
    mutationFn: (email: string) => auth.requestPasswordReset(email),
  })
  const updateProfile = useMutation({
    mutationFn: (input: ProfileInput) => auth.updateProfile(input),
    onSuccess: onUser,
  })
  const saveAddress = useMutation({
    mutationFn: (input: SaveAddressInput) => auth.saveAddress(input),
    onSuccess: onUser,
  })
  const removeAddress = useMutation({
    mutationFn: (id: string) => auth.removeAddress(id),
    onSuccess: onUser,
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      isAdmin: state.user?.role === 'admin',
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updateProfile,
      saveAddress,
      removeAddress,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updateProfile,
      saveAddress,
      removeAddress,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
