import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type ArrayPath, type FieldPath, type UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import type { NavigationContent, NavLink } from '../../domain/navigation'
import { newNavId } from './navIds'

/** Field-array paths that hold `NavLink[]`. */
export type LinkListName = 'primaryLinks' | 'secondaryLinks' | `footerColumns.${number}.links`

interface LinkListFieldProps {
  form: UseFormReturn<NavigationContent>
  name: LinkListName
  /** Read by screen readers for the list and the add button ("Add primary link"). */
  label: string
  max: number
}

export function LinkListField({ form, name, label, max }: LinkListFieldProps) {
  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: name as ArrayPath<NavigationContent>,
    keyName: 'fieldKey',
  })
  const path = (index: number, key: keyof NavLink) =>
    `${name}.${index}.${key}` as FieldPath<NavigationContent>

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
          No links yet.
        </p>
      ) : (
        <ul className="space-y-3" aria-label={label}>
          {fields.map((field, index) => (
            <li key={field.fieldKey} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <FormField
                control={form.control}
                name={path(index, 'label')}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Label for link {index + 1}</FormLabel>
                    <FormControl>
                      <Input placeholder="Label" {...f} value={String(f.value ?? '')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={path(index, 'href')}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Link {index + 1} destination</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/shop or https://…"
                        {...f}
                        value={String(f.value ?? '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-start gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move link ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => swap(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move link ${index + 1} down`}
                  disabled={index === fields.length - 1}
                  onClick={() => swap(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove link ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= max}
        onClick={() => append({ id: newNavId(), label: '', href: '/' })}
      >
        <Plus aria-hidden="true" />
        Add {label.toLowerCase()}
      </Button>
    </div>
  )
}
