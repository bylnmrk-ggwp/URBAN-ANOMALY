import { env } from '@/config/env'

import { EmailJsEmailClient } from './EmailJsEmailClient'
import { NoopEmailClient } from './NoopEmailClient'
import type { EmailClient, EmailJsConfig } from './types'

export type {
  EmailClient,
  EmailJsConfig,
  EmailMessage,
  EmailSendResult,
  EmailSkipReason,
  EmailTemplateKey,
} from './types'
export { emailSkipped } from './types'
export { EmailJsEmailClient } from './EmailJsEmailClient'
export { NoopEmailClient } from './NoopEmailClient'

/**
 * Picks an implementation for the given configuration. A missing service id,
 * public key, or both template ids means "email not set up", which is a
 * supported state: the no-op client reports every send as skipped.
 */
export function createEmailClient(config: EmailJsConfig): EmailClient {
  if (!config.serviceId || !config.publicKey) return new NoopEmailClient()
  const hasTemplate = Boolean(config.templates.new_order || config.templates.order_update)
  return hasTemplate ? new EmailJsEmailClient(config) : new NoopEmailClient()
}

/** App-wide client. Resolves to {@link NoopEmailClient} when EmailJS is unset. */
export const emailClient: EmailClient = createEmailClient(env.emailjs)
