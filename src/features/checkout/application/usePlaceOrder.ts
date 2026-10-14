import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { repositories } from '@/config/repositories'
import type { PlaceOrderInput, PlaceOrderResult } from '@/features/orders/domain/entities'
import { queryKeys } from '@/lib/queryKeys'
import { useCartStore } from '@/stores/cartStore'

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const clearCart = useCartStore((state) => state.clearCart)

  const mutation = useMutation({
    mutationFn: (input: PlaceOrderInput) => repositories.orders.placeOrder(input),
    onSuccess: (result: PlaceOrderResult) => {
      clearCart()
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ])
      const destination =
        result.paymentRedirectUrl ?? routes.orderConfirmation(result.order.orderNumber)
      if (isExternalUrl(destination)) {
        window.location.assign(destination)
        return
      }
      navigate(destination, { replace: true })
    },
  })

  const { mutate, isPending } = mutation

  /** Ignores calls while a submission is in flight so double clicks never create two orders. */
  const placeOrder = useCallback(
    (input: PlaceOrderInput) => {
      if (isPending) return
      mutate(input)
    },
    [mutate, isPending],
  )

  return {
    placeOrder,
    isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  }
}
