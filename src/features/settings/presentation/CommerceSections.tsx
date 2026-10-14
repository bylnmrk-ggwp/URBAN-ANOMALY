import { StatusBadge } from '@/components/common/StatusBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { StoreSettings } from '../domain/entities'
import { NumberField, type SettingsFormApi, SwitchRow } from './fields'

export function ShippingSection({ form }: { form: SettingsFormApi }) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Shipping</CardTitle>
        <CardDescription>
          Nationwide flat rate; orders above the threshold ship free.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 *:min-w-0 sm:grid-cols-2">
        <NumberField
          form={form}
          name="flatShippingFee"
          label="Flat shipping fee"
          prefix="₱"
          step="0.01"
        />
        <NumberField
          form={form}
          name="freeShippingThreshold"
          label="Free shipping from"
          prefix="₱"
          step="0.01"
          description="Set to 0 to make every order ship free."
        />
      </CardContent>
    </Card>
  )
}

export function InventorySection({ form }: { form: SettingsFormApi }) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Inventory</CardTitle>
        <CardDescription>
          Applied to new variants; existing thresholds are unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 *:min-w-0 sm:grid-cols-2">
        <NumberField
          form={form}
          name="defaultLowStockThreshold"
          label="Default low stock threshold"
          description="Variants at or below this available quantity are flagged."
        />
      </CardContent>
    </Card>
  )
}

interface PaymentsSectionProps {
  form: SettingsFormApi
  settings: Pick<StoreSettings, 'onlinePaymentConfigured'>
}

export function PaymentsSection({ form, settings }: PaymentsSectionProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Payments</CardTitle>
        <CardDescription>Methods offered at checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SwitchRow
          form={form}
          name="codEnabled"
          label="Cash on Delivery"
          description="Courier collects payment at the door."
        />
        <SwitchRow
          form={form}
          name="onlinePaymentEnabled"
          label="Online payment"
          description="Cards, GCash and Maya through PayMongo."
          trailing={
            settings.onlinePaymentConfigured ? (
              <StatusBadge label="Connected" tone="success" />
            ) : (
              <StatusBadge label="Integration not connected" tone="warning" />
            )
          }
        />
        {!settings.onlinePaymentConfigured ? (
          <p className="text-muted-foreground text-xs">
            Enabling this shows the option at checkout, but payments cannot be processed until
            PayMongo keys are added to the Supabase Edge Function secrets. Keys are never stored in
            the browser or in these settings.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface NotificationsSectionProps {
  form: SettingsFormApi
  settings: Pick<StoreSettings, 'emailNotificationsConfigured'>
}

export function NotificationsSection({ form, settings }: NotificationsSectionProps) {
  const badge = !settings.emailNotificationsConfigured ? (
    <StatusBadge label="Email not connected" tone="warning" />
  ) : null

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader className="min-w-0">
        <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
          Notifications
          {badge}
        </CardTitle>
        <CardDescription>
          In-app notifications always appear in the admin bell. Email copies require the Resend
          integration on the backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SwitchRow
          form={form}
          name="notifyNewOrders"
          label="New orders"
          description="When a customer places an order."
        />
        <SwitchRow
          form={form}
          name="notifyLowStock"
          label="Low stock"
          description="When a variant drops to its threshold."
        />
        <SwitchRow
          form={form}
          name="notifyPaymentEvents"
          label="Payment events"
          description="Successful, failed or refunded online payments."
        />
      </CardContent>
    </Card>
  )
}
