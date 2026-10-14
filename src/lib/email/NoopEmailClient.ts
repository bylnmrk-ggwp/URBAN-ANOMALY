import type { EmailClient, EmailMessage, EmailSendResult } from './types'
import { emailSkipped } from './types'

/**
 * Used whenever EmailJS is not configured. Every send is reported as skipped —
 * silently, because an unconfigured store is a supported setup, not an error.
 */
export class NoopEmailClient implements EmailClient {
  readonly isConfigured = false

  send(message: EmailMessage): Promise<EmailSendResult> {
    return Promise.resolve(emailSkipped(message.template, 'not_configured'))
  }
}
