import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAppError } from '@/lib/errors'
import { MockStore } from '@/mocks/MockStore'
import { makeFakeEmailClient } from '@/tests/fixtures'

import { AuthEmailGateway } from './authEmails'
import { MockAuthRepository } from './MockAuthRepository'

const REGISTRATION = {
  email: 'New.Buyer@example.com',
  password: 'supersecret',
  fullName: 'New Buyer',
  phone: '09171234567',
}

/** The repository lower-cases the address before storing it. */
const EMAIL = 'new.buyer@example.com'

function setup() {
  const store = new MockStore()
  const emailClient = makeFakeEmailClient()
  const repo = new MockAuthRepository(store, new AuthEmailGateway(emailClient))
  return { store, repo, emailClient }
}

describe('MockAuthRepository email verification', () => {
  let consoleInfo: MockInstance<typeof console.info>

  beforeEach(() => {
    // Mock mode logs the code instead of mailing it; keep it out of the suite output.
    consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  /**
   * The code is only ever readable where a buyer would read it. Nothing in the
   * repository's return values exposes it, which is the point of the design.
   */
  function loggedCode(): string {
    const line = String(consoleInfo.mock.calls.at(-1)?.[0] ?? '')
    const match = /\b(\d{6})\b/.exec(line)
    if (!match?.[1]) throw new Error(`No verification code in console line: "${line}"`)
    return match[1]
  }

  it('creates an unverified account and starts no session', async () => {
    const { store, repo } = setup()

    const result = await repo.signUp(REGISTRATION)

    expect(result).toEqual({ status: 'verification_required', email: EMAIL })
    expect(store.currentSession).toBeNull()
    await expect(repo.getSession()).resolves.toBeNull()
    expect(window.sessionStorage.getItem('mock-auth-session')).toBeNull()
    // The code lives on the account, never on the user the session would expose.
    const account = store.users.find((u) => u.user.email === EMAIL)
    expect(account?.pendingVerificationCode).toMatch(/^\d{6}$/)
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining(EMAIL))
    expect(loggedCode()).toBe(account?.pendingVerificationCode)
  })

  it('still refuses the duplicate email of a seeded account', async () => {
    const { repo } = setup()

    await expect(repo.signUp({ ...REGISTRATION, email: 'buyer@demo.local' })).rejects.toSatisfy(
      (error) => isAppError(error) && error.code === 'conflict',
    )
  })

  it('refuses to sign in before the address is confirmed', async () => {
    const { store, repo } = setup()
    await repo.signUp(REGISTRATION)

    await expect(
      repo.signIn({ email: REGISTRATION.email, password: REGISTRATION.password }),
    ).rejects.toSatisfy((error) => isAppError(error) && error.code === 'email_unverified')
    await expect(
      repo.signIn({ email: REGISTRATION.email, password: REGISTRATION.password }),
    ).rejects.toThrow('Confirm your email address before signing in.')
    expect(store.currentSession).toBeNull()

    // A seeded demo account is confirmed, so it still signs in.
    const session = await repo.signIn({ email: 'buyer@demo.local', password: 'password' })
    expect(session.user.email).toBe('buyer@demo.local')
  })

  it('rejects a wrong code and leaves the account unverified', async () => {
    const { store, repo, emailClient } = setup()
    await repo.signUp(REGISTRATION)
    const code = loggedCode()
    const wrong = code === '000000' ? '999999' : '000000'

    await expect(repo.verifyEmail({ email: EMAIL, code: wrong })).rejects.toSatisfy(
      (error) => isAppError(error) && error.code === 'validation',
    )
    // An address with no account answers exactly the same way.
    await expect(repo.verifyEmail({ email: 'nobody@example.com', code })).rejects.toThrow(
      'That code is not correct. Check your email and try again.',
    )

    expect(store.currentSession).toBeNull()
    expect(store.users.find((u) => u.user.email === EMAIL)?.pendingVerificationCode).toBe(code)
    expect(emailClient.sent).toHaveLength(0)
  })

  it('confirms the address with the right code, signs the buyer in and welcomes them', async () => {
    const { store, repo, emailClient } = setup()
    await repo.signUp(REGISTRATION)

    const session = await repo.verifyEmail({ email: EMAIL, code: loggedCode() })

    expect(session.user).toMatchObject({ email: EMAIL, role: 'buyer', adminRole: null })
    expect(store.currentSession?.user.id).toBe(session.user.id)
    expect(store.users.find((u) => u.user.email === EMAIL)?.pendingVerificationCode).toBeNull()
    expect(emailClient.sent).toHaveLength(1)
    expect(emailClient.sent[0]).toMatchObject({ template: 'welcome', to: EMAIL })
    // Sign-in works from now on.
    await repo.signOut()
    await expect(
      repo.signIn({ email: REGISTRATION.email, password: REGISTRATION.password }),
    ).resolves.toMatchObject({ user: { email: EMAIL } })
  })

  it('invalidates the previous code on resend', async () => {
    const { store, repo } = setup()
    // Two fixed draws so the pair of codes cannot collide by chance.
    const draws = [0.123456, 0.654321]
    vi.spyOn(Math, 'random').mockImplementation(() => draws.shift() ?? 0)
    await repo.signUp(REGISTRATION)
    const first = loggedCode()

    await repo.resendVerificationCode(REGISTRATION.email)
    const second = loggedCode()

    expect(second).not.toBe(first)
    await expect(repo.verifyEmail({ email: EMAIL, code: first })).rejects.toSatisfy(
      (error) => isAppError(error) && error.code === 'validation',
    )
    await expect(repo.verifyEmail({ email: EMAIL, code: second })).resolves.toMatchObject({
      user: { email: EMAIL },
    })
    expect(store.users.find((u) => u.user.email === EMAIL)?.pendingVerificationCode).toBeNull()
  })

  it('says nothing about an unknown or already-confirmed address on resend', async () => {
    const { store, repo } = setup()

    await expect(repo.resendVerificationCode('nobody@example.com')).resolves.toBeUndefined()
    await expect(repo.resendVerificationCode('buyer@demo.local')).resolves.toBeUndefined()

    expect(consoleInfo).not.toHaveBeenCalled()
    expect(
      store.users.find((u) => u.user.email === 'buyer@demo.local')?.pendingVerificationCode,
    ).toBeNull()
  })
})
