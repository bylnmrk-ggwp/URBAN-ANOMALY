import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { UnsavedChangesGuard } from '@/features/products/presentation/admin/UnsavedChangesGuard'

import { useUpdateStoreSettings } from '../application/hooks'
import {
  type StoreSettings,
  type StoreSettingsFormValues,
  type StoreSettingsInput,
  storeSettingsSchema,
} from '../domain/entities'
import {
  InventorySection,
  NotificationsSection,
  PaymentsSection,
  ShippingSection,
} from './CommerceSections'
import type { StoreSettingsFormInput } from './fields'
import { StoreSection } from './StoreSection'

function toFormValues(settings: StoreSettings): StoreSettingsFormInput {
  return {
    storeName: settings.storeName,
    logoUrl: settings.logoUrl ?? '',
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    flatShippingFee: settings.flatShippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    codEnabled: settings.codEnabled,
    onlinePaymentEnabled: settings.onlinePaymentEnabled,
    defaultLowStockThreshold: settings.defaultLowStockThreshold,
    notifyNewOrders: settings.notifyNewOrders,
    notifyLowStock: settings.notifyLowStock,
    notifyPaymentEvents: settings.notifyPaymentEvents,
  }
}

function toInput(values: StoreSettingsFormValues): StoreSettingsInput {
  return { ...values, logoUrl: values.logoUrl === '' ? null : values.logoUrl }
}

interface SettingsFormProps {
  settings: StoreSettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const update = useUpdateStoreSettings()
  const form = useForm<StoreSettingsFormInput, unknown, StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: toFormValues(settings),
    mode: 'onBlur',
  })

  const handleSubmit = form.handleSubmit((values) => {
    update.mutate(toInput(values), {
      onSuccess: (saved) => form.reset(toFormValues(saved)),
    })
  })

  const isDirty = form.formState.isDirty

  return (
    <Form {...form}>
      <UnsavedChangesGuard shouldBlock={() => form.formState.isDirty} />
      <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-20 lg:pb-0">
        <div className="grid min-w-0 gap-6 xl:grid-cols-3">
          <div className="min-w-0 space-y-6 xl:col-span-2">
            <StoreSection form={form} />
            <ShippingSection form={form} />
            <PaymentsSection form={form} settings={settings} />
          </div>
          <div className="space-y-6">
            <InventorySection form={form} />
            <NotificationsSection form={form} settings={settings} />
            <div className="hidden lg:block">
              <Actions
                isDirty={isDirty}
                isPending={update.isPending}
                onReset={() => form.reset()}
              />
            </div>
          </div>
        </div>

        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur lg:hidden">
          <Actions isDirty={isDirty} isPending={update.isPending} onReset={() => form.reset()} />
        </div>
      </form>
    </Form>
  )
}

function Actions({
  isDirty,
  isPending,
  onReset,
}: {
  isDirty: boolean
  isPending: boolean
  onReset: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground min-w-0 text-xs" aria-live="polite">
        {isDirty ? 'Unsaved changes' : 'All changes saved'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onReset} disabled={!isDirty || isPending}>
          Reset
        </Button>
        <Button type="submit" disabled={!isDirty || isPending}>
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Save settings
        </Button>
      </div>
    </div>
  )
}
