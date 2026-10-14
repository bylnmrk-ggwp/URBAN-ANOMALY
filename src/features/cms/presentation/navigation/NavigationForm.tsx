import type { UseFormReturn } from 'react-hook-form'

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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import type { NavigationContent } from '../../domain/navigation'
import { FooterColumnsField } from './FooterColumnsField'
import { LinkListField } from './LinkListField'

type Form = UseFormReturn<NavigationContent>
type SwitchName = 'showCollectionsMenu' | 'showCategoryColumn'
type TextName = 'newsletterTitle' | 'newsletterBody' | 'paymentLine' | 'legalLine'

function SwitchRow({
  form,
  name,
  label,
  description,
}: {
  form: Form
  name: SwitchName
  label: string
  description: string
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <FormDescription className="text-xs">{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

function TextRow({
  form,
  name,
  label,
  multiline,
}: {
  form: Form
  name: TextName
  label: string
  multiline?: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? <Textarea rows={2} {...field} /> : <Input {...field} />}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function NavigationForm({ form }: { form: Form }) {
  return (
    <>
      <Card className="gap-4 rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Header</CardTitle>
          <CardDescription>
            Links in the top bar. Primary links appear before the Collections menu, secondary links
            after it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2" aria-labelledby="nav-primary">
            <h3 id="nav-primary" className="text-sm font-medium">
              Primary links
            </h3>
            <LinkListField form={form} name="primaryLinks" label="Primary link" max={6} />
          </section>
          <SwitchRow
            form={form}
            name="showCollectionsMenu"
            label="Show Collections menu"
            description="A dropdown listing every category, generated from the catalog."
          />
          <section className="space-y-2" aria-labelledby="nav-secondary">
            <h3 id="nav-secondary" className="text-sm font-medium">
              Secondary links
            </h3>
            <LinkListField form={form} name="secondaryLinks" label="Secondary link" max={6} />
          </section>
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Footer</CardTitle>
          <CardDescription>Link columns, newsletter copy and the legal line.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SwitchRow
            form={form}
            name="showCategoryColumn"
            label="Show category column"
            description="Adds a column listing categories before your custom columns."
          />
          <section className="space-y-2" aria-labelledby="nav-footer-columns">
            <h3 id="nav-footer-columns" className="text-sm font-medium">
              Columns
            </h3>
            <FooterColumnsField form={form} />
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextRow form={form} name="newsletterTitle" label="Newsletter title" />
            <div className="sm:col-span-2">
              <TextRow form={form} name="newsletterBody" label="Newsletter body" multiline />
            </div>
            <TextRow form={form} name="paymentLine" label="Payment line" />
            <TextRow form={form} name="legalLine" label="Legal line" />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
