import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { UseFormReturn } from 'react-hook-form'

import { BrandWordmark } from '@/components/layout/BrandMark'
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { cn } from '@/lib/utils'

import {
  seasonColors,
  seasonSwatches,
  THEME_SEASON_DEFINITIONS,
  THEME_SEASONS,
  type ThemeContent,
} from '../../domain/theme'

/**
 * Season picker: one card per logo variant, showing its artwork and the palette that ships with
 * it. Choosing a season rewrites the seven colour fields to that season's palette, so the
 * preview, the colour inputs and the published site all move together; the merchant can still
 * hand-edit a colour afterwards.
 */
export function SeasonField({ form }: { form: UseFormReturn<ThemeContent> }) {
  return (
    <FormField
      control={form.control}
      name="season"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Logo and palette</FormLabel>
          <FormControl>
            <RadioGroupPrimitive.Root
              value={field.value}
              onValueChange={(value) => {
                const season = value as ThemeContent['season']
                form.setValue('season', season, { shouldDirty: true })
                form.setValue('colors', seasonColors(season), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
              aria-label="Seasonal logo"
              className="grid gap-3 sm:grid-cols-3"
            >
              {THEME_SEASONS.map((season) => {
                const definition = THEME_SEASON_DEFINITIONS[season]
                return (
                  <RadioGroupPrimitive.Item
                    key={season}
                    value={season}
                    aria-label={definition.label}
                    className={cn(
                      'border-input focus-visible:ring-ring/50 flex flex-col items-start gap-3 rounded-md border p-3 text-left transition-colors outline-none focus-visible:ring-[3px]',
                      'hover:bg-accent/40 data-[state=checked]:border-primary data-[state=checked]:bg-accent/30',
                    )}
                  >
                    <span
                      className="flex h-12 w-full items-center justify-center rounded-sm"
                      style={{ background: definition.light['--muted'] }}
                    >
                      <BrandWordmark alt="" season={season} className="max-w-full" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">{definition.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {definition.blurb}
                      </span>
                    </span>
                    <span className="flex gap-1" aria-hidden="true">
                      {seasonSwatches(season).map((hex) => (
                        <span
                          key={hex}
                          title={hex}
                          className="border-border size-4 rounded-full border"
                          style={{ background: hex }}
                        />
                      ))}
                    </span>
                  </RadioGroupPrimitive.Item>
                )
              })}
            </RadioGroupPrimitive.Root>
          </FormControl>
          <FormDescription className="text-xs">
            Each season ships its own artwork and colours. Publish to apply them site-wide.
          </FormDescription>
        </FormItem>
      )}
    />
  )
}
