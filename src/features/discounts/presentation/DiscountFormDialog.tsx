import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import type { DiscountCode, DiscountInput } from '../domain/entities'
import { discountFormSchema } from '../domain/entities'
import {
  type DiscountFormInput,
  type DiscountFormOutput,
  discountToFormValues,
  emptyDiscountForm,
  formValuesToDiscountInput,
} from './discountForm'

interface DiscountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount: DiscountCode | null
  onSubmit: (input: DiscountInput) => Promise<unknown>
  isPending: boolean
}

function numberValue(value: unknown): string | number {
  return typeof value === 'number' || typeof value === 'string' ? value : ''
}

export function DiscountFormDialog({
  open,
  onOpenChange,
  discount,
  onSubmit,
  isPending,
}: DiscountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{discount ? 'Edit discount' : 'New discount'}</DialogTitle>
          <DialogDescription>
            Codes are matched case-insensitively at checkout and validated again when the order is
            placed.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DiscountForm
            key={discount?.id ?? 'new'}
            discount={discount}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DiscountForm({
  discount,
  onSubmit,
  onCancel,
  isPending,
}: Omit<DiscountFormDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const form = useForm<DiscountFormInput, unknown, DiscountFormOutput>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: discount ? discountToFormValues(discount) : emptyDiscountForm(),
    mode: 'onBlur',
  })
  const type = useWatch({ control: form.control, name: 'type' })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(formValuesToDiscountInput(values))
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="WELCOME10"
                  autoComplete="off"
                  className="font-mono uppercase"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>Uppercase letters, numbers and hyphens.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => (v === 'percent' || v === 'fixed') && field.onChange(v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{type === 'percent' ? 'Percent (%)' : 'Amount (PHP)'}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={type === 'percent' ? 1 : '0.01'}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={numberValue(field.value)}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minSubtotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum subtotal (PHP)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={numberValue(field.value)}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxUses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max uses</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="Unlimited"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value === null ? '' : numberValue(field.value)}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                  />
                </FormControl>
                <FormDescription>Leave empty for unlimited.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription className="text-xs">
                  Inactive codes are rejected at checkout.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {discount ? 'Save changes' : 'Create discount'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
