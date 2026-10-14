import { Plus } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'

import {
  faqSectionSchema,
  newSectionId,
  type Section,
  type SectionOf,
} from '../../../domain/sections'
import { ArrayItemControls } from './ArrayItemControls'
import { CommonFields } from './CommonFields'
import { TextareaField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'faq'>
  onChange: (next: Section) => void
}

const MAX_ITEMS = 20

export function FaqForm({ section, onChange }: Props) {
  const form = useSectionForm(faqSectionSchema, section, onChange)
  const items = useFieldArray({ control: form.control, name: 'items', keyName: 'fieldKey' })
  const rootError =
    form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message

  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Questions</legend>
          <ol className="space-y-3">
            {items.fields.map((item, index) => (
              <li key={item.fieldKey} className="bg-muted/40 space-y-3 rounded-md border p-3">
                <ArrayItemControls
                  noun="question"
                  index={index}
                  count={items.fields.length}
                  minCount={1}
                  onMove={items.move}
                  onRemove={items.remove}
                />
                <TextField form={form} name={`items.${index}.question`} label="Question" />
                <TextareaField
                  form={form}
                  name={`items.${index}.answer`}
                  label="Answer"
                  rows={4}
                  description="Markdown: **bold**, _italic_, [links](/shop), - lists."
                />
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
            disabled={items.fields.length >= MAX_ITEMS}
            onClick={() => items.append({ id: newSectionId(), question: '', answer: '' })}
          >
            <Plus aria-hidden="true" />
            Add question
          </Button>
        </fieldset>

        <CommonFields form={form} />
      </form>
    </Form>
  )
}
