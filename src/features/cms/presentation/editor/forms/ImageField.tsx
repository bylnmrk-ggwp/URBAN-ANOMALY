import type { FieldPath, FieldValues, PathValue, UseFormReturn } from 'react-hook-form'

import type { ImageRef } from '@/features/cms/domain/common'
import { emptyImage } from '@/features/cms/domain/common'
import { ImagePickerField } from '@/features/cms/presentation/media/ImagePickerField'

interface ImageFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>
  name: FieldPath<T>
  label: string
}

/** Binds the media library picker to an `ImageRef` field. */
export function ImageField<T extends FieldValues>({ form, name, label }: ImageFieldProps<T>) {
  const value = (form.watch(name) as ImageRef | undefined) ?? emptyImage
  const error = form.getFieldState(name, form.formState).error
  return (
    <div className="space-y-1.5">
      <ImagePickerField
        value={value}
        label={label}
        onChange={(ref) =>
          form.setValue(name, ref as PathValue<T, FieldPath<T>>, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      {error?.message ? <p className="text-destructive text-sm">{error.message}</p> : null}
    </div>
  )
}
