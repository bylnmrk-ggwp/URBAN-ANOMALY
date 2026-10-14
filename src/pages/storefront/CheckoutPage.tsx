import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/application/useCart'
import { round2 } from '@/features/cart/domain/rules'
import { usePlaceOrder } from '@/features/checkout/application/usePlaceOrder'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'
import { CheckoutForm } from '@/features/checkout/presentation/CheckoutForm'
import { OrderSummaryPanel } from '@/features/checkout/presentation/OrderSummaryPanel'
import { useValidateDiscount } from '@/features/discounts/application/hooks'
import type { AppliedDiscount } from '@/features/discounts/domain/entities'
import { getErrorMessage, isAppError } from '@/lib/errors'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const cart = useCart()
  const placeOrder = usePlaceOrder()
  const validateDiscount = useValidateDiscount()
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null)
  const discountAmount = discount ? Math.min(discount.amount, cart.totals.subtotal) : 0
  const payableTotal = round2(cart.totals.total - discountAmount)

  const applyDiscount = (code: string) => {
    validateDiscount.mutate(
      { code, subtotal: cart.totals.subtotal },
      { onSuccess: (applied) => setDiscount(applied) },
    )
  }
  const removeDiscount = () => {
    setDiscount(null)
    validateDiscount.reset()
  }
  const hasAdjustments =
    Object.keys(cart.adjustments).length > 0 ||
    cart.lines.some((line) => line.issue === 'quantity_reduced')

  // An empty cart has nothing to check out — unless we just placed the order and are navigating away.
  useEffect(() => {
    if (cart.items.length === 0 && !placeOrder.isPending && !placeOrder.isSuccess) {
      navigate(routes.cart, { replace: true, state: { from: routes.shop } })
    }
  }, [cart.items.length, placeOrder.isPending, placeOrder.isSuccess, navigate])

  useEffect(() => {
    if (!placeOrder.error) return
    toast.error(getErrorMessage(placeOrder.error, 'We could not place your order.'))
    if (isAppError(placeOrder.error) && placeOrder.error.code === 'out_of_stock') {
      void cart.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a new error only
  }, [placeOrder.error])

  const onSubmit = (values: CheckoutFormValues) => {
    const items = cart.lines
      .filter((line) => line.product && line.variant && line.issue !== 'out_of_stock')
      .map((line) => ({
        productId: line.item.productId,
        variantId: line.item.variantId,
        quantity: line.item.quantity,
      }))
    if (items.length === 0) return
    placeOrder.placeOrder({
      customer: { fullName: values.fullName, email: values.email, phone: values.phone },
      shippingAddress: {
        addressLine: values.addressLine,
        barangay: values.barangay,
        city: values.city,
        province: values.province,
        postalCode: values.postalCode,
        deliveryInstructions: values.deliveryInstructions,
      },
      paymentMethod: values.paymentMethod,
      items,
      customerNote: values.customerNote,
      discountCode: discount?.code,
    })
  }

  if (cart.items.length === 0) {
    return <LoadingState fullPage label="Redirecting to your cart…" />
  }

  return (
    <div className="container-x py-12 lg:py-16">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Checkout</h1>
        <Button asChild variant="link" className="px-0">
          <Link to={routes.cart} state={{ from: routes.checkout }}>
            <ArrowLeft aria-hidden="true" />
            Back to cart
          </Link>
        </Button>
      </header>

      {cart.isError ? (
        <ErrorState
          title="We couldn't verify your cart"
          error={cart.error}
          onRetry={() => void cart.refetch()}
        />
      ) : cart.isLoading ? (
        <LoadingState label="Checking stock and prices…" />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start lg:gap-16">
          <div className="order-2 lg:order-1">
            {hasAdjustments ? (
              <div
                role="alert"
                className="bg-warning/10 text-warning mb-8 flex items-start gap-3 rounded-md px-4 py-3 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Stock changed for some items and quantities were updated. Review your order
                  summary.
                </p>
              </div>
            ) : null}
            <CheckoutForm
              total={payableTotal}
              onSubmit={onSubmit}
              isSubmitting={placeOrder.isPending}
              submitError={placeOrder.error}
              disabledReason={
                cart.hasBlockingIssues
                  ? 'Some items are unavailable. Go back to your cart to remove them.'
                  : null
              }
            />
          </div>
          <OrderSummaryPanel
            lines={cart.lines}
            totals={cart.totals}
            discount={{
              applied: discount,
              onApply: applyDiscount,
              onRemove: removeDiscount,
              error: validateDiscount.error
                ? getErrorMessage(validateDiscount.error, 'That code could not be applied.')
                : null,
              isPending: validateDiscount.isPending,
            }}
            className="order-1 lg:order-2"
          />
        </div>
      )}
    </div>
  )
}
