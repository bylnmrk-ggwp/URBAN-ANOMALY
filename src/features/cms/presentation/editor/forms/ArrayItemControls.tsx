import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ArrayItemControlsProps {
  /** Human label for aria, e.g. "question". */
  noun: string
  index: number
  count: number
  minCount: number
  onMove: (from: number, to: number) => void
  onRemove: (index: number) => void
  /** Added to the displayed 1-based number, e.g. when item 0 is really "slide 2". */
  labelOffset?: number
}

/** Up / down / remove buttons for one row of a repeatable field list. */
export function ArrayItemControls({
  noun,
  index,
  count,
  minCount,
  onMove,
  onRemove,
  labelOffset = 0,
}: ArrayItemControlsProps) {
  const label = `${noun} ${index + 1 + labelOffset}`
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="text-muted-foreground min-w-0 truncate text-xs font-medium capitalize">
        {label}
      </span>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${label} up`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${label} down`}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${label}`}
          disabled={count <= minCount}
          onClick={() => onRemove(index)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
