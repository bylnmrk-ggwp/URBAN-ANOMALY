import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { useAdminOrder } from '@/features/orders/application/admin'
import type { Order } from '@/features/orders/domain/entities'
import { PAYMENT_METHOD_LABELS } from '@/features/orders/domain/rules'
import { useStoreSettings } from '@/features/settings/application/hooks'
import { formatDate, formatPrice, pluralize } from '@/lib/format'

const PRINT_STYLES = `
@media print {
  @page { margin: 14mm; }
  .no-print { display: none !important; }
  .packing-slip { padding: 0 !important; max-width: none !important; }
  .packing-slip table { page-break-inside: auto; }
  .packing-slip tr { page-break-inside: avoid; }
}
`

function Address({ order }: { order: Order }) {
  const a = order.shippingAddress
  return (
    <address className="text-sm leading-relaxed not-italic">
      <p className="font-medium">{order.customer.fullName}</p>
      <p>{a.addressLine}</p>
      <p>
        {a.barangay}, {a.city}
      </p>
      <p>
        {a.province} {a.postalCode}
      </p>
      <p className="text-muted-foreground mt-1">{order.customer.phone}</p>
      <p className="text-muted-foreground">{order.customer.email}</p>
    </address>
  )
}

function Slip({
  order,
  storeName,
  storeAddress,
}: {
  order: Order
  storeName: string
  storeAddress: string
}) {
  const units = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const isCod = order.paymentMethod === 'cod'
  return (
    <article
      className="packing-slip mx-auto max-w-3xl space-y-8 p-6 sm:p-10"
      aria-label="Packing slip"
    >
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-[0.2em] uppercase">{storeName}</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-sm whitespace-pre-line">
            {storeAddress}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <h1 className="text-xl font-semibold">Packing slip</h1>
          <p className="mt-1 font-mono">{order.orderNumber}</p>
          <p className="text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
          <p className="text-muted-foreground">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Ship to
          </h2>
          <Address order={order} />
        </div>
        {order.shippingAddress.deliveryInstructions ? (
          <div>
            <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Delivery instructions
            </h2>
            <p className="text-sm">{order.shippingAddress.deliveryInstructions}</p>
          </div>
        ) : null}
      </section>

      {isCod ? (
        <p
          role="note"
          className="border-warning/40 bg-warning/10 rounded-md border px-4 py-3 text-sm font-medium"
        >
          Cash on delivery — collect {formatPrice(order.total)} from the customer.
        </p>
      ) : null}

      <section>
        <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Items · {pluralize(units, 'unit')}
        </h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  SKU
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Item
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Size / Color
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2">
                    {item.size} / {item.colorName}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          {order.customerNote ? (
            <>
              <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Customer note
              </h2>
              <p className="text-sm">{order.customerNote}</p>
            </>
          ) : null}
        </div>
        <dl className="space-y-1 text-sm sm:min-w-56 sm:justify-self-end">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">
              {order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}
            </dd>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 border-t pt-1 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className="text-muted-foreground border-t pt-4 text-xs">
        Thank you for shopping with {storeName}. Questions? Reply to your order confirmation email.
      </footer>
    </article>
  )
}

export default function PackingSlipPage() {
  const { id } = useParams<{ id: string }>()
  const order = useAdminOrder(id)
  const settings = useStoreSettings()

  const toolbar = (
    <div className="no-print bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-10">
        <Button asChild variant="ghost" size="sm">
          <Link to={id ? routes.admin.orderDetails(id) : routes.admin.orders}>
            <ArrowLeft aria-hidden="true" />
            Back to order
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!order.data}>
          <Printer aria-hidden="true" />
          Print
        </Button>
      </div>
    </div>
  )

  return (
    <div className="bg-background text-foreground min-h-screen">
      <style>{PRINT_STYLES}</style>
      {toolbar}
      {order.isPending || settings.isPending ? (
        <LoadingState label="Preparing packing slip…" />
      ) : order.isError ? (
        <div className="mx-auto max-w-3xl p-6">
          <ErrorState
            title="Could not load the order"
            error={order.error}
            onRetry={() => void order.refetch()}
          />
        </div>
      ) : !order.data ? (
        <div className="mx-auto max-w-3xl p-6">
          <ErrorState
            title="Order not found"
            message="This order does not exist or has been removed."
            className="border-border bg-transparent"
          />
        </div>
      ) : (
        <Slip
          order={order.data}
          storeName={settings.data?.storeName ?? 'Store'}
          storeAddress={settings.data?.address ?? ''}
        />
      )}
    </div>
  )
}
