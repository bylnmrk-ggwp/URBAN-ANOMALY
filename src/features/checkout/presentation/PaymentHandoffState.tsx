import { ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PaymentHandoffStateProps {
  className?: string
}

/** Explains the simulated payment handoff shown in demo mode instead of a PayMongo redirect. */
export function PaymentHandoffState({ className }: PaymentHandoffStateProps) {
  return (
    <div
      role="note"
      className={cn('bg-muted/40 flex items-start gap-3 rounded-md border p-4 text-sm', className)}
    >
      <ExternalLink className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">Simulated payment handoff</p>
        <p className="text-muted-foreground">
          In production you would be redirected to PayMongo here to pay with GCash, Maya or a card.
          Once PayMongo confirms the payment, this order moves to Pending Confirmation
          automatically. Stock stays reserved while payment is pending.
        </p>
      </div>
    </div>
  )
}
