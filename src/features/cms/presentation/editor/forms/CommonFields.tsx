import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'

import { FieldGroup, SwitchField, TextField } from './fields'

interface CommonFieldsProps<T extends FieldValues> {
  form: UseFormReturn<T>
}

/** `visible` and `anchor` exist on every section type. */
export function CommonFields<T extends FieldValues>({ form }: CommonFieldsProps<T>) {
  return (
    <FieldGroup title="Section settings">
      <SwitchField
        form={form}
        name={'visible' as FieldPath<T>}
        label="Visible"
        description="Hidden sections stay in the draft but are not rendered."
      />
      <TextField
        form={form}
        name={'anchor' as FieldPath<T>}
        label="Anchor id"
        placeholder="shipping"
        description="Optional. Lets links jump here, e.g. /about#shipping."
      />
    </FieldGroup>
  )
}
