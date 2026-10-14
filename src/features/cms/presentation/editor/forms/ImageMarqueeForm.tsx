import { Plus } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { emptyImage } from '@/features/cms/domain/common'

import { imageMarqueeSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { ArrayItemControls } from './ArrayItemControls'
import { CommonFields } from './CommonFields'
import { NumberField, SelectField, SwitchField } from './fields'
import { ImageField } from './ImageField'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'image_marquee'>
  onChange: (next: Section) => void
}

const MIN_IMAGES = 2
const MAX_IMAGES = 16

export function ImageMarqueeForm({ section, onChange }: Props) {
  const form = useSectionForm(imageMarqueeSectionSchema, section, onChange)
  const images = useFieldArray({ control: form.control, name: 'images', keyName: 'fieldKey' })
  const schemaError =
    form.formState.errors.images?.root?.message ?? form.formState.errors.images?.message
  // The schema's default "Too small" wording is replaced with the rule the admin can act on.
  const rootError =
    images.fields.length < MIN_IMAGES ? `Add at least ${MIN_IMAGES} images.` : schemaError
  const atCap = images.fields.length >= MAX_IMAGES

  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Images</legend>
          <p className="text-muted-foreground text-xs">
            Between {MIN_IMAGES} and {MAX_IMAGES} photos. They repeat endlessly in this order.
          </p>
          <ol className="space-y-3">
            {images.fields.map((item, index) => (
              <li
                key={item.fieldKey}
                className="bg-muted/40 min-w-0 space-y-3 rounded-md border p-3"
              >
                <ArrayItemControls
                  noun="image"
                  index={index}
                  count={images.fields.length}
                  // Allow removing below the minimum so the schema error explains the rule.
                  minCount={1}
                  onMove={images.move}
                  onRemove={images.remove}
                />
                <ImageField form={form} name={`images.${index}`} label="Image" />
              </li>
            ))}
          </ol>
          {typeof rootError === 'string' ? (
            <p className="text-destructive text-sm" role="alert">
              {rootError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atCap}
              onClick={() => images.append({ ...emptyImage })}
            >
              <Plus aria-hidden="true" />
              Add image
            </Button>
            {atCap ? (
              <span className="text-muted-foreground text-xs">Maximum of {MAX_IMAGES} images.</span>
            ) : null}
          </div>
        </fieldset>

        <div className="grid min-w-0 gap-4 *:min-w-0 sm:grid-cols-2">
          <NumberField
            form={form}
            name="speed"
            label="Speed"
            min={10}
            max={120}
            description="Seconds per loop; lower is faster."
          />
          <SelectField
            form={form}
            name="tileHeight"
            label="Tile height"
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ]}
          />
        </div>
        <SwitchField
          form={form}
          name="pauseOnHover"
          label="Pause on hover"
          description="Stops the strip while the pointer is over it."
        />
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
