import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Category } from '@/features/categories/domain/entities'

import type { ProductStatus } from '../../../domain/entities'
import type { ProductFormApi } from './model'

const STATUS_OPTIONS: { value: ProductStatus; label: string; hint: string }[] = [
  { value: 'draft', label: 'Draft', hint: 'Hidden from the storefront.' },
  { value: 'published', label: 'Published', hint: 'Visible and purchasable.' },
  { value: 'archived', label: 'Archived', hint: 'Hidden and retired.' },
]

function isStatus(value: string): value is ProductStatus {
  return STATUS_OPTIONS.some((o) => o.value === value)
}

export function StatusCard({ form }: { form: ProductFormApi }) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <Select value={field.value} onValueChange={(v) => isStatus(v) && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {STATUS_OPTIONS.find((o) => o.value === field.value)?.hint}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isFeatured"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
              <div className="space-y-0.5">
                <FormLabel>Featured</FormLabel>
                <FormDescription className="text-xs">Show on the home page.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

interface OrganizationCardProps {
  form: ProductFormApi
  categories: Category[]
  isLoadingCategories: boolean
}

export function OrganizationCard({ form, categories, isLoadingCategories }: OrganizationCardProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Organization</CardTitle>
        <CardDescription>Products appear in the collection of their category.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingCategories ? 'Loading categories…' : 'Choose a category'
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
