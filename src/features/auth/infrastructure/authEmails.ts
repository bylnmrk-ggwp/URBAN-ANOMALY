/**
 * Account emails.
 *
 * Only the welcome message goes out from here. The verification code does not
 * and cannot: EmailJS is a browser SDK, so a code the browser knows proves
 * nothing about who owns the mailbox. The code is generated and mailed by the
 * backend (Supabase Auth), and the branded template for it lives in
 * `emails/verify-email.html`.
 *
 * Nothing here throws. A welcome email is a courtesy, so a provider outage must
 * never break the verification that just succeeded — failures are returned as
 * data and swallowed by the caller.
 */
import { routes } from '@/app/router/routes'
import { EMAIL_SENDER_NAME, EMAIL_SITE_URL, emailClient } from '@/lib/email'
import type { EmailClient, EmailMessage, EmailSendResult } from '@/lib/email/types'
import { getErrorMessage } from '@/lib/errors'

export interface WelcomeRecipient {
  email: string
  fullName: string
}

/** Sent once, right after the emailed code confirms the address. */
export function buildWelcomeEmail(user: WelcomeRecipient): EmailMessage {
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? ''
  return {
    template: 'welcome',
    to: user.email,
    toName: user.fullName,
    subject: `${EMAIL_SENDER_NAME}: your account is verified`,
    params: {
      customer_name: user.fullName,
      customer_first_name: firstName,
      customer_email: user.email,
      shop_url: `${EMAIL_SITE_URL}${routes.shop}`,
      account_url: `${EMAIL_SITE_URL}${routes.account}`,
    },
  }
}

/** Owned by the auth repositories, which is where the session is created. */
export class AuthEmailGateway {
  private readonly client: EmailClient

  constructor(client: EmailClient = emailClient) {
    this.client = client
  }

  async sendWelcome(user: WelcomeRecipient): Promise<EmailSendResult> {
    const message = buildWelcomeEmail(user)
    try {
      return await this.client.send(message)
    } catch (error) {
      // A client should report failures rather than throw; this is the backstop.
      return {
        status: 'failed',
        template: message.template,
        error: getErrorMessage(error, 'The welcome email could not be sent.'),
      }
    }
  }
}
