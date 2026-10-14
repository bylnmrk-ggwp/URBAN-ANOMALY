import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { Form } from '@/components/ui/form'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { pageContentSchema, type PageContent } from '../../domain/sections'
import { TextareaField, TextField } from './forms/fields'

const pageSettingsSchema = pageContentSchema.omit({ sections: true })
type PageSettings = z.infer<typeof pageSettingsSchema>

interface PageSettingsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: PageContent
  onChange: (settings: PageSettings) => void
}

/** Title and SEO fields, edited in a side sheet so the section panel stays focused. */
export function PageSettingsForm({ open, onOpenChange, content, onChange }: PageSettingsFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Page settings</SheetTitle>
          <SheetDescription>Title and search-engine metadata for this page.</SheetDescription>
        </SheetHeader>
        {open ? <SettingsFields content={content} onChange={onChange} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function SettingsFields({
  content,
  onChange,
}: Pick<PageSettingsFormProps, 'content' | 'onChange'>) {
  const form = useForm<PageSettings>({
    resolver: zodResolver(pageSettingsSchema),
    defaultValues: {
      title: content.title,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
    },
    mode: 'onChange',
  })
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let timer: number | undefined
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => onChangeRef.current(values as PageSettings), 150)
      },
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [form])

  return (
    <Form {...form}>
      <form noValidate className="space-y-4 px-4 pb-6" onSubmit={(e) => e.preventDefault()}>
        <TextField
          form={form}
          name="title"
          label="Page title"
          description="Shown in the admin and used as the default browser title."
        />
        <TextField
          form={form}
          name="seoTitle"
          label="SEO title"
          description="Up to 70 characters. Leave empty to use the page title."
        />
        <TextareaField
          form={form}
          name="seoDescription"
          label="SEO description"
          description="Up to 160 characters, shown in search results."
        />
      </form>
    </Form>
  )
}
