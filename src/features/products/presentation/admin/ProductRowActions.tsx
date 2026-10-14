import { Archive, ArchiveRestore, Eye, EyeOff, MoreHorizontal, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useSetProductStatus } from '../../application/admin'
import type { Product } from '../../domain/entities'

interface ProductRowActionsProps {
  product: Product
}

export function ProductRowActions({ product }: ProductRowActionsProps) {
  const [confirmArchive, setConfirmArchive] = useState(false)
  const setStatus = useSetProductStatus()

  const togglePublish = () =>
    setStatus.mutate({
      id: product.id,
      status: product.status === 'published' ? 'draft' : 'published',
    })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${product.name}`}
            disabled={setStatus.isPending}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem asChild>
            <Link to={routes.admin.productEdit(product.id)}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </DropdownMenuItem>
          {product.status === 'published' ? (
            <DropdownMenuItem asChild>
              <Link to={routes.product(product.slug)} target="_blank" rel="noreferrer">
                <Eye aria-hidden="true" />
                View on store
              </Link>
            </DropdownMenuItem>
          ) : null}
          {product.status !== 'archived' ? (
            <DropdownMenuItem onSelect={togglePublish}>
              {product.status === 'published' ? (
                <>
                  <EyeOff aria-hidden="true" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye aria-hidden="true" />
                  Publish
                </>
              )}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {product.status === 'archived' ? (
            <DropdownMenuItem
              onSelect={() => setStatus.mutate({ id: product.id, status: 'draft' })}
            >
              <ArchiveRestore aria-hidden="true" />
              Restore to draft
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmArchive(true)}>
              <Archive aria-hidden="true" />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive "${product.name}"?`}
        description="Archived products are hidden from the storefront and cannot be purchased. You can restore them to draft later."
        confirmLabel="Archive"
        destructive
        isPending={setStatus.isPending}
        onConfirm={() =>
          setStatus.mutate(
            { id: product.id, status: 'archived' },
            { onSettled: () => setConfirmArchive(false) },
          )
        }
      />
    </>
  )
}
