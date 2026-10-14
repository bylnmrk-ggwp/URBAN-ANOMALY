import type { FieldArrayWithId } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductFormInput } from '@/features/products/domain/schema'

import { inputValue, type ProductFormApi } from './model'

type VariantField = FieldArrayWithId<ProductFormInput, 'variants', 'fieldId'>

interface VariantRowsProps {
  form: ProductFormApi
  fields: VariantField[]
}

function ColorChip({ name, hex }: { name: string; hex: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-3 shrink-0 rounded-full border"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      {name}
    </span>
  )
}

function NumberField({
  form,
  name,
  label,
  showLabel,
}: {
  form: ProductFormApi
  name: `variants.${number}.stock` | `variants.${number}.lowStockThreshold`
  label: string
  showLabel: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className={showLabel ? 'text-xs' : 'sr-only'}>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="h-8 w-24 text-sm tabular-nums"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={inputValue(field.value)}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

function SkuField({
  form,
  index,
  showLabel,
}: {
  form: ProductFormApi
  index: number
  showLabel: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={`variants.${index}.sku`}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className={showLabel ? 'text-xs' : 'sr-only'}>SKU</FormLabel>
          <FormControl>
            <Input className="h-8 font-mono text-xs uppercase" {...field} />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

export function VariantRows({ form, fields }: VariantRowsProps) {
  return (
    <>
      {/* Desktop: dense table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase">Size</TableHead>
              <TableHead className="text-xs uppercase">Color</TableHead>
              <TableHead className="text-xs uppercase">SKU</TableHead>
              <TableHead className="text-xs uppercase">Stock</TableHead>
              <TableHead className="text-xs uppercase">Low stock at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((variant, index) => (
              <TableRow key={variant.fieldId} className="hover:bg-transparent">
                <TableCell className="font-medium">{variant.size}</TableCell>
                <TableCell>
                  <ColorChip name={variant.color.name} hex={variant.color.hex} />
                </TableCell>
                <TableCell className="min-w-44">
                  <SkuField form={form} index={index} showLabel={false} />
                </TableCell>
                <TableCell>
                  <NumberField
                    form={form}
                    name={`variants.${index}.stock`}
                    label="Stock"
                    showLabel={false}
                  />
                </TableCell>
                <TableCell>
                  <NumberField
                    form={form}
                    name={`variants.${index}.lowStockThreshold`}
                    label="Low stock threshold"
                    showLabel={false}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {fields.map((variant, index) => (
          <li key={variant.fieldId} className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {variant.size} · <ColorChip name={variant.color.name} hex={variant.color.hex} />
            </p>
            <SkuField form={form} index={index} showLabel />
            <div className="flex gap-3">
              <NumberField form={form} name={`variants.${index}.stock`} label="Stock" showLabel />
              <NumberField
                form={form}
                name={`variants.${index}.lowStockThreshold`}
                label="Low stock at"
                showLabel
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
