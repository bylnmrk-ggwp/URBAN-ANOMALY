import type { StoreSettings } from '@/features/settings/domain/entities'

export const SEED_SETTINGS: StoreSettings = {
  storeName: 'URBAN ANOMALY',
  logoUrl: null,
  contactEmail: 'hello@urbananomaly.demo',
  contactPhone: '09171230000',
  address: 'Unit 3A, 120 Chino Roces Avenue, Legazpi Village, Makati City, Metro Manila 1229',
  flatShippingFee: 150,
  freeShippingThreshold: 2500,
  codEnabled: true,
  onlinePaymentEnabled: true,
  onlinePaymentConfigured: false,
  emailNotificationsConfigured: false,
  defaultLowStockThreshold: 5,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyPaymentEvents: true,
}
