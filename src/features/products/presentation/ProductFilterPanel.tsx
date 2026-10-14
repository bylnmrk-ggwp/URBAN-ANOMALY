import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Category } from '@/features/categories/domain/entities'
import type { ProductColor, ProductSize } from '@/features/products/domain/entities'
import { PRODUCT_SIZES } from '@/features/products/domain/entities'

export interface ProductFilterValues {
  categorySlug: string | null
  sizes: ProductSize[]
  colors: string[]
  minPrice: number | null
  maxPrice: number | null
}

export interface ProductFilterPanelProps {
  value: ProductFilterValues
  onChange: (patch: Partial<ProductFilterValues>) => void
  onClear: () => void
  categories: Category[]
  availableColors: ProductColor[]
  /** Hide the category list when the page itself represents a collection. */
  lockCategory?: boolean
  activeCount: number
}

const ALL_CATEGORIES = '__all__'
const PRICE_STEP = 500

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]
}

function parsePrice(raw: string): number | null {
  if (raw.trim() === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border border-t py-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-3 text-sm font-semibold">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

export function ProductFilterPanel({
  value,
  onChange,
  onClear,
  categories,
  availableColors,
  lockCategory = false,
  activeCount,
}: ProductFilterPanelProps) {
  const id = useId()
  const [minDraft, setMinDraft] = useState(value.minPrice?.toString() ?? '')
  const [maxDraft, setMaxDraft] = useState(value.maxPrice?.toString() ?? '')
  // Re-sync drafts when the applied filter changes from outside (URL, clear all).
  const [applied, setApplied] = useState({ min: value.minPrice, max: value.maxPrice })
  if (applied.min !== value.minPrice || applied.max !== value.maxPrice) {
    setApplied({ min: value.minPrice, max: value.maxPrice })
    setMinDraft(value.minPrice?.toString() ?? '')
    setMaxDraft(value.maxPrice?.toString() ?? '')
  }

  const commitPrices = () => {
    const minPrice = parsePrice(minDraft)
    const maxPrice = parsePrice(maxDraft)
    if (minPrice !== value.minPrice || maxPrice !== value.maxPrice) onChange({ minPrice, maxPrice })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {activeCount > 0 ? `${activeCount} active` : 'No filters applied'}
        </p>
        <Button variant="link" size="sm" onClick={onClear} disabled={activeCount === 0}>
          Clear all
        </Button>
      </div>

      {!lockCategory ? (
        <FilterSection title="Category">
          <RadioGroup
            value={value.categorySlug ?? ALL_CATEGORIES}
            onValueChange={(next) =>
              onChange({ categorySlug: next === ALL_CATEGORIES ? null : next })
            }
          >
            <div className="flex min-h-9 items-center gap-3">
              <RadioGroupItem value={ALL_CATEGORIES} id={`${id}-cat-all`} />
              <Label htmlFor={`${id}-cat-all`} className="font-normal">
                All products
              </Label>
            </div>
            {categories.map((category) => (
              <div key={category.id} className="flex min-h-9 items-center gap-3">
                <RadioGroupItem value={category.slug} id={`${id}-cat-${category.slug}`} />
                <Label htmlFor={`${id}-cat-${category.slug}`} className="font-normal">
                  {category.name}
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({category.productCount})
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FilterSection>
      ) : null}

      <FilterSection title="Size">
        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_SIZES.map((size) => (
            <div key={size} className="flex min-h-9 items-center gap-2">
              <Checkbox
                id={`${id}-size-${size}`}
                checked={value.sizes.includes(size)}
                onCheckedChange={() => onChange({ sizes: toggle(value.sizes, size) })}
              />
              <Label htmlFor={`${id}-size-${size}`} className="font-normal">
                {size}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Color">
        {availableColors.length === 0 ? (
          <p className="text-muted-foreground text-sm">Colors appear once products load.</p>
        ) : (
          <div className="space-y-1">
            {availableColors.map((color) => (
              <div key={color.name} className="flex min-h-9 items-center gap-3">
                <Checkbox
                  id={`${id}-color-${color.name}`}
                  checked={value.colors.includes(color.name)}
                  onCheckedChange={() => onChange({ colors: toggle(value.colors, color.name) })}
                />
                <Label
                  htmlFor={`${id}-color-${color.name}`}
                  className="flex items-center gap-2 font-normal"
                >
                  <span
                    className="border-border size-3.5 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  {color.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </FilterSection>

      <FilterSection title="Price (₱)">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-min`} className="text-muted-foreground text-xs font-normal">
              Min
            </Label>
            <Input
              id={`${id}-min`}
              type="number"
              inputMode="numeric"
              min={0}
              step={PRICE_STEP}
              placeholder="0"
              value={minDraft}
              onChange={(event) => setMinDraft(event.target.value)}
              onBlur={commitPrices}
              onKeyDown={(event) => event.key === 'Enter' && commitPrices()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-max`} className="text-muted-foreground text-xs font-normal">
              Max
            </Label>
            <Input
              id={`${id}-max`}
              type="number"
              inputMode="numeric"
              min={0}
              step={PRICE_STEP}
              placeholder="Any"
              value={maxDraft}
              onChange={(event) => setMaxDraft(event.target.value)}
              onBlur={commitPrices}
              onKeyDown={(event) => event.key === 'Enter' && commitPrices()}
            />
          </div>
        </div>
      </FilterSection>
    </div>
  )
}
