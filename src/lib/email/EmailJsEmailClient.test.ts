import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EMAIL_LOGO_URL, EMAIL_SENDER_NAME, EMAIL_SITE_URL } from './branding'
import { EmailJsEmailClient } from './EmailJsEmailClient'
import { createEmailClient } from './index'
import { NoopEmailClient } from './NoopEmailClient'
import type { EmailJsConfig, EmailMessage } from './types'

const send = vi.fn()

// The vendor SDK is only ever reached through this mock, so no test can make a
// network call even when EmailJS is fully configured.
vi.mock('@emailjs/browser', () => ({ send: (...args: unknown[]) => send(...args) }))

function config(overrides: Partial<EmailJsConfig> = {}): EmailJsConfig {
  return {
    serviceId: 'service_test',
    publicKey: 'public_test',
    templates: {
      new_order: 'tpl_new_order',
      order_update: 'tpl_order_update',
      welcome: 'tpl_welcome',
    },
    ...overrides,
  }
}

function message(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    template: 'new_order',
    to: 'admin@example.com',
    toName: 'URBAN ANOMALY',
    subject: 'New order ORD-2610-00001',
    params: { order_number: 'ORD-2610-00001' },
    ...overrides,
  }
}

describe('createEmailClient', () => {
  it('returns the EmailJS client only when a service, public key and template exist', () => {
    expect(createEmailClient(config())).toBeInstanceOf(EmailJsEmailClient)
    expect(
      createEmailClient(
        config({ templates: { new_order: null, order_update: 'tpl', welcome: null } }),
      ),
    ).toBeInstanceOf(EmailJsEmailClient)
  })

  it('falls back to the no-op client when anything is missing', () => {
    expect(createEmailClient(config({ serviceId: null }))).toBeInstanceOf(NoopEmailClient)
    expect(createEmailClient(config({ publicKey: null }))).toBeInstanceOf(NoopEmailClient)
    expect(
      createEmailClient(
        config({ templates: { new_order: null, order_update: null, welcome: null } }),
      ),
    ).toBeInstanceOf(NoopEmailClient)
  })
})

describe('NoopEmailClient', () => {
  it('reports every send as skipped without loading the SDK', async () => {
    const client = new NoopEmailClient()
    expect(client.isConfigured).toBe(false)
    await expect(client.send(message())).resolves.toEqual({
      status: 'skipped',
      template: 'new_order',
      reason: 'not_configured',
    })
    expect(send).not.toHaveBeenCalled()
  })
})

describe('EmailJsEmailClient', () => {
  beforeEach(() => {
    send.mockReset()
    send.mockResolvedValue({ status: 200, text: 'OK' })
  })

  it('sends through the SDK with the template id and recipient fields', async () => {
    const client = new EmailJsEmailClient(config())

    const result = await client.send(message())

    expect(result).toEqual({ status: 'sent', template: 'new_order' })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      'service_test',
      'tpl_new_order',
      {
        order_number: 'ORD-2610-00001',
        to_email: 'admin@example.com',
        to_name: 'URBAN ANOMALY',
        subject: 'New order ORD-2610-00001',
        from_name: EMAIL_SENDER_NAME,
        logo_url: EMAIL_LOGO_URL,
        site_url: EMAIL_SITE_URL,
      },
      { publicKey: 'public_test' },
    )
  })

  it('picks the template that matches the flow', async () => {
    const client = new EmailJsEmailClient(config())
    await client.send(message({ template: 'order_update', to: 'buyer@example.com' }))
    expect(send.mock.calls[0]?.[1]).toBe('tpl_order_update')
  })

  it('skips without touching the SDK when this flow has no template', async () => {
    const client = new EmailJsEmailClient(
      config({ templates: { new_order: null, order_update: 'tpl_order_update', welcome: null } }),
    )

    await expect(client.send(message())).resolves.toEqual({
      status: 'skipped',
      template: 'new_order',
      reason: 'not_configured',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('skips when the key is missing, and reports it as not configured', async () => {
    const client = new EmailJsEmailClient(config({ publicKey: '' }))
    expect(client.isConfigured).toBe(false)

    await expect(client.send(message())).resolves.toMatchObject({
      status: 'skipped',
      reason: 'not_configured',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('skips a message with no recipient', async () => {
    const client = new EmailJsEmailClient(config())

    await expect(client.send(message({ to: '   ' }))).resolves.toEqual({
      status: 'skipped',
      template: 'new_order',
      reason: 'missing_recipient',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('reports a provider error as a failed result instead of throwing', async () => {
    send.mockRejectedValue(new Error('Rate limit reached'))
    const client = new EmailJsEmailClient(config())

    await expect(client.send(message())).resolves.toEqual({
      status: 'failed',
      template: 'new_order',
      error: 'Rate limit reached',
    })
  })

  it('loads the SDK once across sends', async () => {
    const client = new EmailJsEmailClient(config())
    await client.send(message())
    await client.send(message())
    expect(send).toHaveBeenCalledTimes(2)
  })
})

describe('branding', () => {
  beforeEach(() => {
    send.mockReset()
    send.mockResolvedValue({ status: 200, text: 'OK' })
  })

  it('reaches every template, so no template has to hard-code the sender', async () => {
    const client = new EmailJsEmailClient(config())

    await client.send(message({ template: 'welcome', to: 'buyer@example.com' }))

    expect(send.mock.calls[0]?.[1]).toBe('tpl_welcome')
    expect(send.mock.calls[0]?.[2]).toMatchObject({
      from_name: 'Urban Anomaly Official',
      logo_url: EMAIL_LOGO_URL,
      site_url: EMAIL_SITE_URL,
    })
  })

  it('cannot be overridden by a caller-supplied param of the same name', async () => {
    const client = new EmailJsEmailClient(config())

    await client.send(message({ params: { from_name: 'Someone Else' } }))

    expect(send.mock.calls[0]?.[2]).toMatchObject({ from_name: EMAIL_SENDER_NAME })
  })
})
