import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import type { ProductFormApi } from './model'

interface ColorsEditorProps {
  form: ProductFormApi
}

export function ColorsEditor({ form }: ColorsEditorProps) {
  const colors = useFieldArray({ control: form.control, name: 'colors' })
  const rootError =
    form.formState.errors.colors?.root?.message ?? form.formState.errors.colors?.message

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Colors</legend>
      {colors.fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">No colors added.</p>
      ) : (
        <ul className="space-y-3">
          {colors.fields.map((item, index) => (
            <li key={item.id} className="flex items-end gap-2">
              <FormField
                control={form.control}
                name={`colors.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sand" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`colors.${index}.hex`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Hex</FormLabel>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        aria-label={`Pick color ${index + 1}`}
                        value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#000000'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="size-9 cursor-pointer rounded-md border bg-transparent p-0.5"
                      />
                      <FormControl>
                        <Input
                          placeholder="#000000"
                          className="w-28 font-mono text-xs uppercase"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove color ${index + 1}`}
                onClick={() => colors.remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {typeof rootError === 'string' ? (
        <p className="text-destructive text-sm">{rootError}</p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => colors.append({ name: '', hex: '#111111' })}
      >
        <Plus aria-hidden="true" />
        Add color
      </Button>
    </fieldset>
  )
}
