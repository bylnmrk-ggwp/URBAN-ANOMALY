import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import { ProductFilterPanel, type ProductFilterPanelProps } from './ProductFilterPanel'

export type { ProductFilterValues } from './ProductFilterPanel'

interface ProductFiltersProps extends ProductFilterPanelProps {
  /** `sidebar` renders inline (use on lg+); `sheet` renders a trigger button that opens a drawer. */
  variant: 'sidebar' | 'sheet'
  className?: string
}

export function ProductFilters({ variant, className, ...panelProps }: ProductFiltersProps) {
  const [open, setOpen] = useState(false)

  if (variant === 'sidebar') {
    return (
      <aside aria-label="Product filters" className={cn('w-full', className)}>
        <ProductFilterPanel {...panelProps} />
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn('min-h-11', className)}>
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {panelProps.activeCount > 0 ? (
            <span className="bg-foreground text-background ml-1 inline-flex size-5 items-center justify-center rounded-full text-[11px]">
              {panelProps.activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the catalogue by category, size, color and price.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ProductFilterPanel {...panelProps} />
        </div>
        <div className="border-t p-4">
          <Button className="min-h-11 w-full" onClick={() => setOpen(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
