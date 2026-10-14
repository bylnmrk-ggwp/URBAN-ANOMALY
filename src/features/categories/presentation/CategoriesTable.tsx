import { FolderOpen, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import { pluralize } from '@/lib/format'

import type { Category } from '../domain/entities'

interface CategoriesTableProps {
  categories: Category[]
  isLoading: boolean
  emptyState: ReactNode
  onEdit: (category: Category) => void
  onRemove: (category: Category) => void
}

function Thumb({ category }: { category: Category }) {
  if (!category.imageUrl) {
    return (
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
        <FolderOpen className="size-4" aria-hidden="true" />
      </span>
    )
  }
  return (
    <ProductImage
      src={category.imageUrl}
      alt={category.name}
      aspect="square"
      className="size-10 rounded-md"
    />
  )
}

function RowActions({
  category,
  onEdit,
  onRemove,
}: Pick<CategoriesTableProps, 'onEdit' | 'onRemove'> & { category: Category }) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${category.name}`}
        onClick={() => onEdit(category)}
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={`Remove ${category.name}`}
        onClick={() => onRemove(category)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}

export function CategoriesTable({
  categories,
  isLoading,
  emptyState,
  onEdit,
  onRemove,
}: CategoriesTableProps) {
  const columns: DataTableColumn<Category>[] = [
    {
      key: 'image',
      header: <span className="sr-only">Image</span>,
      className: 'w-14',
      cell: (c) => <Thumb category={c} />,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-muted-foreground font-mono text-xs">{c.slug}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (c) => (
        <p className="text-muted-foreground max-w-md truncate">{c.description || '—'}</p>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'count',
      header: 'Products',
      align: 'right',
      cell: (c) => <span className="tabular-nums">{c.productCount}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      className: 'w-24',
      cell: (c) => <RowActions category={c} onEdit={onEdit} onRemove={onRemove} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={categories}
      rowKey={(c) => c.id}
      isLoading={isLoading}
      skeletonRows={5}
      emptyState={emptyState}
      caption="Categories"
      mobileCard={(c) => (
        <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
          <Thumb category={c} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="text-muted-foreground text-xs">
              {c.slug} · {pluralize(c.productCount, 'product')}
            </p>
          </div>
          <RowActions category={c} onEdit={onEdit} onRemove={onRemove} />
        </div>
      )}
    />
  )
}
