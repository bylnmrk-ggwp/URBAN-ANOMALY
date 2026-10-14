import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductSize } from '@/features/products/domain/entities'
import type { FitPreference } from '@/features/products/domain/sizeRecommendation'
import {
  SIZE_RECOMMENDATION_LIMITS,
  recommendSize,
} from '@/features/products/domain/sizeRecommendation'
import { cn } from '@/lib/utils'

interface SizeRecommenderProps {
  /** When provided, a "Select <size>" button applies the suggestion to the product selection. */
  onSelectSize?: (size: ProductSize) => void
}

const FITS: { value: FitPreference; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'relaxed', label: 'Relaxed' },
]

function parseNumber(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === '' || Number.isNaN(parsed) ? null : parsed
}

export function SizeRecommender({ onSelectSize }: SizeRecommenderProps) {
  const [footLength, setFootLength] = useState('')
  const [fit, setFit] = useState<FitPreference>('regular')

  const footLengthCm = parseNumber(footLength)
  const limits = SIZE_RECOMMENDATION_LIMITS
  const valid =
    footLengthCm !== null &&
    footLengthCm >= limits.footLengthCm.min &&
    footLengthCm <= limits.footLengthCm.max
  const suggestion = valid ? recommendSize({ footLengthCm, fit }) : null

  return (
    <section aria-labelledby="size-recommender-title" className="space-y-4">
      <div>
        <h3 id="size-recommender-title" className="text-sm font-semibold">
          Find my size
        </h3>
        <p className="text-muted-foreground text-xs">
          Stand on paper, mark heel and longest toe, and measure the distance in centimetres.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="size-foot-length">Foot length (cm)</Label>
        <Input
          id="size-foot-length"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={limits.footLengthCm.min}
          max={limits.footLengthCm.max}
          value={footLength}
          onChange={(event) => setFootLength(event.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium" id="fit-label">
          Preferred fit
        </p>
        <div role="radiogroup" aria-labelledby="fit-label" className="flex gap-2">
          {FITS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={fit === option.value}
              onClick={() => setFit(option.value)}
              className={cn(
                'min-h-11 flex-1 rounded-md border px-3 text-sm font-medium transition-colors',
                fit === option.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:border-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="status"
        className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-md p-4"
      >
        {suggestion ? (
          <>
            <p className="text-sm">
              We suggest <span className="font-semibold">{suggestion}</span>
            </p>
            {onSelectSize ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                onClick={() => onSelectSize(suggestion)}
              >
                Select {suggestion}
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Enter your foot length ({limits.footLengthCm.min}–{limits.footLengthCm.max} cm) to see a
            suggestion.
          </p>
        )}
      </div>
    </section>
  )
}
