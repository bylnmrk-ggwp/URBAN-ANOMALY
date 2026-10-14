import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/products/application/admin'
import type { ProductInput } from '@/features/products/domain/entities'
import { ProductForm } from '@/features/products/presentation/admin/ProductForm'

function FormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading product">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const product = useAdminProduct(id)
  const create = useCreateProduct()
  const update = useUpdateProduct()

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link to={routes.admin.products}>
        <ArrowLeft aria-hidden="true" />
        Back to products
      </Link>
    </Button>
  )

  const submit = (input: ProductInput) =>
    id ? update.mutateAsync({ id, input }) : create.mutateAsync(input)

  let body: ReactNode
  if (isEdit && product.isPending) {
    body = <FormSkeleton />
  } else if (isEdit && product.isError) {
    body = (
      <ErrorState
        title="Could not load the product"
        error={product.error}
        onRetry={() => void product.refetch()}
        isRetrying={product.isRefetching}
      />
    )
  } else if (isEdit && product.data === null) {
    body = (
      <ErrorState
        title="Product not found"
        message="This product may have been removed."
        className="border-border bg-transparent"
      />
    )
  } else {
    body = (
      <ProductForm
        key={product.data?.id ?? 'new'}
        product={product.data ?? undefined}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <PageHeader
          title={isEdit ? (product.data?.name ?? 'Edit product') : 'New product'}
          description={
            isEdit
              ? 'Update details, pricing, media and variants.'
              : 'Add a product to the catalogue. Save as a draft until it is ready.'
          }
        />
      </div>
      {body}
    </div>
  )
}
