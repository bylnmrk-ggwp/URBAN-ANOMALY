import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import type { NavigationContent } from '../../domain/navigation'
import { LinkListField } from './LinkListField'
import { newNavId } from './navIds'

const MAX_COLUMNS = 4

export function FooterColumnsField({ form }: { form: UseFormReturn<NavigationContent> }) {
  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: 'footerColumns',
    keyName: 'fieldKey',
  })

  return (
    <div className="space-y-4">
      {fields.map((column, index) => (
        <fieldset key={column.fieldKey} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <FormField
              control={form.control}
              name={`footerColumns.${index}.title`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Column {index + 1} title</FormLabel>
                  <FormControl>
                    <Input placeholder="Help" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-6 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move column ${index + 1} up`}
                disabled={index === 0}
                onClick={() => swap(index, index - 1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move column ${index + 1} down`}
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
                aria-label={`Remove column ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
          <LinkListField
            form={form}
            name={`footerColumns.${index}.links`}
            label={`Column ${index + 1} link`}
            max={12}
          />
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= MAX_COLUMNS}
        onClick={() => append({ id: newNavId('footer'), title: '', links: [] })}
      >
        <Plus aria-hidden="true" />
        Add column
      </Button>
    </div>
  )
}
