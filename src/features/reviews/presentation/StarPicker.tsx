import { Star } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

interface StarPickerProps {
  value: number
  onChange: (value: number) => void
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  className?: string
}

const STARS = [1, 2, 3, 4, 5] as const

function starLabel(n: number) {
  return n === 1 ? '1 star' : `${n} stars`
}

/**
 * Rating input built as a radio group: arrow keys move the selection, each star is a
 * 44 px target, and the hovered/selected stars fill in.
 */
export function StarPicker({ value, onChange, id, className, ...aria }: StarPickerProps) {
  const [hovered, setHovered] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const shown = hovered || value

  const focusStar = (n: number) => buttons.current[n - 1]?.focus()

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    const next = Math.max(1, Math.min(5, (value || 0) + step))
    onChange(next)
    focusStar(next)
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Rating"
      className={cn('flex items-center', className)}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHovered(0)}
      {...aria}
    >
      {STARS.map((n) => {
        const checked = value === n
        const tabbable = checked || (value === 0 && n === 1)
        return (
          <button
            key={n}
            ref={(el) => {
              buttons.current[n - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={starLabel(n)}
            tabIndex={tabbable ? 0 : -1}
            className="focus-visible:ring-ring/50 flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(0)}
          >
            <Star
              className={cn(
                'size-7 transition-colors',
                n <= shown ? 'text-foreground fill-current' : 'text-border fill-current',
              )}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}
