import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { inputValue, type ProductFormApi } from './model'

interface PricingCardProps {
  form: ProductFormApi
}

export function PricingCard({ form }: PricingCardProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Pricing</CardTitle>
        <CardDescription>Prices are in Philippine pesos and include VAT.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="basePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={inputValue(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="salePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale price</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="Optional"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={inputValue(field.value)}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                  />
                </FormControl>
                {field.value !== null && field.value !== '' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Clear sale price"
                    onClick={() => field.onChange(null)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <FormDescription>Leave empty when the product is not on sale.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
