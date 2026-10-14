import { Form } from '@/components/ui/form'

import { promoBannerSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { CtaFields } from './CtaFields'
import { SelectField, TextareaField, TextField } from './fields'
import { ImageField } from './ImageField'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'promo_banner'>
  onChange: (next: Section) => void
}

export function PromoBannerForm({ section, onChange }: Props) {
  const form = useSectionForm(promoBannerSectionSchema, section, onChange)
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <ImageField form={form} name="image" label="Image" />
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />
        <TextareaField form={form} name="body" label="Body" rows={4} />
        <CtaFields form={form} name="cta" legend="Button" />
        <SelectField
          form={form}
          name="imageSide"
          label="Image side"
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
