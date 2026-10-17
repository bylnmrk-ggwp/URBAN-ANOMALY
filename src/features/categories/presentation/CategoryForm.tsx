import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { slugify } from '@/lib/format'

import type { Category, CategoryInput } from '../domain/entities'
import { type CategoryFormValues, categoryFormSchema } from '../domain/schema'

interface CategoryFormProps {
  category?: Category
  onSubmit: (input: CategoryInput) => Promise<unknown>
  onCancel: () => void
  isPending: boolean
}

function toFormValues(category?: Category): CategoryFormValues {
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    imageUrl: category?.imageUrl ?? '',
    introTitle: category?.introTitle ?? '',
    introBody: category?.introBody ?? '',
  }
}

export function CategoryForm({ category, onSubmit, onCancel, isPending }: CategoryFormProps) {
  const [slugEdited, setSlugEdited] = useState(Boolean(category))
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  })

  const name = useWatch({ control: form.control, name: 'name' })
  const imageUrl = useWatch({ control: form.control, name: 'imageUrl' })
  useEffect(() => {
    if (!slugEdited) form.setValue('slug', slugify(name), { shouldDirty: true })
  }, [name, slugEdited, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      slug: values.slug,
      description: values.description,
      imageUrl: values.imageUrl === '' ? null : values.imageUrl,
      introTitle: values.introTitle ?? '',
      introBody: values.introBody ?? '',
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Loafer Mules" autoComplete="off" {...field} />
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
                  placeholder="loafer-mules"
                  autoComplete="off"
                  className="font-mono text-xs"
                  {...field}
                  onChange={(e) => {
                    setSlugEdited(true)
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormDescription>Used in the collection URL.</FormDescription>
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
                <Textarea rows={3} placeholder="Optional short description." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Input type="url" placeholder="https://…" {...field} />
                </FormControl>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="bg-muted size-9 shrink-0 rounded-md border object-cover"
                  />
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <fieldset className="space-y-4 rounded-md border p-3">
          <legend className="px-1 text-xs font-medium tracking-wide uppercase">
            Collection page intro
          </legend>
          <FormField
            control={form.control}
            name="introTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intro title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Slides for the city heat"
                    autoComplete="off"
                    maxLength={120}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>Replaces the category name as the page heading.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="introBody"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intro text</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={600}
                    placeholder="Optional. Shown under the description on the collection page."
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Markdown: **bold**, _italic_, [links](/shop), - lists.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
