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
  defaultLowStockThreshold: number
  notifyNewOrders: boolean
  notifyLowStock: boolean
  notifyPaymentEvents: boolean
}

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, 'Store name is required.').max(60),
  logoUrl: z.union([z.url('Enter a valid URL.'), z.literal('')]),
  contactEmail: z.email('Enter a valid email.'),
  contactPhone: z.string().trim().min(7, 'Enter a contact number.').max(20),
  address: z.string().trim().min(5, 'Enter the store address.').max(200),
  flatShippingFee: z.coerce.number().min(0),
  freeShippingThreshold: z.coerce.number().min(0),
  codEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
  defaultLowStockThreshold: z.coerce.number().int().min(0),
  notifyNewOrders: z.boolean(),
  notifyLowStock: z.boolean(),
  notifyPaymentEvents: z.boolean(),
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
