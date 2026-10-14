import { Search, X } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminProducts } from '@/features/products/application/admin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface ProductPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
}

/** Manual product selection for a collection: a searchable dialog with checkboxes. */
export function ProductPicker({ value, onChange }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const id = useId()
  const products = useAdminProducts({ pageSize: 50, search: debounced || undefined, status: 'all' })
  const items = products.data?.items ?? []
  const byId = new Map(items.map((p) => [p.id, p]))

  const toggle = (productId: string, checked: boolean) =>
    onChange(checked ? [...value, productId] : value.filter((v) => v !== productId))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Products</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Choose products
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-muted-foreground text-xs">No products selected yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected products">
          {value.map((productId) => (
            <li
              key={productId}
              className="bg-muted inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs"
            >
              {byId.get(productId)?.name ?? 'Product'}
              <button
                type="button"
                aria-label={`Remove ${byId.get(productId)?.name ?? 'product'}`}
                className="hover:bg-background flex size-5 items-center justify-center rounded-full"
                onClick={() => toggle(productId, false)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose products</DialogTitle>
            <DialogDescription>
              Selected products appear in the order you tick them.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              aria-label="Search products"
              placeholder="Search by name"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {products.isPending ? (
              <div className="space-y-2 py-1" aria-busy="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : products.isError ? (
              <p className="text-destructive py-4 text-sm">Could not load products.</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No products match.</p>
            ) : (
              <ul className="divide-y">
                {items.map((product) => {
                  const inputId = `${id}-${product.id}`
                  return (
                    <li key={product.id} className="flex min-h-11 items-center gap-3 py-1">
                      <Checkbox
                        id={inputId}
                        checked={value.includes(product.id)}
                        onCheckedChange={(checked) => toggle(product.id, checked === true)}
                      />
                      <Label htmlFor={inputId} className="flex-1 font-normal">
                        {product.name}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {product.categoryName}
                        </span>
                      </Label>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
          <DialogFooter>
            <span className="text-muted-foreground mr-auto self-center text-xs">
              {value.length} selected
            </span>
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
