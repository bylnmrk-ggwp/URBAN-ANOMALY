import { Plus } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { emptyImage } from '@/features/cms/domain/common'

import { heroSectionSchema, type Section, type SectionOf } from '../../../domain/sections'
import { ArrayItemControls } from './ArrayItemControls'
import { CommonFields } from './CommonFields'
import { CtaFields } from './CtaFields'
import { FieldGroup, NumberField, SelectField, TextareaField, TextField } from './fields'
import { ImageField } from './ImageField'
import { useSectionForm } from './useSectionForm'

interface Props {
  section: SectionOf<'hero'>
  onChange: (next: Section) => void
}

const MAX_SLIDES = 5

export function HeroForm({ section, onChange }: Props) {
  const form = useSectionForm(heroSectionSchema, section, onChange)
  const slides = useFieldArray({ control: form.control, name: 'slides', keyName: 'fieldKey' })
  const slidesError =
    form.formState.errors.slides?.root?.message ?? form.formState.errors.slides?.message
  const atCap = slides.fields.length >= MAX_SLIDES

  return (
    <Form {...form}>
      <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <TextField form={form} name="eyebrow" label="Eyebrow" placeholder="New Season" />
        <TextField form={form} name="title" label="Headline" />
        <TextareaField form={form} name="subtitle" label="Subtitle" />
        <ImageField form={form} name="image" label="Background image" />

        <FieldGroup title="Slideshow">
          <p className="text-muted-foreground text-xs">
            The main image above is always slide 1. Add more slides to turn the hero into a
            slideshow.
          </p>
          <NumberField
            form={form}
            name="autoplaySeconds"
            label="Autoplay (seconds)"
            min={0}
            max={30}
            description="Time each slide stays on screen. 0 turns autoplay off."
          />
          <ol className="space-y-3">
            {slides.fields.map((item, index) => (
              <li
                key={item.fieldKey}
                className="bg-muted/40 min-w-0 space-y-3 rounded-md border p-3"
              >
                <ArrayItemControls
                  noun="slide"
                  index={index}
                  count={slides.fields.length}
                  minCount={0}
                  onMove={slides.move}
                  onRemove={slides.remove}
                  labelOffset={1}
                />
                <ImageField form={form} name={`slides.${index}.image`} label="Image" />
                <TextField form={form} name={`slides.${index}.eyebrow`} label="Eyebrow" />
                <TextField form={form} name={`slides.${index}.title`} label="Headline" />
                <TextareaField form={form} name={`slides.${index}.subtitle`} label="Subtitle" />
                <CtaFields
                  form={form}
                  name={`slides.${index}.cta`}
                  legend="Button"
                  description="Leave the label empty to hide it."
                />
              </li>
            ))}
          </ol>
          {typeof slidesError === 'string' ? (
            <p className="text-destructive text-sm">{slidesError}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atCap}
              onClick={() =>
                slides.append({
                  image: { ...emptyImage },
                  eyebrow: '',
                  title: '',
                  subtitle: '',
                  cta: { label: '', href: '' },
                })
              }
            >
              <Plus aria-hidden="true" />
              Add slide
            </Button>
            <span className="text-muted-foreground text-xs">
              {atCap
                ? `Maximum of ${MAX_SLIDES} extra slides.`
                : `Up to ${MAX_SLIDES} extra slides.`}
            </span>
          </div>
        </FieldGroup>

        <CtaFields form={form} name="primaryCta" legend="Primary button" />
        <CtaFields
          form={form}
          name="secondaryCta"
          legend="Secondary button"
          description="Leave the label empty to hide it."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name="align"
            label="Text alignment"
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
            ]}
          />
          <SelectField
            form={form}
            name="height"
            label="Height"
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'default', label: 'Default' },
              { value: 'tall', label: 'Tall' },
            ]}
          />
        </div>
        <CommonFields form={form} />
      </form>
    </Form>
  )
}
