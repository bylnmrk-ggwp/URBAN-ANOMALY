import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'

import {
  VALUE_ICONS,
  valuePropsSectionSchema,
  type Section,
  type SectionOf,
} from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { SelectField, SwitchField, TextareaField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'value_props'>
  onChange: (next: Section) => void
}

const ICON_OPTIONS = VALUE_ICONS.map((icon) => ({
  value: icon,
  label: icon.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
}))

export function ValuePropsForm({ section, onChange }: Props) {
  const form = useSectionForm(valuePropsSectionSchema, section, onChange)
  const items = useFieldArray({ control: form.control, name: 'items' })
  const rootError =
    form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message

  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Items</legend>
          <ol className="space-y-3">
            {items.fields.map((item, index) => (
              <li key={item.id} className="bg-muted/40 space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs font-medium">
                    Item {index + 1}
                  </span>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move item ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => items.move(index, index - 1)}
                    >
                      <ChevronUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move item ${index + 1} down`}
                      disabled={index === items.fields.length - 1}
                      onClick={() => items.move(index, index + 1)}
                    >
                      <ChevronDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={items.fields.length <= 1}
                      onClick={() => items.remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <SelectField
                  form={form}
                  name={`items.${index}.icon`}
                  label="Icon"
                  options={ICON_OPTIONS}
                />
                <TextField form={form} name={`items.${index}.title`} label="Title" />
                <TextareaField form={form} name={`items.${index}.body`} label="Body" rows={2} />
              </li>
            ))}
          </ol>
          {typeof rootError === 'string' ? (
            <p className="text-destructive text-sm">{rootError}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={items.fields.length >= 6}
            onClick={() => items.append({ icon: 'sparkles', title: '', body: '' })}
          >
            <Plus aria-hidden="true" />
            Add item
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name="columns"
            label="Columns"
            options={[
              { value: '2', label: '2 columns' },
              { value: '3', label: '3 columns' },
            ]}
            parse={(v) => Number(v)}
          />
        </div>
        <SwitchField form={form} name="bordered" label="Bordered cards" />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
