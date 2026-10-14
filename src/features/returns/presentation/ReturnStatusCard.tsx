import { Check } from 'lucide-react'

import type { ReturnRequest, ReturnStatus } from '@/features/returns/domain/entities'
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from '@/features/returns/domain/entities'
import { formatDateTime, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ReturnItemsList } from './ReturnItemsList'
import { ReturnStatusBadge } from './ReturnStatusBadge'

const HAPPY_PATH: ReturnStatus[] = ['requested', 'approved', 'received', 'refunded']

const STEP_HINT: Record<ReturnStatus, string> = {
  requested: 'We are reviewing your request.',
  approved: 'Send the items back using the instructions below.',
  received: 'Your items arrived and are being checked.',
  refunded: 'Your refund has been issued.',
  rejected: 'This request was not approved.',
}

interface ReturnStatusCardProps {
  request: ReturnRequest
}

/** Buyer-facing summary of a return request with a step list for the happy path. */
export function ReturnStatusCard({ request }: ReturnStatusCardProps) {
  const rejected = request.status === 'rejected'
  const steps = rejected ? (['requested', 'rejected'] as ReturnStatus[]) : HAPPY_PATH
  const currentIndex = steps.indexOf(request.status)

  return (
    <section aria-labelledby="return-heading" className="space-y-5 rounded-md border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="return-heading" className="text-lg font-semibold tracking-tight">
            Return request
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Requested {formatDateTime(request.createdAt)} · {RETURN_REASON_LABELS[request.reason]} ·{' '}
            {request.resolution === 'refund' ? 'Refund' : 'Exchange'}
          </p>
        </div>
        <ReturnStatusBadge status={request.status} />
      </div>

      <ol className="space-y-2" aria-label="Return progress">
        {steps.map((status, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          return (
            <li key={status} className="flex items-start gap-3 text-sm">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums',
                  done && 'bg-foreground text-background border-foreground',
                  current && !rejected && 'border-foreground font-semibold',
                  current && rejected && 'border-destructive text-destructive font-semibold',
                  !done && !current && 'text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className={cn(!done && !current && 'text-muted-foreground')}>
                  {RETURN_STATUS_LABELS[status]}
                  {current ? <span className="sr-only"> (current)</span> : null}
                </p>
                {current ? (
                  <p className="text-muted-foreground text-xs">{STEP_HINT[status]}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Items
        </h3>
        <ReturnItemsList items={request.items} />
        <p className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
          <span>{request.resolution === 'refund' ? 'Refund amount' : 'Value of items'}</span>
          <span className="font-semibold tabular-nums">{formatPrice(request.refundAmount)}</span>
        </p>
      </div>

      {request.adminNote ? (
        <div className="bg-muted rounded-md p-3 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Note from the store
          </p>
          <p>{request.adminNote}</p>
        </div>
      ) : null}
    </section>
  )
}
