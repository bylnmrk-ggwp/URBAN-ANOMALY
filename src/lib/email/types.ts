/**
 * Transactional email contract. Feature code depends only on these types, never
 * on the EmailJS SDK, mirroring how data access goes through repository
 * interfaces rather than the Supabase client.
 */

/** One template per outbound flow; each maps to a `VITE_EMAILJS_TEMPLATE_*` id. */
export type EmailTemplateKey = 'new_order' | 'order_update' | 'welcome'

export interface EmailMessage {
  template: EmailTemplateKey
  /** Recipient address. An empty value is skipped, never sent. */
  to: string
  toName: string
  subject: string
  /** Flat template variables; an EmailJS template reads them as `{{key}}`. */
  params: Record<string, string>
}

export type EmailSkipReason =
  /** No EmailJS service/public key/template id for this flow. */
  | 'not_configured'
  /** Turned off in Store Settings (`notifyNewOrders` / `notifyPaymentEvents`). */
  | 'disabled_by_settings'
  | 'missing_recipient'

/**
 * Sending never throws: every outcome is reported as data so a failed email can
 * never break a checkout or an admin action.
 */
export type EmailSendResult =
  | { status: 'sent'; template: EmailTemplateKey }
  | { status: 'skipped'; template: EmailTemplateKey; reason: EmailSkipReason }
  | { status: 'failed'; template: EmailTemplateKey; error: string }

export interface EmailClient {
  /** False when the environment has no usable EmailJS configuration. */
  readonly isConfigured: boolean
  send(message: EmailMessage): Promise<EmailSendResult>
}

export interface EmailJsConfig {
  serviceId: string | null
  publicKey: string | null
  templates: Record<EmailTemplateKey, string | null>
}

export function emailSkipped(template: EmailTemplateKey, reason: EmailSkipReason): EmailSendResult {
  return { status: 'skipped', template, reason }
}
