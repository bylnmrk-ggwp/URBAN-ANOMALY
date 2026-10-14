import { Form } from '@/components/ui/form'

import { categoryTilesSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { CategoryPicker } from './CategoryPicker'
import { CommonFields } from './CommonFields'
import { NumberField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'category_tiles'>
  onChange: (next: Section) => void
}

export function CategoryTilesForm({ section, onChange }: Props) {
  const form = useSectionForm(categoryTilesSectionSchema, section, onChange)
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />
        <CategoryPicker
          value={form.watch('categoryIds')}
          onChange={(ids) =>
            form.setValue('categoryIds', ids, { shouldDirty: true, shouldValidate: true })
          }
        />
        <NumberField form={form} name="limit" label="Maximum tiles" min={1} max={12} />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
