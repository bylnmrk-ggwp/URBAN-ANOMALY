import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import type { MockUserAccount } from '@/mocks/data/users'
import { clone, nowIso } from '@/mocks/helpers'

import type { AuthRepository, AuthSession, AuthUser, SavedAddress } from '../domain/entities'

/**
 * Only the user id and expiry are persisted. The role (and everything else)
 * is re-read from the store's user table on every rehydrate, so client-side
 * storage can never grant admin access. Supabase mode replaces this with real
 * JWT sessions whose claims are verified server-side.
 */
const SESSION_STORAGE_KEY = 'mock-auth-session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const AUTH_DELAY_MS = 120

interface PersistedSession {
  userId: string
  expiresAt: string
}

type AuthListener = (session: AuthSession | null) => void

export class MockAuthRepository implements AuthRepository {
  private readonly store: MockStore
  private readonly listeners = new Set<AuthListener>()

  constructor(store: MockStore) {
    this.store = store
    this.store.currentSession = this.rehydrate()
  }

  async getSession(): Promise<AuthSession | null> {
    await this.store.delay(AUTH_DELAY_MS)
    const session = this.store.currentSession
    if (session && new Date(session.expiresAt).getTime() <= Date.now()) {
      this.setSession(null)
      return null
    }
    return session ? clone(session) : null
  }

  async signIn(input: { email: string; password: string }): Promise<AuthSession> {
    await this.store.delay()
    const account = this.findByEmail(input.email)
    if (!account || account.password !== input.password) {
      throw new AppError('unauthorized', 'Incorrect email or password.')
    }
    return this.startSession(account)
  }

  async signUp(input: {
    email: string
    password: string
    fullName: string
    phone: string
  }): Promise<AuthSession> {
    await this.store.delay()
    if (this.findByEmail(input.email)) {
      throw new AppError('conflict', 'An account with this email already exists.')
    }
    const account: MockUserAccount = {
      user: {
        id: this.store.nextId('user'),
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        // Self-service registration always creates a buyer. Admins are provisioned out of band.
        role: 'buyer',
        adminRole: null,
        addresses: [],
      },
      password: input.password,
      createdAt: nowIso(),
    }
    this.store.users.push(account)
    return this.startSession(account)
  }

  async signOut(): Promise<void> {
    await this.store.delay(AUTH_DELAY_MS)
    this.setSession(null)
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.store.delay()
    // No-op: the real implementation sends a reset email. We deliberately do
    // not reveal whether `email` exists.
    void email
  }

  async updateProfile(input: { fullName: string; phone: string }): Promise<AuthUser> {
    await this.store.delay()
    const account = this.requireAccount()
    account.user.fullName = input.fullName.trim()
    account.user.phone = input.phone.trim()
    this.refreshSession(account)
    return clone(account.user)
  }

  async saveAddress(input: Omit<SavedAddress, 'id'> & { id?: string }): Promise<AuthUser> {
    await this.store.delay()
    const account = this.requireAccount()
    const { id, ...fields } = input
    const addresses = account.user.addresses
    const existingIndex = id ? addresses.findIndex((a) => a.id === id) : -1
    const address: SavedAddress = { ...fields, id: id ?? this.store.nextId('addr') }

    if (existingIndex >= 0) {
      addresses[existingIndex] = address
    } else {
      addresses.push(address)
    }
    if (address.isDefault) {
      for (const other of addresses) other.isDefault = other.id === address.id
    } else if (!addresses.some((a) => a.isDefault)) {
      address.isDefault = true
    }
    this.refreshSession(account)
    return clone(account.user)
  }

  async removeAddress(id: string): Promise<AuthUser> {
    await this.store.delay()
    const account = this.requireAccount()
    const removed = account.user.addresses.find((a) => a.id === id)
    if (!removed) throw AppError.notFound('Address')
    account.user.addresses = account.user.addresses.filter((a) => a.id !== id)
    const first = account.user.addresses[0]
    if (removed.isDefault && first) first.isDefault = true
    this.refreshSession(account)
    return clone(account.user)
  }

  onAuthStateChange(callback: AuthListener): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private findByEmail(email: string): MockUserAccount | undefined {
    const needle = email.trim().toLowerCase()
    return this.store.users.find((u) => u.user.email.toLowerCase() === needle)
  }

  private requireAccount(): MockUserAccount {
    const session = this.store.currentSession
    if (!session) throw AppError.unauthorized()
    const account = this.store.users.find((u) => u.user.id === session.user.id)
    if (!account) throw AppError.unauthorized()
    return account
  }

  private startSession(account: MockUserAccount): AuthSession {
    const session: AuthSession = {
      user: clone(account.user),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    }
    this.setSession(session)
    return clone(session)
  }

  /** Re-snapshots the user after a profile change, keeping the current expiry. */
  private refreshSession(account: MockUserAccount) {
    const current = this.store.currentSession
    if (!current) return
    this.setSession({ user: clone(account.user), expiresAt: current.expiresAt })
  }

  private setSession(session: AuthSession | null) {
    this.store.currentSession = session
    this.persist(session)
    for (const listener of this.listeners) listener(session ? clone(session) : null)
  }

  private persist(session: AuthSession | null) {
    const storage = getSessionStorage()
    if (!storage) return
    try {
      if (!session) {
        storage.removeItem(SESSION_STORAGE_KEY)
        return
      }
      const persisted: PersistedSession = { userId: session.user.id, expiresAt: session.expiresAt }
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persisted))
    } catch {
      // Storage may be unavailable (private mode, quota); the in-memory session still works.
    }
  }

  private rehydrate(): AuthSession | null {
    const storage = getSessionStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      if (!isPersistedSession(parsed) || new Date(parsed.expiresAt).getTime() <= Date.now()) {
        storage.removeItem(SESSION_STORAGE_KEY)
        return null
      }
      // Role and profile come from the user table, never from storage.
      const account = this.store.users.find((u) => u.user.id === parsed.userId)
      if (!account) {
        storage.removeItem(SESSION_STORAGE_KEY)
        return null
      }
      return { user: clone(account.user), expiresAt: parsed.expiresAt }
    } catch {
      return null
    }
  }
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.userId === 'string' && typeof candidate.expiresAt === 'string'
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}
