import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  /**
   * Hide the column on viewports narrower than the given breakpoint. The admin sidebar takes
   * 16rem from `lg`, so admin content is narrower at 1024 than at 768: wide columns want `xl`.
   */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
  /** When set, the header becomes a sort button reporting this key via `onSort`. */
  sortKey?: string
  align?: 'left' | 'right'
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  skeletonRows?: number
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
  /** Renders stacked cards instead of a scrolling table below the `md` breakpoint. */
  mobileCard?: (row: T) => ReactNode
  sort?: { key: string; direction: SortDirection }
  onSort?: (key: string) => void
  caption?: string
  className?: string
}

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  skeletonRows = 5,
  emptyState,
  onRowClick,
  mobileCard,
  sort,
  onSort,
  caption,
  className,
}: DataTableProps<T>) {
  const isEmpty = !isLoading && rows.length === 0

  if (isEmpty && emptyState) return <>{emptyState}</>

  return (
    <div className={className}>
      {mobileCard ? (
        <div className="space-y-3 md:hidden">
          {isLoading
            ? Array.from({ length: Math.min(skeletonRows, 3) }, (_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))
            : rows.map((row) => <div key={rowKey(row)}>{mobileCard(row)}</div>)}
        </div>
      ) : null}

      <div className={cn('overflow-x-auto rounded-lg border', mobileCard && 'hidden md:block')}>
        <Table className="text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.hideBelow && hideClasses[column.hideBelow])}
                      >
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          'align-middle',
                          column.align === 'right' && 'text-right',
                          column.hideBelow && hideClasses[column.hideBelow],
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function HeaderCell<T>({
  column,
  sort,
  onSort,
}: {
  column: DataTableColumn<T>
  sort?: { key: string; direction: SortDirection }
  onSort?: (key: string) => void
}) {
  const sortable = Boolean(column.sortKey && onSort)
  const isActive = sortable && sort?.key === column.sortKey
  const ariaSort = isActive ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined
  const Icon = isActive ? (sort?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead
      aria-sort={sortable ? (ariaSort ?? 'none') : undefined}
      className={cn(
        'text-muted-foreground h-10 text-xs font-medium tracking-wide uppercase',
        column.align === 'right' && 'text-right',
        column.hideBelow && hideClasses[column.hideBelow],
        column.className,
      )}
    >
      {sortable && column.sortKey ? (
        <button
          type="button"
          onClick={() => onSort?.(column.sortKey ?? '')}
          className="hover:text-foreground inline-flex items-center gap-1 rounded-sm uppercase"
        >
          {column.header}
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        column.header
      )}
    </TableHead>
  )
}

interface DataTablePaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export function DataTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: DataTablePaginationProps) {
  if (total === 0) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-3 text-sm', className)}
    >
      <p className="text-muted-foreground">
        Showing <span className="text-foreground font-medium">{start}</span>–
        <span className="text-foreground font-medium">{end}</span> of{' '}
        <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <span className="text-muted-foreground px-1 tabular-nums" aria-current="page">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
