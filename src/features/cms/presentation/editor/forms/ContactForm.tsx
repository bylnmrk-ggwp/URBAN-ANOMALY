import { Form } from '@/components/ui/form'

import { contactSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { TextareaField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'contact'>
  onChange: (next: Section) => void
}

export function ContactForm({ section, onChange }: Props) {
  const form = useSectionForm(contactSectionSchema, section, onChange)
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="title" label="Title" />
        <TextareaField form={form} name="body" label="Body" />
        <TextField form={form} name="email" label="Email" placeholder="hello@example.com" />
        <TextField form={form} name="phone" label="Phone" placeholder="+63 ..." />
        <TextareaField form={form} name="address" label="Address" rows={2} />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
