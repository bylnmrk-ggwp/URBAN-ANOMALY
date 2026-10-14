import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import type { ThemeContent } from '../../domain/theme'

export type ColorName = `colors.${keyof ThemeContent['colors']}`

interface ColorFieldProps {
  form: UseFormReturn<ThemeContent>
  name: ColorName
  label: string
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Native colour picker and hex text input bound to the same field. */
export function ColorField({ form, name, label }: ColorFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === 'string' ? field.value : ''
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${label} colour picker`}
                value={HEX.test(value) ? value.toLowerCase() : '#000000'}
                onChange={(e) => field.onChange(e.target.value)}
                className="border-input size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
              />
              <FormControl>
                <Input
                  {...field}
                  value={value}
                  spellCheck={false}
                  maxLength={7}
                  className="font-mono uppercase"
                  placeholder="#5c7454"
                  onChange={(e) => field.onChange(e.target.value.trim())}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
