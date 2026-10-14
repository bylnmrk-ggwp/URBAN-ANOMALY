import { zodResolver } from '@hookform/resolvers/zod'
import { BellRing, CircleCheck, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/application/useAuth'
import type { Product, ProductVariant } from '@/features/products/domain/entities'
import { useSubscribeStockAlert } from '@/features/stock-alerts/application/hooks'
import {
  stockAlertSchema,
  type StockAlertFormValues,
} from '@/features/stock-alerts/domain/entities'
import { getErrorMessage } from '@/lib/errors'

interface BackInStockFormProps {
  product: Pick<Product, 'name'>
  variant: Pick<ProductVariant, 'id' | 'size' | 'color'>
}

export function BackInStockForm({ product, variant }: BackInStockFormProps) {
  const { user } = useAuth()
  const subscribe = useSubscribeStockAlert()
  const form = useForm<StockAlertFormValues>({
    resolver: zodResolver(stockAlertSchema),
    defaultValues: { email: user?.email ?? '' },
  })

  const onSubmit = async ({ email }: StockAlertFormValues) => {
    try {
      await subscribe.mutateAsync({ variantId: variant.id, email })
    } catch (error) {
      form.setError('email', { message: getErrorMessage(error, 'Could not save your alert.') })
    }
  }

  return (
    <section
      aria-labelledby="back-in-stock-title"
      className="bg-muted/40 rounded-md border p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <BellRing className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="back-in-stock-title" className="text-base font-semibold">
            Notify me when it's back
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {product.name} in {variant.size} · {variant.color.name} is sold out. Leave your email
            and we'll let you know the moment it's restocked.
          </p>

          {subscribe.isSuccess ? (
            <p
              role="status"
              className="bg-background mt-4 flex items-start gap-2 rounded-md border p-3 text-sm"
            >
              <CircleCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
              We'll email you when it's back.
            </p>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="you@example.com"
                          className="bg-background h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="min-h-11" disabled={subscribe.isPending}>
                  {subscribe.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Notify me
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </section>
  )
}
