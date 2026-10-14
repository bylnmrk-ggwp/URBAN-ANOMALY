import { Plus, TicketPercent } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useDiscountMutations, useDiscounts } from '@/features/discounts/application/hooks'
import type { DiscountCode, DiscountInput } from '@/features/discounts/domain/entities'
import { DiscountFormDialog } from '@/features/discounts/presentation/DiscountFormDialog'
import { DiscountsTable } from '@/features/discounts/presentation/DiscountsTable'
import { RequirePermission } from '@/features/team/presentation/RequirePermission'
import { getErrorMessage } from '@/lib/errors'

type DialogState = { open: false } | { open: true; discount: DiscountCode | null }

export default function DiscountsPage() {
  return (
    <RequirePermission permission="discounts.manage">
      <DiscountsPageContent />
    </RequirePermission>
  )
}

function toInput(d: DiscountCode): DiscountInput {
  return {
    code: d.code,
    type: d.type,
    value: d.value,
    minSubtotal: d.minSubtotal,
    maxUses: d.maxUses,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    isActive: d.isActive,
  }
}

function DiscountsPageContent() {
  const discounts = useDiscounts()
  const { create, update, remove } = useDiscountMutations()
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const [removing, setRemoving] = useState<DiscountCode | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const submit = async (input: DiscountInput) => {
    if (!dialog.open) return
    try {
      if (dialog.discount) {
        await update.mutateAsync({ id: dialog.discount.id, input })
        toast.success(`${input.code} updated.`)
      } else {
        await create.mutateAsync(input)
        toast.success(`${input.code} created.`)
      }
      setDialog({ open: false })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the discount.'))
    }
  }

  const toggleActive = (d: DiscountCode, isActive: boolean) => {
    setTogglingId(d.id)
    update.mutate(
      { id: d.id, input: { ...toInput(d), isActive } },
      {
        onSuccess: () => toast.success(`${d.code} ${isActive ? 'activated' : 'deactivated'}.`),
        onError: (error) => toast.error(getErrorMessage(error, 'Could not update the discount.')),
        onSettled: () => setTogglingId(null),
      },
    )
  }

  const confirmRemove = () => {
    if (!removing) return
    const target = removing
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.code} deleted.`)
        setRemoving(null)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Could not delete the discount.'))
        setRemoving(null)
      },
    })
  }

  const addButton = (
    <Button onClick={() => setDialog({ open: true, discount: null })}>
      <Plus aria-hidden="true" />
      New discount
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Promo codes customers can apply at checkout."
        actions={addButton}
      />

      {discounts.isError ? (
        <ErrorState
          title="Could not load discounts"
          error={discounts.error}
          onRetry={() => void discounts.refetch()}
          isRetrying={discounts.isRefetching}
        />
      ) : (
        <DiscountsTable
          discounts={discounts.data ?? []}
          isLoading={discounts.isPending}
          onEdit={(discount) => setDialog({ open: true, discount })}
          onRemove={setRemoving}
          onToggleActive={toggleActive}
          togglingId={togglingId}
          emptyState={
            <EmptyState
              icon={TicketPercent}
              title="No discount codes yet"
              description="Create a code to offer a percentage or fixed amount off at checkout."
              action={addButton}
            />
          }
        />
      )}

      <DiscountFormDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false })
        }}
        discount={dialog.open ? dialog.discount : null}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={removing ? `Delete ${removing.code}?` : 'Delete discount?'}
        description="Customers will no longer be able to apply this code. Orders that already used it are not affected."
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
