import { Form } from '@/components/ui/form'

import { newsletterSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { TextareaField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'newsletter'>
  onChange: (next: Section) => void
}

export function NewsletterForm({ section, onChange }: Props) {
  const form = useSectionForm(newsletterSectionSchema, section, onChange)
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="title" label="Title" />
        <TextareaField form={form} name="body" label="Body" />
        <TextField form={form} name="buttonLabel" label="Button label" placeholder="Subscribe" />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
