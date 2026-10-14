import { Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { OrderStatusBadge } from '@/components/common/StatusBadge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatPrice, pluralize } from '@/lib/format'

import { useCustomer } from '../application/hooks'
import type { CustomerDetail } from '../domain/entities'

interface CustomerDetailSheetProps {
  customerId: string | null
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailSheet({ customerId, onOpenChange }: CustomerDetailSheetProps) {
  const customer = useCustomer(customerId)

  return (
    <Sheet open={customerId !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{customer.data?.fullName ?? 'Customer'}</SheetTitle>
          <SheetDescription>
            {customer.data
              ? `Customer since ${formatDate(customer.data.createdAt)}`
              : 'Contact details, addresses and recent orders.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {customer.isPending ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : customer.isError ? (
            <ErrorState
              title="Could not load customer"
              error={customer.error}
              onRetry={() => void customer.refetch()}
              isRetrying={customer.isRefetching}
              className="py-8"
            />
          ) : customer.data === null ? (
            <ErrorState
              title="Customer not found"
              message="This customer record no longer exists."
              className="border-border bg-transparent py-8"
            />
          ) : (
            <CustomerDetailBody customer={customer.data} />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  )
}

function CustomerDetailBody({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="space-y-6 text-sm">
      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-md p-3">
          <dt className="text-muted-foreground text-xs uppercase">Orders</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{customer.totalOrders}</dd>
        </div>
        <div className="bg-muted rounded-md p-3">
          <dt className="text-muted-foreground text-xs uppercase">Total spent</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {formatPrice(customer.totalSpent)}
          </dd>
        </div>
      </dl>

      <Section title="Contact">
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <a href={`mailto:${customer.email}`} className="truncate hover:underline">
              {customer.email}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="hover:underline">
                {customer.phone}
              </a>
            ) : (
              <span className="text-muted-foreground">No phone number</span>
            )}
          </li>
        </ul>
      </Section>

      <Separator />

      <Section title={pluralize(customer.addresses.length, 'Address', 'Addresses')}>
        {customer.addresses.length === 0 ? (
          <p className="text-muted-foreground">No saved addresses.</p>
        ) : (
          <ul className="space-y-2">
            {customer.addresses.map((address, index) => (
              <li key={index} className="flex gap-2 rounded-md border p-3">
                <MapPin
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <address className="not-italic">
                  <p>{address.addressLine}</p>
                  <p className="text-muted-foreground">
                    {[address.barangay, address.city, address.province, address.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {address.deliveryInstructions ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {address.deliveryInstructions}
                    </p>
                  ) : null}
                </address>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Separator />

      <Section title="Recent orders">
        {customer.recentOrders.length === 0 ? (
          <p className="text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y">
            {customer.recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    to={routes.admin.orderDetails(order.id)}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(order.createdAt)} · {pluralize(order.itemCount, 'item')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium tabular-nums">{formatPrice(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
