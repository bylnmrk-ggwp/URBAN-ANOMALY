import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Minus, Plus } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Order, OrderItem } from '@/features/orders/domain/entities'
import { useRequestReturn } from '@/features/returns/application/hooks'
import {
  RETURN_REASON_LABELS,
  type ReturnReason,
  returnRequestSchema,
} from '@/features/returns/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

/** Form shape: one quantity per order line (0 = not returning) plus the shared fields. */
const formSchema = z.object({
  quantities: z
    .record(z.string(), z.number().int().min(0))
    .refine((q) => Object.values(q).some((n) => n > 0), 'Select at least one item.'),
  reason: returnRequestSchema.shape.reason,
  resolution: returnRequestSchema.shape.resolution,
  note: returnRequestSchema.shape.note,
})
type FormValues = z.infer<typeof formSchema>

const REASONS = Object.keys(RETURN_REASON_LABELS) as ReturnReason[]

interface ReturnRequestDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReturnRequestDialog({ order, open, onOpenChange }: ReturnRequestDialogProps) {
  const requestReturn = useRequestReturn()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantities: Object.fromEntries(order.items.map((item) => [item.id, 0])),
      resolution: 'refund',
      note: '',
    },
  })
  const quantities = useWatch({ control: form.control, name: 'quantities' })
  const refundAmount = order.items.reduce(
    (sum, item) => sum + item.unitPrice * (quantities[item.id] ?? 0),
    0,
  )

  const setQuantity = (item: OrderItem, next: number) => {
    const clamped = Math.max(0, Math.min(item.quantity, next))
    form.setValue('quantities', { ...quantities, [item.id]: clamped }, { shouldValidate: true })
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await requestReturn.mutateAsync({
        orderId: order.id,
        items: Object.entries(values.quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
        reason: values.reason,
        resolution: values.resolution,
        note: values.note,
      })
      toast.success('Return request sent. We will review it shortly.')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit the return request.'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !requestReturn.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a return</DialogTitle>
          <DialogDescription>
            Order {order.orderNumber}. Choose what you are sending back and how you would like it
            resolved.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField
              control={form.control}
              name="quantities"
              render={() => (
                <FormItem>
                  <FormLabel>Items to return</FormLabel>
                  <ul className="divide-border divide-y rounded-md border">
                    {order.items.map((item) => {
                      const qty = quantities[item.id] ?? 0
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.productName}</p>
                            <p className="text-muted-foreground text-xs">
                              {item.size} · {item.colorName} · {formatPrice(item.unitPrice)} each
                            </p>
                          </div>
                          <div
                            className="flex shrink-0 items-center gap-1"
                            role="group"
                            aria-label={`Quantity of ${item.productName} to return`}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-11"
                              aria-label={`Decrease ${item.productName}`}
                              disabled={qty === 0}
                              onClick={() => setQuantity(item, qty - 1)}
                            >
                              <Minus aria-hidden="true" />
                            </Button>
                            <span className="w-8 text-center tabular-nums" aria-live="polite">
                              {qty}
                              <span className="sr-only"> of {item.quantity}</span>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-11"
                              aria-label={`Increase ${item.productName}`}
                              disabled={qty >= item.quantity}
                              onClick={() => setQuantity(item, qty + 1)}
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-11 w-full">
                        <SelectValue placeholder="Choose a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {RETURN_REASON_LABELS[reason]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred resolution</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {(
                        [
                          ['refund', 'Refund', 'Money back to your original payment method.'],
                          ['exchange', 'Exchange', 'Swap for another size or colour.'],
                        ] as const
                      ).map(([value, label, hint]) => (
                        <label
                          key={value}
                          className="has-[[data-state=checked]]:border-foreground flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
                        >
                          <RadioGroupItem value={value} className="mt-0.5" />
                          <span>
                            <span className="block font-medium">{label}</span>
                            <span className="text-muted-foreground block text-xs">{hint}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anything we should know? (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted flex items-center justify-between rounded-md p-3 text-sm">
              <span>Estimated refund</span>
              <span className="font-semibold tabular-nums">{formatPrice(refundAmount)}</span>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
                disabled={requestReturn.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="min-h-11" disabled={requestReturn.isPending}>
                {requestReturn.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Submit request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
