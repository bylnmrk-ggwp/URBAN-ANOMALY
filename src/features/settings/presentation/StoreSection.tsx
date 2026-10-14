import { Store } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'

import type { SettingsFormApi } from './fields'

export function StoreSection({ form }: { form: SettingsFormApi }) {
  const logoUrl = form.watch('logoUrl')

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Store</CardTitle>
        <CardDescription>Identity and contact details shown on the storefront.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 *:min-w-0 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="storeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store name</FormLabel>
              <FormControl>
                <Input autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Input type="url" placeholder="https://…" {...field} />
                </FormControl>
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo preview" className="size-full object-contain" />
                  ) : (
                    <Store className="text-muted-foreground size-4" aria-hidden="true" />
                  )}
                </span>
              </div>
              <FormDescription>Leave empty to show the store name as text.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact phone</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea rows={2} autoComplete="street-address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
