import { useWatch } from 'react-hook-form'

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
import { cn } from '@/lib/utils'

import type { ProductFormApi } from './model'

const TITLE_MAX = 70
const DESCRIPTION_MAX = 160

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={cn('tabular-nums', length > max && 'text-destructive')} aria-live="polite">
      {length}/{max}
    </span>
  )
}

export function SeoCard({ form }: { form: ProductFormApi }) {
  const title = useWatch({ control: form.control, name: 'seoTitle' }) ?? ''
  const description = useWatch({ control: form.control, name: 'seoDescription' }) ?? ''

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">SEO</CardTitle>
        <CardDescription>
          Overrides the browser title and meta description. Leave empty to use the product name and
          description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="seoTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex justify-between">
                SEO title <Counter length={title.length} max={TITLE_MAX} />
              </FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="seoDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex justify-between">
                Meta description <Counter length={description.length} max={DESCRIPTION_MAX} />
              </FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>Shown under the title in search results.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
