import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import type { AdminProductFilters, ProductInput, ProductStatus } from '../domain/entities'

export function useAdminProducts(filters: AdminProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.admin(filters),
    queryFn: () => repositories.products.getAdminProducts(filters),
    placeholderData: keepPreviousData,
  })
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.byId(id ?? ''),
    queryFn: () => repositories.products.getProductById(id ?? ''),
    enabled: Boolean(id),
  })
}

function useInvalidateProductData() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary }),
    ])
}

export function useCreateProduct() {
  const invalidate = useInvalidateProductData()
  return useMutation({
    mutationFn: (input: ProductInput) => repositories.products.createProduct(input),
    onSuccess: async (product) => {
      await invalidate()
      toast.success(`"${product.name}" created.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create the product.')),
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProductData()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      repositories.products.updateProduct(id, input),
    onSuccess: async (product) => {
      await invalidate()
      toast.success(`"${product.name}" saved.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save the product.')),
  })
}

/** CSV export: fetches the current admin list (up to `limit` rows) on demand. */
export function useExportProducts() {
  return useMutation({
    mutationFn: async ({
      filters,
      limit = 500,
    }: {
      filters: AdminProductFilters
      limit?: number
    }) =>
      (await repositories.products.getAdminProducts({ ...filters, page: 1, pageSize: limit }))
        .items,
    onError: (error) => toast.error(getErrorMessage(error, 'Could not export products.')),
  })
}

/** CSV import: one create per row without toasts; the importer reports results and invalidates. */
export function useImportProduct() {
  const invalidate = useInvalidateProductData()
  const mutation = useMutation({
    mutationFn: (input: ProductInput) => repositories.products.createProduct(input),
  })
  return { ...mutation, invalidate }
}

const STATUS_VERB: Record<ProductStatus, string> = {
  published: 'published',
  draft: 'moved to drafts',
  archived: 'archived',
}

export function useSetProductStatus() {
  const invalidate = useInvalidateProductData()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      repositories.products.setProductStatus(id, status),
    onSuccess: async (product) => {
      await invalidate()
      toast.success(`"${product.name}" ${STATUS_VERB[product.status]}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update the product status.')),
  })
}
