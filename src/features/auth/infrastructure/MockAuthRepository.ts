import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import type { MockUserAccount } from '@/mocks/data/users'
import { clone, nowIso } from '@/mocks/helpers'

import type {
  AuthRepository,
  AuthSession,
  AuthUser,
  SavedAddress,
  SignUpResult,
} from '../domain/entities'
import { AuthEmailGateway } from './authEmails'

/**
 * Only the user id and expiry are persisted. The role (and everything else)
 * is re-read from the store's user table on every rehydrate, so client-side
 * storage can never grant admin access. Supabase mode replaces this with real
 * JWT sessions whose claims are verified server-side.
 */
const SESSION_STORAGE_KEY = 'mock-auth-session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const AUTH_DELAY_MS = 120

/** Same wording for an unknown address and a wrong code: neither confirms an account exists. */
const INVALID_CODE_MESSAGE = 'That code is not correct. Check your email and try again.'

interface PersistedSession {
  userId: string
  expiresAt: string
}

type AuthListener = (session: AuthSession | null) => void

export class MockAuthRepository implements AuthRepository {
  private readonly store: MockStore
  private readonly emails: AuthEmailGateway
  private readonly listeners = new Set<AuthListener>()

  constructor(store: MockStore, emails: AuthEmailGateway = new AuthEmailGateway()) {
    this.store = store
    this.emails = emails
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
    if (account.pendingVerificationCode !== null) {
      // An unconfirmed address never reaches `startSession`, and the wording
      // matches what the Supabase mapper produces for `email_not_confirmed`.
      throw new AppError('email_unverified', 'Confirm your email address before signing in.')
    }
    return this.startSession(account)
  }

  async signUp(input: {
    email: string
    password: string
    fullName: string
    phone: string
  }): Promise<SignUpResult> {
    await this.store.delay()
    if (this.findByEmail(input.email)) {
      throw new AppError('conflict', 'An account with this email already exists.')
    }
    const email = input.email.trim().toLowerCase()
    const account: MockUserAccount = {
      user: {
        id: this.store.nextId('user'),
        email,
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        // Self-service registration always creates a buyer. Admins are provisioned out of band.
        role: 'buyer',
        adminRole: null,
        addresses: [],
      },
      password: input.password,
      pendingVerificationCode: generateVerificationCode(),
      createdAt: nowIso(),
    }
    this.store.users.push(account)
    logVerificationCode(account)
    // No session yet: the account stays unverified until `verifyEmail` accepts the code.
    return { status: 'verification_required', email }
  }

  async verifyEmail(input: { email: string; code: string }): Promise<AuthSession> {
    await this.store.delay()
    const account = this.findByEmail(input.email)
    if (!account) throw new AppError('validation', INVALID_CODE_MESSAGE)
    // Confirming twice (a resubmitted form, a reloaded tab) simply signs the buyer in.
    if (account.pendingVerificationCode === null) return this.startSession(account)
    if (account.pendingVerificationCode !== input.code.trim()) {
      throw new AppError('validation', INVALID_CODE_MESSAGE)
    }
    account.pendingVerificationCode = null
    const session = this.startSession(account)
    // Courtesy mail: a failure here must not undo a confirmed account.
    await this.emails.sendWelcome({ email: session.user.email, fullName: session.user.fullName })
    return session
  }

  async resendVerificationCode(email: string): Promise<void> {
    await this.store.delay()
    const account = this.findByEmail(email)
    // Silent for an unknown or already-confirmed address: we deliberately do
    // not reveal whether `email` exists.
    if (!account || account.pendingVerificationCode === null) return
    account.pendingVerificationCode = generateVerificationCode()
    logVerificationCode(account)
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

/** Six digits, zero-padded. A mock needs no cryptographic randomness. */
function generateVerificationCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')
}

/**
 * Mock mode has no mailbox, so the code goes to the console instead: this line
 * stands in for the email Supabase mode sends.
 */
function logVerificationCode(account: MockUserAccount) {
  const { email } = account.user
  console.info(`[mock] verification code for ${email}: ${account.pendingVerificationCode}`)
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
