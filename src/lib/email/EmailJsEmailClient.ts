import { getErrorMessage } from '@/lib/errors'

import type { EmailClient, EmailJsConfig, EmailMessage, EmailSendResult } from './types'
import { emailSkipped } from './types'

/** Narrow view of the vendor SDK so the rest of the app never sees its types. */
type SendFn = (
  serviceId: string,
  templateId: string,
  params: Record<string, unknown>,
  options: { publicKey: string },
) => Promise<unknown>

const SEND_FAILED = 'The notification email could not be sent.'

/**
 * EmailJS-backed {@link EmailClient}.
 *
 * The SDK is imported dynamically on the first real send, so an unconfigured
 * store never downloads it and the test suite never loads it at all (which is
 * what keeps the suite free of network calls).
 */
export class EmailJsEmailClient implements EmailClient {
  private readonly config: EmailJsConfig
  private sdk: Promise<SendFn> | null = null

  constructor(config: EmailJsConfig) {
    this.config = config
  }

  get isConfigured(): boolean {
    return Boolean(this.config.serviceId && this.config.publicKey)
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { serviceId, publicKey } = this.config
    const templateId = this.config.templates[message.template]
    if (!serviceId || !publicKey || !templateId) {
      return emailSkipped(message.template, 'not_configured')
    }
    if (!message.to.trim()) return emailSkipped(message.template, 'missing_recipient')

    try {
      const send = await this.loadSend()
      await send(
        serviceId,
        templateId,
        {
          ...message.params,
          // Conventional recipient fields: an EmailJS template maps "To email"
          // to {{to_email}} in its own settings.
          to_email: message.to,
          to_name: message.toName,
          subject: message.subject,
        },
        { publicKey },
      )
      return { status: 'sent', template: message.template }
    } catch (error) {
      return {
        status: 'failed',
        template: message.template,
        error: getErrorMessage(error, SEND_FAILED),
      }
    }
  }

  private loadSend(): Promise<SendFn> {
    this.sdk ??= import('@emailjs/browser').then((module) => module.send as SendFn)
    return this.sdk
  }
}
