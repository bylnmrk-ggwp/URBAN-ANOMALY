import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type { ProductFormApi } from './model'

interface BasicsCardProps {
  form: ProductFormApi
  onSlugEdited: () => void
}

export function BasicsCard({ form, onSlugEdited }: BasicsCardProps) {
  const details = form.watch('details')

  const setDetails = (next: string[]) =>
    form.setValue('details', next, { shouldDirty: true, shouldValidate: false })

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Basics</CardTitle>
        <CardDescription>Name, URL slug and description shown on the storefront.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Lava Premium Clog" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="relaxed-linen-shirt"
                  autoComplete="off"
                  className="font-mono text-xs"
                  {...field}
                  onChange={(e) => {
                    onSlugEdited()
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormDescription>Generated from the name until you edit it.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="Material, fit and styling notes." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Details</legend>
          <p className="text-muted-foreground text-xs">
            Short bullet points such as material, care or fit.
          </p>
          {details.length === 0 ? (
            <p className="text-muted-foreground text-sm">No details added.</p>
          ) : (
            <ul className="space-y-2">
              {details.map((detail, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Label htmlFor={`detail-${index}`} className="sr-only">
                    Detail {index + 1}
                  </Label>
                  <Input
                    id={`detail-${index}`}
                    value={detail}
                    placeholder="Closed-cell EVA foam"
                    onChange={(e) =>
                      setDetails(details.map((d, i) => (i === index ? e.target.value : d)))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove detail ${index + 1}`}
                    onClick={() => setDetails(details.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetails([...details, ''])}
          >
            <Plus aria-hidden="true" />
            Add detail
          </Button>
        </fieldset>
      </CardContent>
    </Card>
  )
}
