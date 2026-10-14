import { FolderOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useCategories, useCategoryMutations } from '@/features/categories/application/hooks'
import type { Category, CategoryInput } from '@/features/categories/domain/entities'
import { CategoriesTable } from '@/features/categories/presentation/CategoriesTable'
import { CategoryDialog } from '@/features/categories/presentation/CategoryDialog'
import { getErrorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'

type DialogState = { open: false } | { open: true; category: Category | null }

export default function CategoriesPage() {
  const categories = useCategories()
  const { create, update, remove } = useCategoryMutations()
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [removing, setRemoving] = useState<Category | null>(null)

  const openCreate = () => setDialog({ open: true, category: null })

  const submit = async (input: CategoryInput) => {
    if (!dialog.open) return
    try {
      if (dialog.category) {
        await update.mutateAsync({ id: dialog.category.id, input })
        toast.success(`"${input.name}" updated.`)
      } else {
        await create.mutateAsync(input)
        toast.success(`"${input.name}" created.`)
      }
      setDialog({ open: false })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the category.'))
    }
  }

  const confirmRemove = () => {
    if (!removing) return
    const target = removing
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`"${target.name}" removed.`)
        setRemoving(null)
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            `Could not remove "${target.name}". Move its products to another category first.`,
          ),
        )
        setRemoving(null)
      },
    })
  }

  const addButton = (
    <Button onClick={openCreate}>
      <Plus aria-hidden="true" />
      Add Category
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Collections that group products on the storefront."
        actions={addButton}
      />

      {categories.isError ? (
        <ErrorState
          title="Could not load categories"
          error={categories.error}
          onRetry={() => void categories.refetch()}
          isRetrying={categories.isRefetching}
        />
      ) : (
        <CategoriesTable
          categories={categories.data ?? []}
          isLoading={categories.isPending}
          onEdit={(category) => setDialog({ open: true, category })}
          onRemove={setRemoving}
          emptyState={
            <EmptyState
              icon={FolderOpen}
              title="No categories yet"
              description="Create a category to start organising products."
              action={addButton}
            />
          }
        />
      )}

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false })
        }}
        category={dialog.open ? dialog.category : null}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={removing ? `Remove "${removing.name}"?` : 'Remove category?'}
        description={
          removing && removing.productCount > 0
            ? `This category still has ${pluralize(removing.productCount, 'product')}. Removal will be rejected until they are moved to another category.`
            : 'The collection page for this category will no longer exist.'
        }
        confirmLabel="Remove"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
