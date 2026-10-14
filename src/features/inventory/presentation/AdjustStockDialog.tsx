import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { useAdjustStock } from '../application/hooks'
import {
  type InventoryRow,
  MOVEMENT_REASON_LABELS,
  type StockAdjustmentInput,
} from '../domain/entities'

type AdjustReason = StockAdjustmentInput['reason']
type Direction = 'add' | 'remove'

const REASONS: AdjustReason[] = ['restock', 'correction', 'damaged', 'returned']
const NOTE_REQUIRED: AdjustReason[] = ['correction', 'damaged']

function isReason(value: string): value is AdjustReason {
  return REASONS.some((r) => r === value)
}

interface AdjustStockDialogProps {
  row: InventoryRow | null
  onOpenChange: (open: boolean) => void
}

export function AdjustStockDialog({ row, onOpenChange }: AdjustStockDialogProps) {
  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {row ? (
          <AdjustStockForm key={row.variantId} row={row} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AdjustStockForm({ row, onDone }: { row: InventoryRow; onDone: () => void }) {
  const id = useId()
  const adjust = useAdjustStock()
  const [direction, setDirection] = useState<Direction>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<AdjustReason>('restock')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const qty = Number.parseInt(quantity, 10)
  const qtyValid = Number.isInteger(qty) && qty > 0
  const delta = qtyValid ? (direction === 'add' ? qty : -qty) : 0
  const newStock = row.physicalStock + delta
  const belowReserved = newStock < row.reservedStock
  const noteRequired = NOTE_REQUIRED.includes(reason)
  const noteMissing = noteRequired && note.trim().length === 0

  const errors = {
    quantity: !qtyValid ? 'Enter a whole number greater than zero.' : null,
    stock: belowReserved
      ? `Stock cannot drop below the ${row.reservedStock} units reserved by open orders.`
      : null,
    note: noteMissing ? 'A note is required for corrections and write-offs.' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const submit = () => {
    setSubmitted(true)
    if (hasErrors) return
    adjust.mutate(
      { variantId: row.variantId, delta, reason, note: note.trim() },
      { onSuccess: onDone },
    )
  }

  const show = (message: string | null) => (submitted && message ? message : null)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adjust stock</DialogTitle>
        <DialogDescription>
          {row.productName} · {row.size} / {row.colorName} ·{' '}
          <span className="font-mono">{row.sku}</span>
        </DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          ['Physical', row.physicalStock],
          ['Reserved', row.reservedStock],
          ['Available', row.availableStock],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-muted rounded-md px-2 py-2">
            <dt className="text-muted-foreground tracking-wide uppercase">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Direction</legend>
          <RadioGroup
            value={direction}
            onValueChange={(v) => setDirection(v === 'remove' ? 'remove' : 'add')}
            className="grid grid-cols-2 gap-2"
          >
            {(['add', 'remove'] as Direction[]).map((d) => (
              <Label
                key={d}
                htmlFor={`${id}-${d}`}
                className="has-data-[state=checked]:border-primary flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"
              >
                <RadioGroupItem id={`${id}-${d}`} value={d} />
                {d === 'add' ? 'Add stock' : 'Remove stock'}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-qty`}>Quantity</Label>
            <Input
              id={`${id}-qty`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-invalid={Boolean(show(errors.quantity) ?? show(errors.stock))}
              autoFocus
            />
            {show(errors.quantity) ? (
              <p className="text-destructive text-xs">{errors.quantity}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-reason`}>Reason</Label>
            <Select value={reason} onValueChange={(v) => isReason(v) && setReason(v)}>
              <SelectTrigger id={`${id}-reason`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {MOVEMENT_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-note`}>
            Note{' '}
            <span className="text-muted-foreground font-normal">
              {noteRequired ? '(required)' : '(optional)'}
            </span>
          </Label>
          <Textarea
            id={`${id}-note`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              reason === 'damaged' ? 'What was damaged and why?' : 'Context for the audit trail'
            }
            aria-invalid={Boolean(show(errors.note))}
          />
          {show(errors.note) ? <p className="text-destructive text-xs">{errors.note}</p> : null}
        </div>

        <p
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            belowReserved ? 'border-destructive/30 text-destructive' : 'bg-muted',
          )}
          aria-live="polite"
        >
          New stock:{' '}
          <span className="font-semibold tabular-nums">
            {qtyValid ? newStock : row.physicalStock}
          </span>
          {qtyValid ? (
            <span className="text-muted-foreground">
              {' '}
              ({delta > 0 ? '+' : ''}
              {delta})
            </span>
          ) : null}
          {belowReserved ? <span className="block text-xs">{errors.stock}</span> : null}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={adjust.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={adjust.isPending || belowReserved}>
            {adjust.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Apply adjustment
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
