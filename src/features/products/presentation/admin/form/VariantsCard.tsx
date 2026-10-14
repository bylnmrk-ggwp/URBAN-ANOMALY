import { RefreshCw } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import { PRODUCT_SIZES, type ProductSize } from '../../../domain/entities'
import { ColorsEditor } from './ColorsEditor'
import { buildVariantRows, type ProductFormApi } from './model'
import { VariantRows } from './VariantRows'

interface VariantsCardProps {
  form: ProductFormApi
}

export function VariantsCard({ form }: VariantsCardProps) {
  const variants = useFieldArray({ control: form.control, name: 'variants', keyName: 'fieldId' })
  const sizes = form.watch('sizes')
  const colors = form.watch('colors')
  const name = form.watch('name')

  const validColors = colors.filter((c) => c.name.trim().length > 0)
  const expected = sizes.length * validColors.length
  const canGenerate = expected > 0
  const variantsError =
    form.formState.errors.variants?.root?.message ?? form.formState.errors.variants?.message

  const generate = () => {
    const rows = buildVariantRows(name, sizes, validColors, form.getValues('variants'))
    variants.replace(rows)
    void form.trigger('variants')
  }

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Variants</CardTitle>
        <CardDescription>
          Pick sizes and colors, then generate the variant matrix to set SKUs and stock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormField
          control={form.control}
          name="sizes"
          render={({ field }) => (
            <FormItem>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Sizes</legend>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SIZES.map((size) => {
                    const checked = field.value.includes(size)
                    const id = `size-${size}`
                    return (
                      <Label
                        key={size}
                        htmlFor={id}
                        className="has-data-[state=checked]:border-primary flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(next) => {
                            const nextSizes: ProductSize[] = next
                              ? PRODUCT_SIZES.filter((s) => s === size || field.value.includes(s))
                              : field.value.filter((s) => s !== size)
                            field.onChange(nextSizes)
                          }}
                        />
                        {size}
                      </Label>
                    )
                  })}
                </div>
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <ColorsEditor form={form} />

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {sizes.length} {sizes.length === 1 ? 'size' : 'sizes'} × {validColors.length}{' '}
            {validColors.length === 1 ? 'color' : 'colors'} ={' '}
            <span className="text-foreground font-medium">{expected}</span>{' '}
            {expected === 1 ? 'variant' : 'variants'}
            {variants.fields.length > 0 && variants.fields.length !== expected
              ? ` (${variants.fields.length} currently listed)`
              : ''}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={!canGenerate}
          >
            <RefreshCw aria-hidden="true" />
            {variants.fields.length > 0 ? 'Regenerate variants' : 'Generate variants'}
          </Button>
        </div>

        {typeof variantsError === 'string' ? (
          <p className="text-destructive text-sm">{variantsError}</p>
        ) : null}

        {variants.fields.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            No variants yet. Select sizes and colors, then generate.
          </p>
        ) : (
          <VariantRows form={form} fields={variants.fields} />
        )}
      </CardContent>
    </Card>
  )
}
