import { z } from 'zod'

import type { EmailJsConfig } from '@/lib/email/types'

const envSchema = z.object({
  VITE_DATA_MODE: z.enum(['mock', 'supabase']).default('mock'),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  // EmailJS is optional in every mode. With any of these missing the app skips
  // outbound email entirely and keeps the in-app notifications, so no build or
  // test run ever depends on them.
  VITE_EMAILJS_SERVICE_ID: z.string().optional(),
  VITE_EMAILJS_PUBLIC_KEY: z.string().optional(),
  VITE_EMAILJS_TEMPLATE_NEW_ORDER: z.string().optional(),
  VITE_EMAILJS_TEMPLATE_ORDER_UPDATE: z.string().optional(),
  VITE_EMAILJS_TEMPLATE_WELCOME: z.string().optional(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
}

const raw = parsed.data

/** Treats whitespace-only values as absent so a half-filled `.env` degrades cleanly. */
function optional(value: string | undefined): string | null {
  return value?.trim() || null
}

const supabaseUrl = optional(raw.VITE_SUPABASE_URL)
const supabasePublishableKey = optional(raw.VITE_SUPABASE_PUBLISHABLE_KEY)

if (raw.VITE_DATA_MODE === 'supabase' && (!supabaseUrl || !supabasePublishableKey)) {
  throw new Error(
    'VITE_DATA_MODE=supabase requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

const emailjs: EmailJsConfig = {
  serviceId: optional(raw.VITE_EMAILJS_SERVICE_ID),
  // EmailJS public keys are safe in the browser bundle; private keys are not and
  // must never be added here.
  publicKey: optional(raw.VITE_EMAILJS_PUBLIC_KEY),
  templates: {
    new_order: optional(raw.VITE_EMAILJS_TEMPLATE_NEW_ORDER),
    order_update: optional(raw.VITE_EMAILJS_TEMPLATE_ORDER_UPDATE),
    welcome: optional(raw.VITE_EMAILJS_TEMPLATE_WELCOME),
  },
}

export const env = {
  dataMode: raw.VITE_DATA_MODE,
  supabaseUrl,
  supabasePublishableKey,
  isMock: raw.VITE_DATA_MODE === 'mock',
  emailjs,
} as const
