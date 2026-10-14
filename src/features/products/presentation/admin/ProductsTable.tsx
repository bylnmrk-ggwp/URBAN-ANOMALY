import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { ProductImage } from '@/components/common/ProductImage'
import { ProductStatusBadge } from '@/components/common/StatusBadge'
import { formatDate, formatPrice, pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { Product } from '../../domain/entities'
import { availableStock, getPrimaryImage, isOnSale, totalPhysicalStock } from '../../domain/rules'
import { ProductRowActions } from './ProductRowActions'

interface ProductsTableProps {
  products: Product[]
  isLoading: boolean
  emptyState: ReactNode
}

function hasLowVariant(product: Product): boolean {
  return product.variants.some((v) => availableStock(v) <= v.lowStockThreshold)
}

function PriceCell({ product }: { product: Product }) {
  if (isOnSale(product) && product.salePrice !== null) {
    return (
      <span className="flex flex-col leading-tight">
        <span className="font-medium tabular-nums">{formatPrice(product.salePrice)}</span>
        <span className="text-muted-foreground text-xs tabular-nums line-through">
          {formatPrice(product.basePrice)}
        </span>
      </span>
    )
  }
  return <span className="tabular-nums">{formatPrice(product.basePrice)}</span>
}

function StockCell({ product }: { product: Product }) {
  const low = hasLowVariant(product)
  return (
    <span className={cn('tabular-nums', low && 'text-warning font-medium')}>
      {totalPhysicalStock(product)}
      {low ? <span className="sr-only"> (some variants low)</span> : null}
    </span>
  )
}

const columns: DataTableColumn<Product>[] = [
  {
    key: 'image',
    header: <span className="sr-only">Image</span>,
    className: 'w-14',
    cell: (p) => (
      <ProductImage
        src={getPrimaryImage(p)?.url ?? null}
        alt={p.name}
        aspect="3/4"
        className="w-10 rounded-md"
      />
    ),
  },
  {
    key: 'name',
    header: 'Product',
    cell: (p) => (
      <div className="min-w-0">
        <Link
          to={routes.admin.productEdit(p.id)}
          className="block max-w-56 truncate font-medium hover:underline"
        >
          {p.name}
        </Link>
        <p className="text-muted-foreground max-w-56 truncate text-xs">{p.slug}</p>
      </div>
    ),
  },
  {
    key: 'variants',
    header: 'Variants',
    cell: (p) => (
      <span className="text-muted-foreground">{pluralize(p.variants.length, 'variant')}</span>
    ),
    hideBelow: 'lg',
  },
  { key: 'category', header: 'Category', cell: (p) => p.categoryName, hideBelow: 'md' },
  { key: 'price', header: 'Price', align: 'right', cell: (p) => <PriceCell product={p} /> },
  { key: 'stock', header: 'Stock', align: 'right', cell: (p) => <StockCell product={p} /> },
  { key: 'status', header: 'Status', cell: (p) => <ProductStatusBadge status={p.status} /> },
  {
    key: 'created',
    header: 'Created',
    cell: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    hideBelow: 'lg',
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    className: 'w-12',
    cell: (p) => <ProductRowActions product={p} />,
  },
]

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-card flex gap-3 rounded-lg border p-3">
      <ProductImage
        src={getPrimaryImage(product)?.url ?? null}
        alt={product.name}
        aspect="3/4"
        className="w-16 shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={routes.admin.productEdit(product.id)}
              className="block truncate text-sm font-medium hover:underline"
            >
              {product.name}
            </Link>
            <p className="text-muted-foreground truncate text-xs">{product.categoryName}</p>
          </div>
          <ProductRowActions product={product} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <PriceCell product={product} />
          <span className="text-muted-foreground text-xs">
            Stock <StockCell product={product} />
          </span>
          <span className="text-muted-foreground text-xs">
            {pluralize(product.variants.length, 'variant')}
          </span>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>
    </div>
  )
}

export function ProductsTable({ products, isLoading, emptyState }: ProductsTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={products}
      rowKey={(p) => p.id}
      isLoading={isLoading}
      skeletonRows={10}
      emptyState={emptyState}
      caption="Products"
      mobileCard={(p) => <ProductCard product={p} />}
    />
  )
}
