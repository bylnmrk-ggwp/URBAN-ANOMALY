import { z } from 'zod'

export interface StoreSettings {
  storeName: string
  logoUrl: string | null
  contactEmail: string
  contactPhone: string
  address: string
  flatShippingFee: number
  freeShippingThreshold: number
  codEnabled: boolean
  onlinePaymentEnabled: boolean
  /** Not connected: true once PayMongo keys exist on the backend. */
  onlinePaymentConfigured: boolean
  /** Not connected: true once Resend keys exist on the backend. */
  emailNotificationsConfigured: boolean
  /**
   * GCash via QR: the owner's account details shown at checkout. The option is only
   * offered when enabled AND a QR image has been uploaded.
   */
  gcashEnabled: boolean
  gcashAccountName: string
  /** 11-digit PH mobile number registered to the GCash account (09XXXXXXXXX). */
  gcashNumber: string
  gcashQrUrl: string | null
  defaultLowStockThreshold: number
  notifyNewOrders: boolean
  notifyLowStock: boolean
  notifyPaymentEvents: boolean
}

export const GCASH_NUMBER_PATTERN = /^09\d{9}$/

export const storeSettingsSchema = z
  .object({
    storeName: z.string().trim().min(2, 'Store name is required.').max(60),
    logoUrl: z.union([z.url('Enter a valid URL.'), z.literal('')]),
    contactEmail: z.email('Enter a valid email.'),
    contactPhone: z.string().trim().min(7, 'Enter a contact number.').max(20),
    address: z.string().trim().min(5, 'Enter the store address.').max(200),
    flatShippingFee: z.coerce.number().min(0),
    freeShippingThreshold: z.coerce.number().min(0),
    codEnabled: z.boolean(),
    onlinePaymentEnabled: z.boolean(),
    gcashEnabled: z.boolean(),
    gcashAccountName: z.string().trim().max(80),
    gcashNumber: z.string().trim().max(20),
    gcashQrUrl: z.union([z.url('Enter a valid URL.'), z.literal('')]),
    defaultLowStockThreshold: z.coerce.number().int().min(0),
    notifyNewOrders: z.boolean(),
    notifyLowStock: z.boolean(),
    notifyPaymentEvents: z.boolean(),
  })
  // The GCash details are only required while the method is switched on, so an owner can
  // turn it off without clearing the fields first.
  .superRefine((values, ctx) => {
    if (!values.gcashEnabled) return
    if (values.gcashAccountName.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['gcashAccountName'],
        message: 'Enter the name on the GCash account.',
      })
    }
    if (!GCASH_NUMBER_PATTERN.test(values.gcashNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['gcashNumber'],
        message: 'Enter the 11-digit GCash mobile number (09XXXXXXXXX).',
      })
    }
    if (values.gcashQrUrl === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['gcashQrUrl'],
        message: 'Upload the GCash QR code so buyers can scan it.',
      })
    }
  })

export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>
export type StoreSettingsInput = Omit<
  StoreSettings,
  'onlinePaymentConfigured' | 'emailNotificationsConfigured'
>

export interface SettingsRepository {
  get(): Promise<StoreSettings>
  update(input: StoreSettingsInput): Promise<StoreSettings>
}
