import { Form } from '@/components/ui/form'

import { richTextSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { CtaFields } from './CtaFields'
import { SelectField, SwitchField, TextareaField, TextField } from './fields'
import { ImageField } from './ImageField'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'rich_text'>
  onChange: (next: Section) => void
}

export function RichTextForm({ section, onChange }: Props) {
  const form = useSectionForm(richTextSectionSchema, section, onChange)
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Heading" />
        <TextareaField form={form} name="description" label="Intro" rows={2} />
        <TextareaField
          form={form}
          name="body"
          label="Body"
          rows={10}
          description="Markdown: # headings, **bold**, _italic_, [links](https://…), - lists."
        />
        <ImageField form={form} name="image" label="Side image (optional)" />
        <CtaFields
          form={form}
          name="cta"
          legend="Button"
          description="Leave the label empty to hide it."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name="width"
            label="Width"
            options={[
              { value: 'narrow', label: 'Narrow' },
              { value: 'wide', label: 'Wide' },
            ]}
          />
          <SelectField
            form={form}
            name="background"
            label="Background"
            options={[
              { value: 'none', label: 'None' },
              { value: 'muted', label: 'Muted' },
            ]}
          />
        </div>
        <SwitchField
          form={form}
          name="showSizeGuide"
          label="Show size guide"
          description="Appends the size guide table below the body."
        />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
