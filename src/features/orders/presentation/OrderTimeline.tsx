import { Check, Circle, Clock, XCircle } from 'lucide-react'

import type { Order, OrderStatus } from '@/features/orders/domain/entities'
import {
  ORDER_PROGRESS_STEPS,
  ORDER_STATUS_LABELS,
  getProgressIndex,
} from '@/features/orders/domain/rules'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type StepState = 'completed' | 'current' | 'upcoming'

interface OrderTimelineProps {
  order: Pick<Order, 'status' | 'statusHistory' | 'updatedAt' | 'createdAt'>
  className?: string
}

const stateLabel: Record<StepState, string> = {
  completed: 'Completed',
  current: 'Current step',
  upcoming: 'Upcoming',
}

function eventDate(order: OrderTimelineProps['order'], status: OrderStatus): string | null {
  const event = [...order.statusHistory].reverse().find((entry) => entry.status === status)
  return event ? event.createdAt : null
}

export function OrderTimeline({ order, className }: OrderTimelineProps) {
  if (order.status === 'cancelled') {
    const cancelledAt = eventDate(order, 'cancelled') ?? order.updatedAt
    return (
      <div
        role="status"
        className={cn(
          'border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-3 rounded-md border p-4',
          className,
        )}
      >
        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Order cancelled</p>
          <p className="text-sm">Cancelled on {formatDateTime(cancelledAt)}.</p>
        </div>
      </div>
    )
  }

  const awaitingPayment = order.status === 'pending_payment'
  const currentIndex = getProgressIndex(order.status)
  const delivered = order.status === 'delivered'

  return (
    <ol className={cn('flex flex-col gap-6 md:flex-row md:gap-0', className)}>
      {ORDER_PROGRESS_STEPS.map((step, index) => {
        const state: StepState = delivered
          ? 'completed'
          : index < currentIndex
            ? 'completed'
            : index === currentIndex
              ? 'current'
              : 'upcoming'
        const isFirst = index === 0
        const label = isFirst && awaitingPayment ? 'Awaiting payment' : ORDER_STATUS_LABELS[step]
        const date =
          isFirst && awaitingPayment
            ? (eventDate(order, 'pending_payment') ?? order.createdAt)
            : state === 'upcoming'
              ? null
              : eventDate(order, step)
        const isLast = index === ORDER_PROGRESS_STEPS.length - 1

        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex gap-4 md:flex-1 md:flex-col md:gap-3"
          >
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 left-[15px] h-[calc(100%-0.5rem)] w-px md:top-4 md:left-[calc(50%+1rem)] md:h-px md:w-[calc(100%-2rem)]',
                  state === 'completed' ? 'bg-foreground' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 md:mx-auto',
                state === 'completed' && 'border-foreground bg-foreground text-background',
                state === 'current' && 'border-foreground bg-background text-foreground',
                state === 'upcoming' && 'border-border bg-background text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {state === 'completed' ? (
                <Check className="size-4" />
              ) : state === 'current' && awaitingPayment && isFirst ? (
                <Clock className="size-4" />
              ) : (
                <Circle className={cn('size-2.5', state === 'current' && 'fill-current')} />
              )}
            </span>
            <div className="min-w-0 pb-1 md:text-center">
              <p
                className={cn(
                  'text-sm font-medium',
                  state === 'upcoming' && 'text-muted-foreground',
                )}
              >
                {label}
                <span className="sr-only"> — {stateLabel[state]}</span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {date ? formatDateTime(date) : state === 'current' ? 'In progress' : 'Pending'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
