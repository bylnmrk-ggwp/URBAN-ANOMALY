import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { cn } from '@/lib/utils'

import type { ThemeContent } from '../../domain/theme'

export type SegmentedName = 'radius' | 'buttonStyle' | 'sectionSpacing'

interface SegmentedFieldProps<N extends SegmentedName> {
  form: UseFormReturn<ThemeContent>
  name: N
  label: string
  description?: string
  options: ReadonlyArray<{ value: ThemeContent[N]; label: string }>
}

/** Radix RadioGroup styled as a segmented control; keyboard arrows move between options. */
export function SegmentedField<N extends SegmentedName>({
  form,
  name,
  label,
  description,
  options,
}: SegmentedFieldProps<N>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroupPrimitive.Root
              value={field.value}
              onValueChange={field.onChange}
              aria-label={label}
              className="bg-muted inline-flex w-full rounded-md p-[3px]"
            >
              {options.map((option) => (
                <RadioGroupPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'focus-visible:ring-ring/50 flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
                    'text-muted-foreground hover:text-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm',
                  )}
                >
                  {option.label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          </FormControl>
          {description ? (
            <FormDescription className="text-xs">{description}</FormDescription>
          ) : null}
        </FormItem>
      )}
    />
  )
}
