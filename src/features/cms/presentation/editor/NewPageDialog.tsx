import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { getErrorMessage } from '@/lib/errors'
import { slugify } from '@/lib/format'

import { useCreatePage } from '../../application/useCmsDocuments'
import { pageSlugSchema, RESERVED_PAGE_SLUGS } from '../../domain/documents'
import { TextField } from './forms/fields'

const newPageSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(120),
  slug: pageSlugSchema.refine(
    (slug) => !RESERVED_PAGE_SLUGS.has(slug),
    'This slug is reserved by the storefront. Choose another.',
  ),
})
type NewPageValues = z.infer<typeof newPageSchema>

interface NewPageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Slugs already in use, rejected before hitting the repository. */
  existingSlugs: string[]
}

export function NewPageDialog({ open, onOpenChange, existingSlugs }: NewPageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
          <DialogDescription>
            Creates an unpublished page at /pages/&lt;slug&gt; that you can build in the editor.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <NewPageForm existingSlugs={existingSlugs} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewPageForm({ existingSlugs, onDone }: { existingSlugs: string[]; onDone: () => void }) {
  const navigate = useNavigate()
  const createPage = useCreatePage()
  const [slugEdited, setSlugEdited] = useState(false)
  const form = useForm<NewPageValues>({
    resolver: zodResolver(newPageSchema),
    defaultValues: { title: '', slug: '' },
    mode: 'onBlur',
  })

  const title = useWatch({ control: form.control, name: 'title' })
  useEffect(() => {
    if (!slugEdited) form.setValue('slug', slugify(title), { shouldDirty: true })
  }, [title, slugEdited, form])

  const submit = form.handleSubmit(async (values) => {
    if (existingSlugs.includes(values.slug)) {
      form.setError('slug', { message: 'A page with this slug already exists.' })
      return
    }
    try {
      const created = await createPage.mutateAsync(values)
      onDone()
      void navigate(routes.admin.editor(created.key))
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error, 'Could not create the page.') })
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField form={form} name="title" label="Title" placeholder="Lookbook" />
        <div onInput={() => setSlugEdited(true)}>
          <TextField
            form={form}
            name="slug"
            label="Slug"
            placeholder="lookbook"
            description="Generated from the title until you edit it. Lowercase letters, numbers and hyphens."
          />
        </div>
        {form.formState.errors.root?.message ? (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={createPage.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={createPage.isPending}>
            {createPage.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Create page
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
