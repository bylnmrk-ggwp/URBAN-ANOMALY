import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useCategories } from '@/features/categories/application/hooks'
import { getErrorMessage } from '@/lib/errors'
import { slugify } from '@/lib/format'

import type { Product, ProductInput } from '../../domain/entities'
import {
  type ProductFormInput,
  type ProductFormValues,
  productFormSchema,
} from '../../domain/schema'
import { BasicsCard } from './form/BasicsCard'
import { MediaCard } from './form/MediaCard'
import { emptyProductForm, formValuesToInput, productToFormValues } from './form/model'
import { PricingCard } from './form/PricingCard'
import { SeoCard } from './form/SeoCard'
import { OrganizationCard, StatusCard } from './form/SidebarCards'
import { VariantsCard } from './form/VariantsCard'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

interface ProductFormProps {
  product?: Product
  onSubmit: (input: ProductInput) => Promise<unknown>
  isPending: boolean
}

export function ProductForm({ product, onSubmit, isPending }: ProductFormProps) {
  const navigate = useNavigate()
  const categories = useCategories()
  const [serverError, setServerError] = useState<string | null>(null)
  // Existing products keep their slug; new products follow the name until the slug is edited.
  const [slugEdited, setSlugEdited] = useState(Boolean(product))
  const [saved, setSaved] = useState(false)

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToFormValues(product) : emptyProductForm(),
    mode: 'onBlur',
  })

  const name = useWatch({ control: form.control, name: 'name' })
  useEffect(() => {
    if (!slugEdited) form.setValue('slug', slugify(name), { shouldDirty: true })
  }, [name, slugEdited, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await onSubmit(formValuesToInput(values))
      setSaved(true)
      void navigate(routes.admin.products)
    } catch (error) {
      setServerError(getErrorMessage(error, 'The product could not be saved.'))
    }
  })

  const isDirty = form.formState.isDirty

  return (
    <Form {...form}>
      <UnsavedChangesGuard shouldBlock={() => form.formState.isDirty && !saved} />
      <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-20 lg:pb-0">
        {serverError ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{serverError}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BasicsCard form={form} onSlugEdited={() => setSlugEdited(true)} />
            <PricingCard form={form} />
            <MediaCard form={form} />
            <VariantsCard form={form} />
          </div>
          <div className="space-y-6">
            <StatusCard form={form} />
            <OrganizationCard
              form={form}
              categories={categories.data ?? []}
              isLoadingCategories={categories.isPending}
            />
            <SeoCard form={form} />
            <div className="hidden lg:block">
              <FormActions isDirty={isDirty} isPending={isPending} isEdit={Boolean(product)} />
            </div>
          </div>
        </div>

        {/* Sticky action bar on small screens */}
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur lg:hidden">
          <FormActions isDirty={isDirty} isPending={isPending} isEdit={Boolean(product)} />
        </div>
      </form>
    </Form>
  )
}

function FormActions({
  isDirty,
  isPending,
  isEdit,
}: {
  isDirty: boolean
  isPending: boolean
  isEdit: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {isDirty ? 'Unsaved changes' : ''}
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" type="button">
          <Link to={routes.admin.products}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </div>
  )
}
