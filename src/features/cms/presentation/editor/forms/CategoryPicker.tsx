import { useId } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '@/features/categories/application/hooks'

interface CategoryPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
}

/** Checkbox list of catalog categories. Empty selection means "all categories". */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const id = useId()
  const categories = useCategories()

  const toggle = (categoryId: string, checked: boolean) =>
    onChange(checked ? [...value, categoryId] : value.filter((v) => v !== categoryId))

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Categories</legend>
      <p className="text-muted-foreground text-xs">
        {value.length === 0
          ? 'None selected: all categories are shown.'
          : `${value.length} selected.`}
      </p>
      {categories.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-40" />
          ))}
        </div>
      ) : categories.isError ? (
        <p className="text-destructive text-sm">Could not load categories.</p>
      ) : (
        <ul className="space-y-1">
          {(categories.data ?? []).map((category) => {
            const inputId = `${id}-${category.id}`
            return (
              <li key={category.id} className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={inputId}
                  checked={value.includes(category.id)}
                  onCheckedChange={(checked) => toggle(category.id, checked === true)}
                />
                <Label htmlFor={inputId} className="font-normal">
                  {category.name}
                </Label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
