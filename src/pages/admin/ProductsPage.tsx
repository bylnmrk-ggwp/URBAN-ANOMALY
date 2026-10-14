import { Download, Package, Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTablePagination } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/features/categories/application/hooks'
import { useAdminProducts, useExportProducts } from '@/features/products/application/admin'
import { productsToCsv } from '@/features/products/domain/csv'
import type { AdminProductSort } from '@/features/products/domain/entities'
import { ImportProductsDialog } from '@/features/products/presentation/admin/ImportProductsDialog'
import { ProductsTable } from '@/features/products/presentation/admin/ProductsTable'
import {
  ProductsToolbar,
  type ProductStatusFilter,
} from '@/features/products/presentation/admin/ProductsToolbar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const PAGE_SIZE = 10
const EXPORT_LIMIT = 500

/** Triggers a browser download of `text` as a CSV file. */
function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProductStatusFilter>('all')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState<AdminProductSort>('newest')
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim())

  const categories = useCategories()
  const filters = {
    search: debouncedSearch || undefined,
    status,
    categoryId: categoryId || undefined,
    sort,
  }
  const products = useAdminProducts({ ...filters, page, pageSize: PAGE_SIZE })
  const exporter = useExportProducts()

  const exportCsv = () =>
    exporter.mutate(
      { filters, limit: EXPORT_LIMIT },
      {
        onSuccess: (items) => {
          const stamp = new Date().toISOString().slice(0, 10)
          downloadCsv(`products-${stamp}.csv`, productsToCsv(items))
        },
      },
    )

  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const hasFilters = Boolean(debouncedSearch || categoryId || status !== 'all')
  const addButton = (
    <Button asChild>
      <Link to={routes.admin.productNew}>
        <Plus aria-hidden="true" />
        Add Product
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your catalogue, pricing and variants."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporter.isPending}>
              <Download aria-hidden="true" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload aria-hidden="true" />
              Import CSV
            </Button>
            {addButton}
          </>
        }
      />

      <ProductsToolbar
        search={search}
        onSearchChange={resetPage(setSearch)}
        status={status}
        onStatusChange={resetPage(setStatus)}
        categoryId={categoryId}
        onCategoryChange={resetPage(setCategoryId)}
        sort={sort}
        onSortChange={resetPage(setSort)}
        categories={categories.data ?? []}
      />

      {products.isError ? (
        <ErrorState
          title="Could not load products"
          error={products.error}
          onRetry={() => void products.refetch()}
          isRetrying={products.isRefetching}
        />
      ) : (
        <>
          <ProductsTable
            products={products.data?.items ?? []}
            isLoading={products.isPending}
            emptyState={
              hasFilters ? (
                <EmptyState
                  icon={Package}
                  title="No products match these filters"
                  description="Try a different search term or clear the filters."
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title="No products yet."
                  description="Create your first product to start selling."
                  action={addButton}
                />
              )
            }
          />
          {products.data ? (
            <DataTablePagination
              page={products.data.page}
              totalPages={products.data.totalPages}
              total={products.data.total}
              pageSize={products.data.pageSize}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      <ImportProductsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={categories.data ?? []}
      />
    </div>
  )
}
