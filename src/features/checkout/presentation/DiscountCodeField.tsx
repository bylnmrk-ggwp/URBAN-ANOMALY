import { Loader2, TicketPercent, X } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppliedDiscount } from '@/features/discounts/domain/entities'
import { formatPrice } from '@/lib/format'

export interface DiscountFieldState {
  applied: AppliedDiscount | null
  onApply: (code: string) => void
  onRemove: () => void
  error: string | null
  isPending: boolean
}

/** Discount code input shown inside the checkout order summary (mobile and desktop panels). */
export function DiscountCodeField({
  applied,
  onApply,
  onRemove,
  error,
  isPending,
}: DiscountFieldState) {
  const id = useId()
  const [code, setCode] = useState('')

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <TicketPercent className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            <span className="font-mono font-medium">{applied.code}</span>
            <span className="text-muted-foreground"> · −{formatPrice(applied.amount)}</span>
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9 shrink-0"
          onClick={onRemove}
          aria-label={`Remove discount code ${applied.code}`}
        >
          <X aria-hidden="true" />
          Remove
        </Button>
      </div>
    )
  }

  const submit = () => {
    const trimmed = code.trim()
    if (trimmed) onApply(trimmed)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">
        Discount code
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="WELCOME10"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-h-11 font-mono uppercase"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0"
          onClick={submit}
          disabled={isPending || code.trim().length === 0}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Apply
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
