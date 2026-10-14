import { ImageUploadField } from '@/components/common/ImageUploadField'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { ProductImageInput } from '@/features/products/domain/entities'

import { type SettingsFormApi, SwitchRow } from './fields'

/** The upload field manages a list; the QR is that list's single entry. */
function toImages(url: string): ProductImageInput[] {
  return url ? [{ url, alt: 'GCash QR code', isPrimary: true }] : []
}

export function GcashSection({ form }: { form: SettingsFormApi }) {
  const enabled = form.watch('gcashEnabled')

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">GCash</CardTitle>
        <CardDescription>
          Buyers scan your QR, pay from their GCash app and type the reference number at checkout.
          You verify it against your account and mark the order paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow
          form={form}
          name="gcashEnabled"
          label="GCash via QR code"
          description="Shown at checkout once the details below and a QR image are saved."
        />
        <div className="grid gap-4 *:min-w-0 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="gcashAccountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="Name shown in GCash" {...field} />
                </FormControl>
                <FormDescription>Buyers see this next to the QR code.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gcashNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GCash number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    {...field}
                  />
                </FormControl>
                <FormDescription>11-digit mobile number registered to the account.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="gcashQrUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QR code image{enabled ? '' : ' (optional while disabled)'}</FormLabel>
              <ImageUploadField
                value={toImages(field.value)}
                // One image only: adding another replaces the current QR.
                onChange={(images) => field.onChange(images.at(-1)?.url ?? '')}
              />
              <FormDescription>
                Export the QR from the GCash app (Profile → My QR). It is served from the public
                media library, like product photos.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
