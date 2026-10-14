import { Minus, Plus } from 'lucide-react'
import { useId, useState } from 'react'

import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  value: number
  max: number
  onChange: (value: number) => void
  min?: number
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(Math.floor(value), min), Math.max(min, max))
}

export function QuantitySelector({
  value,
  max,
  onChange,
  min = 1,
  disabled = false,
  size = 'md',
  label = 'Quantity',
  className,
}: QuantitySelectorProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const atMax = value >= max
  const atMin = value <= min
  const controlSize = size === 'sm' ? 'size-9' : 'size-11'

  const commit = (next: number) => {
    setDraft(null)
    const clamped = clamp(next, min, max)
    if (clamped !== value) onChange(clamped)
  }

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <div
        className="border-border inline-flex items-stretch overflow-hidden rounded-md border"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={disabled || atMin}
          onClick={() => commit(value - 1)}
          className={cn(
            'hover:bg-muted flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            controlSize,
          )}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          aria-label={label}
          min={min}
          max={max}
          value={draft ?? value}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(Number(draft ?? value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(Number(draft ?? value))
          }}
          className={cn(
            'w-12 [appearance:textfield] border-x bg-transparent text-center text-sm tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            size === 'sm' ? 'h-9' : 'h-11',
          )}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={disabled || atMax}
          onClick={() => commit(value + 1)}
          className={cn(
            'hover:bg-muted flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            controlSize,
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p role="status" aria-live="polite" className="text-muted-foreground min-h-4 text-xs">
        {atMax && max > 0 && !disabled ? `Maximum of ${max} reached` : ''}
      </p>
    </div>
  )
}
