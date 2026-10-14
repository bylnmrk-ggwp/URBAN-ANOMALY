import { Form } from '@/components/ui/form'

import {
  productCollectionSectionSchema,
  type Section,
  type SectionOf,
} from '../../../domain/sections'
import { CommonFields } from './CommonFields'
import { NumberField, SelectField, TextField } from './fields'
import { ProductPicker } from './ProductPicker'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'product_collection'>
  onChange: (next: Section) => void
}

export function ProductCollectionForm({ section, onChange }: Props) {
  const form = useSectionForm(productCollectionSectionSchema, section, onChange)
  const source = form.watch('source')
  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />
        <SelectField
          form={form}
          name="source"
          label="Source"
          options={[
            { value: 'new_arrivals', label: 'New arrivals' },
            { value: 'best_sellers', label: 'Best sellers' },
            { value: 'featured', label: 'Featured products' },
            { value: 'manual', label: 'Pick manually' },
          ]}
        />
        {source === 'manual' ? (
          <ProductPicker
            value={form.watch('productIds')}
            onChange={(ids) =>
              form.setValue('productIds', ids, { shouldDirty: true, shouldValidate: true })
            }
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField form={form} name="limit" label="Limit" min={1} max={24} />
          <TextField
            form={form}
            name="viewAllHref"
            label="“View all” link"
            placeholder="/shop"
            description="Leave empty to hide the link."
          />
        </div>
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
