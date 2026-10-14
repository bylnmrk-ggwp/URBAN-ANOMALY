import type { Session, User } from '@supabase/supabase-js'

import type {
  AuthRepository,
  AuthSession,
  AuthUser,
  SavedAddress,
} from '@/features/auth/domain/entities'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { mapSupabaseError, toAuthUser, unwrap } from '@/lib/supabase/mappers'
import type { ProfileRow } from '@/lib/supabase/mappers'

function metadataString(user: User, key: string): string {
  const value = user.user_metadata[key]
  return typeof value === 'string' ? value : ''
}

function expiresAtIso(session: Session): string {
  const seconds = session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in
  return new Date(seconds * 1000).toISOString()
}

/**
 * Auth via Supabase Auth; role and profile data come from the `profiles` table (created by a
 * DB trigger on sign-up with role `buyer`). The client never writes `role`.
 */
export class SupabaseAuthRepository implements AuthRepository {
  private get db() {
    return getSupabaseClient()
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.db.auth.getSession()
    if (error) throw mapSupabaseError(error)
    if (!data.session) return null
    return this.toAuthSession(data.session)
  }

  async signIn(input: { email: string; password: string }): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    })
    if (error) throw mapSupabaseError(error)
    if (!data.session) throw AppError.unauthorized('Incorrect email or password.')
    return this.toAuthSession(data.session)
  }

  async signUp(input: {
    email: string
    password: string
    fullName: string
    phone: string
  }): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        // Consumed by the `handle_new_user` trigger to seed `profiles`. Role is never sent.
        data: { full_name: input.fullName.trim(), phone: input.phone.trim() },
      },
    })
    if (error) throw mapSupabaseError(error)
    if (!data.session) {
      // Email confirmation is enabled on the project: no session until the link is clicked.
      throw new AppError(
        'unauthorized',
        'Account created. Check your email to confirm your address, then sign in.',
      )
    }
    return this.toAuthSession(data.session)
  }

  async signOut(): Promise<void> {
    const { error } = await this.db.auth.signOut()
    if (error) throw mapSupabaseError(error)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
    const { error } = await this.db.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw mapSupabaseError(error)
  }

  async updateProfile(input: { fullName: string; phone: string }): Promise<AuthUser> {
    const userId = await this.requireUserId()
    unwrap(
      await this.db
        .from('profiles')
        .update({ full_name: input.fullName.trim(), phone: input.phone.trim() })
        .eq('id', userId),
    )
    return this.loadUser(userId)
  }

  async saveAddress(input: Omit<SavedAddress, 'id'> & { id?: string }): Promise<AuthUser> {
    const userId = await this.requireUserId()
    const values = {
      user_id: userId,
      label: input.label,
      address_line: input.addressLine,
      barangay: input.barangay,
      city: input.city,
      province: input.province,
      postal_code: input.postalCode,
      delivery_instructions: input.deliveryInstructions,
      is_default: input.isDefault,
    }
    if (input.id) {
      unwrap(
        await this.db.from('addresses').update(values).eq('id', input.id).eq('user_id', userId),
      )
    } else {
      unwrap(await this.db.from('addresses').insert(values))
    }
    // A DB trigger clears `is_default` on the user's other addresses when one is set.
    return this.loadUser(userId)
  }

  async removeAddress(id: string): Promise<AuthUser> {
    const userId = await this.requireUserId()
    unwrap(await this.db.from('addresses').delete().eq('id', id).eq('user_id', userId))
    return this.loadUser(userId)
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = this.db.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!session) {
        callback(null)
        return
      }
      // Never await Supabase calls inside the auth callback (it blocks the auth lock);
      // defer the profile fetch to the next tick.
      setTimeout(() => {
        this.toAuthSession(session)
          .then(callback)
          .catch(() => callback(null))
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }

  // ---------------------------------------------------------------------------

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.db.auth.getUser()
    if (error) throw mapSupabaseError(error)
    if (!data.user) throw AppError.unauthorized()
    return data.user.id
  }

  private async toAuthSession(session: Session): Promise<AuthSession> {
    const user = await this.loadUser(session.user.id, session.user)
    return { user, expiresAt: expiresAtIso(session) }
  }

  private async loadUser(userId: string, authUser?: User): Promise<AuthUser> {
    const [profileResult, addressResult] = await Promise.all([
      this.db.from('profiles').select('*').eq('id', userId).maybeSingle(),
      this.db.from('addresses').select('*').eq('user_id', userId),
    ])
    const addresses = unwrap(addressResult)
    let profile = unwrap(profileResult)
    if (!profile) {
      // Profile trigger has not run yet (or was disabled): fall back to auth metadata with the
      // least-privileged role so the UI never grants admin access by accident.
      const fallbackUser = authUser ?? (await this.db.auth.getUser()).data.user
      if (!fallbackUser) throw AppError.unauthorized()
      profile = {
        id: fallbackUser.id,
        email: fallbackUser.email ?? '',
        full_name: metadataString(fallbackUser, 'full_name'),
        phone: metadataString(fallbackUser, 'phone'),
        role: 'buyer',
        created_at: fallbackUser.created_at,
      } satisfies ProfileRow
    }
    return toAuthUser(profile, addresses)
  }
}
