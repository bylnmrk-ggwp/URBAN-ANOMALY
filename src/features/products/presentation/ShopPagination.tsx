import type { MouseEvent } from 'react'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

interface ShopPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Builds a real href so pages remain crawlable and open in new tabs. */
  buildHref: (page: number) => string
  className?: string
}

type PageToken = number | 'ellipsis-start' | 'ellipsis-end'

function pageWindow(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const tokens: PageToken[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) tokens.push('ellipsis-start')
  for (let current = start; current <= end; current += 1) tokens.push(current)
  if (end < totalPages - 1) tokens.push('ellipsis-end')
  tokens.push(totalPages)
  return tokens
}

export function ShopPagination({
  page,
  totalPages,
  onPageChange,
  buildHref,
  className,
}: ShopPaginationProps) {
  if (totalPages <= 1) return null

  const go = (target: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (target < 1 || target > totalPages || target === page) return
    onPageChange(target)
  }

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildHref(Math.max(1, page - 1))}
            onClick={go(page - 1)}
            aria-disabled={page === 1 || undefined}
            className={cn('min-h-11', page === 1 && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
        {pageWindow(page, totalPages).map((token) =>
          typeof token === 'number' ? (
            <PaginationItem key={token}>
              <PaginationLink
                href={buildHref(token)}
                onClick={go(token)}
                isActive={token === page}
                aria-label={`Page ${token}`}
                className="min-h-11 min-w-11"
              >
                {token}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={token}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href={buildHref(Math.min(totalPages, page + 1))}
            onClick={go(page + 1)}
            aria-disabled={page === totalPages || undefined}
            className={cn('min-h-11', page === totalPages && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
