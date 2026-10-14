import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateReturnStatus } from '@/features/returns/application/hooks'
import type { ReturnRequest, ReturnStatus } from '@/features/returns/domain/entities'
import { RETURN_STATUS_LABELS, RETURN_STATUS_TRANSITIONS } from '@/features/returns/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

const ACTION_LABELS: Record<ReturnStatus, string> = {
  requested: 'Reopen',
  approved: 'Approve',
  rejected: 'Reject',
  received: 'Mark received',
  refunded: 'Issue refund',
}

const CONFIRM_COPY: Record<ReturnStatus, string> = {
  requested: '',
  approved: 'The customer will be asked to ship the items back.',
  rejected: 'The customer is told the return was not accepted. Add a short reason.',
  received: 'Use this once the parcel has arrived and been checked.',
  refunded: 'Marks the order as refunded for the request amount. This cannot be undone.',
}

interface ReturnActionsProps {
  request: ReturnRequest
  className?: string
}

/** Transition buttons for a return request; each confirms with an optional admin note. */
export function ReturnActions({ request, className }: ReturnActionsProps) {
  const noteId = useId()
  const update = useUpdateReturnStatus()
  const [pending, setPending] = useState<ReturnStatus | null>(null)
  const [note, setNote] = useState(request.adminNote)
  const [noteError, setNoteError] = useState(false)
  const transitions = RETURN_STATUS_TRANSITIONS[request.status]

  const close = () => {
    setPending(null)
    setNote(request.adminNote)
    setNoteError(false)
  }

  const confirm = () => {
    if (!pending) return
    if (pending === 'rejected' && note.trim().length === 0) {
      setNoteError(true)
      return
    }
    update.mutate(
      { id: request.id, status: pending, adminNote: note },
      {
        onSuccess: () => {
          toast.success(`Return ${request.orderNumber}: ${RETURN_STATUS_LABELS[pending]}.`)
          close()
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Could not update the return.')),
      },
    )
  }

  if (transitions.length === 0) {
    return (
      <p className={className ?? 'text-muted-foreground text-sm'}>
        This request is closed. No further actions are available.
      </p>
    )
  }

  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      {transitions.map((status) => {
        const destructive = status === 'rejected'
        return (
          <Button
            key={status}
            variant={destructive ? 'outline' : 'default'}
            className={
              destructive ? 'text-destructive hover:text-destructive min-h-11' : 'min-h-11'
            }
            disabled={update.isPending}
            onClick={() => setPending(status)}
          >
            {update.isPending && pending === status ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {ACTION_LABELS[status]}
          </Button>
        )
      })}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && close()}
        title={pending ? `${ACTION_LABELS[pending]} this return?` : 'Update return?'}
        description={
          <span className="block space-y-3">
            <span className="block">
              {pending ? CONFIRM_COPY[pending] : ''}
              {pending === 'refunded'
                ? ` Refund amount: ${formatPrice(request.refundAmount)}.`
                : ''}
            </span>
            <span className="block space-y-1.5 text-left">
              <Label htmlFor={noteId} className="text-foreground">
                Note to customer{pending === 'rejected' ? '' : ' (optional)'}
              </Label>
              <Textarea
                id={noteId}
                rows={2}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setNoteError(false)
                }}
                placeholder="Shown on the customer's order page."
                aria-invalid={noteError}
              />
              {noteError ? (
                <span className="text-destructive block text-xs">A reason is required.</span>
              ) : null}
            </span>
          </span>
        }
        confirmLabel={pending ? ACTION_LABELS[pending] : 'Confirm'}
        destructive={pending === 'rejected'}
        isPending={update.isPending}
        onConfirm={confirm}
      />
    </div>
  )
}
