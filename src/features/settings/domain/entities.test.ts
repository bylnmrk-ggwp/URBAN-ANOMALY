import { describe, expect, it } from 'vitest'

import { SEED_SETTINGS } from '@/mocks/data/settings'

import { storeSettingsSchema } from './entities'

/** Form shape: nullable URLs are empty strings on the input side. */
const valid = {
  ...SEED_SETTINGS,
  logoUrl: '',
  gcashEnabled: true,
  gcashAccountName: 'Urban Anomaly',
  gcashNumber: '09171230000',
  gcashQrUrl: 'https://example.com/gcash-qr.png',
}

function issuePaths(input: unknown): unknown[] {
  const result = storeSettingsSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path[0])
}

describe('storeSettingsSchema GCash block', () => {
  it('accepts complete GCash details', () => {
    expect(storeSettingsSchema.safeParse(valid).success).toBe(true)
  })

  it('requires the account name, number and QR only while GCash is enabled', () => {
    const empty = { ...valid, gcashAccountName: '', gcashNumber: '', gcashQrUrl: '' }

    expect(issuePaths({ ...empty, gcashEnabled: false })).toEqual([])
    expect(issuePaths({ ...empty, gcashEnabled: true })).toEqual([
      'gcashAccountName',
      'gcashNumber',
      'gcashQrUrl',
    ])
  })

  it('accepts only an 11-digit PH mobile number starting with 09', () => {
    for (const gcashNumber of ['+639171230000', '0917123000', '091712300001', '9171230000']) {
      expect(issuePaths({ ...valid, gcashNumber })).toEqual(['gcashNumber'])
    }
    expect(issuePaths({ ...valid, gcashNumber: ' 09171230000 ' })).toEqual([])
  })

  it('still requires a valid URL for the QR image', () => {
    expect(issuePaths({ ...valid, gcashQrUrl: 'not a url' })).toEqual(['gcashQrUrl'])
  })
})
