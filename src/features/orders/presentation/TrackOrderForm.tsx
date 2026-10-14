import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { TrackOrderFormValues, TrackOrderInput } from '@/features/orders/domain/trackOrder'
import { trackOrderSchema } from '@/features/orders/domain/trackOrder'

interface TrackOrderFormProps {
  onSubmit: (values: TrackOrderInput) => void | Promise<void>
  isPending?: boolean
  defaultEmail?: string
}

export function TrackOrderForm({
  onSubmit,
  isPending = false,
  defaultEmail = '',
}: TrackOrderFormProps) {
  const form = useForm<TrackOrderFormValues, unknown, TrackOrderInput>({
    resolver: zodResolver(trackOrderSchema),
    defaultValues: { orderNumber: '', email: defaultEmail },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-5"
        noValidate
        aria-label="Track an order"
      >
        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order number</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="ORD-2610-01001"
                  className="h-11 font-mono uppercase"
                  {...field}
                />
              </FormControl>
              <FormDescription>Printed on your confirmation page and emails.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email used at checkout</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="min-h-12 w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search aria-hidden="true" />
          )}
          Find my order
        </Button>
      </form>
    </Form>
  )
}
