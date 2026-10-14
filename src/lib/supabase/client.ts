import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

import type { Database } from './database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null

/**
 * Lazily creates the single browser Supabase client. Only the publishable (anon) key is
 * ever used here; every privileged operation runs behind RLS or SECURITY DEFINER functions.
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (client) return client
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new AppError('unknown', 'Supabase is not configured.')
  }
  client = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}
