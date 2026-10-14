import { Plus } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { emptyImage, type ImageRef } from '@/features/cms/domain/common'
import { ImagePickerField } from '@/features/cms/presentation/media/ImagePickerField'

import { gallerySectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { ArrayItemControls } from './ArrayItemControls'
import { CommonFields } from './CommonFields'
import { SelectField, SwitchField, TextField } from './fields'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'gallery'>
  onChange: (next: Section) => void
}

const MIN_IMAGES = 2
const MAX_IMAGES = 12

export function GalleryForm({ section, onChange }: Props) {
  const form = useSectionForm(gallerySectionSchema, section, onChange)
  const images = useFieldArray({ control: form.control, name: 'images', keyName: 'fieldKey' })
  const rootError =
    form.formState.errors.images?.root?.message ?? form.formState.errors.images?.message

  const setImageRef = (index: number, ref: ImageRef) => {
    const current = form.getValues(`images.${index}`)
    form.setValue(
      `images.${index}`,
      { ...ref, caption: current?.caption ?? '' },
      { shouldDirty: true, shouldValidate: true },
    )
  }

  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" />
        <TextField form={form} name="title" label="Title" />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Images</legend>
          <ol className="space-y-3">
            {images.fields.map((item, index) => {
              const value = form.watch(`images.${index}`)
              const ref: ImageRef = value
                ? { mediaId: value.mediaId, url: value.url, alt: value.alt }
                : emptyImage
              const urlError = form.getFieldState(`images.${index}.url`, form.formState).error
              return (
                <li key={item.fieldKey} className="bg-muted/40 space-y-3 rounded-md border p-3">
                  <ArrayItemControls
                    noun="image"
                    index={index}
                    count={images.fields.length}
                    minCount={MIN_IMAGES}
                    onMove={images.move}
                    onRemove={images.remove}
                  />
                  <ImagePickerField
                    label="Image"
                    value={ref}
                    onChange={(next) => setImageRef(index, next)}
                  />
                  {urlError?.message ? (
                    <p className="text-destructive text-sm">{urlError.message}</p>
                  ) : null}
                  <TextField form={form} name={`images.${index}.caption`} label="Caption" />
                </li>
              )
            })}
          </ol>
          {typeof rootError === 'string' ? (
            <p className="text-destructive text-sm">{rootError}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={images.fields.length >= MAX_IMAGES}
            onClick={() => images.append({ ...emptyImage, caption: '' })}
          >
            <Plus aria-hidden="true" />
            Add image
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name="layout"
            label="Layout"
            options={[
              { value: 'grid', label: 'Grid (square tiles)' },
              { value: 'columns', label: 'Columns (natural height)' },
            ]}
          />
        </div>
        <SwitchField
          form={form}
          name="showCaptions"
          label="Show captions"
          description="Captions always appear in the lightbox."
        />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
