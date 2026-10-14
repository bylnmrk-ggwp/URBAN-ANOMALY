import { z } from 'zod'

const envSchema = z.object({
  VITE_DATA_MODE: z.enum(['mock', 'supabase']).default('mock'),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
}

const raw = parsed.data
const supabaseUrl = raw.VITE_SUPABASE_URL?.trim() || null
const supabasePublishableKey = raw.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || null

if (raw.VITE_DATA_MODE === 'supabase' && (!supabaseUrl || !supabasePublishableKey)) {
  throw new Error(
    'VITE_DATA_MODE=supabase requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

export const env = {
  dataMode: raw.VITE_DATA_MODE,
  supabaseUrl,
  supabasePublishableKey,
  isMock: raw.VITE_DATA_MODE === 'mock',
} as const
