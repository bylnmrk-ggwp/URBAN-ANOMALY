import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'

import { FieldGroup, TextField } from './fields'

interface CtaFieldsProps<T extends FieldValues> {
  form: UseFormReturn<T>
  /** Path of the `{ label, href }` object, e.g. `primaryCta`. */
  name: FieldPath<T>
  legend: string
  description?: string
}

/** Label + link pair for a call-to-action, registered as two nested form fields. */
export function CtaFields<T extends FieldValues>({
  form,
  name,
  legend,
  description,
}: CtaFieldsProps<T>) {
  return (
    <FieldGroup title={legend}>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      <div className="grid min-w-0 gap-3 *:min-w-0 sm:grid-cols-2">
        <TextField
          form={form}
          name={`${name}.label` as FieldPath<T>}
          label="Label"
          placeholder="Shop now"
        />
        <TextField
          form={form}
          name={`${name}.href` as FieldPath<T>}
          label="Link"
          placeholder="/shop"
          inputClassName="font-mono text-xs"
        />
      </div>
    </FieldGroup>
  )
}
