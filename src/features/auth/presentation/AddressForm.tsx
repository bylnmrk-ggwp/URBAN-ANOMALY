import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/application/useAuth'
import { addressSchema } from '@/features/auth/domain/entities'
import type { AddressFormValues, SavedAddress } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'

const emptyAddress: AddressFormValues = {
  label: '',
  addressLine: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  deliveryInstructions: '',
  isDefault: false,
}

type TextFieldName = Exclude<keyof AddressFormValues, 'isDefault' | 'deliveryInstructions'>

const textFields: { name: TextFieldName; label: string; placeholder?: string; span?: boolean }[] = [
  { name: 'label', label: 'Label', placeholder: 'Home, Office…', span: true },
  { name: 'addressLine', label: 'Street address', span: true },
  { name: 'barangay', label: 'Barangay' },
  { name: 'city', label: 'City / Municipality' },
  { name: 'province', label: 'Province' },
  { name: 'postalCode', label: 'Postal code', placeholder: '1234' },
]

interface AddressFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing address to edit; omit to create a new one. */
  address?: SavedAddress | null
}

export function AddressForm({ open, onOpenChange, address = null }: AddressFormProps) {
  const { saveAddress } = useAuth()
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddress,
  })

  useEffect(() => {
    if (!open) return
    form.reset(address ? { ...address } : emptyAddress)
  }, [open, address, form])

  const onSubmit = async (values: AddressFormValues) => {
    try {
      await saveAddress.mutateAsync({ ...values, id: address?.id })
      toast.success(address ? 'Address updated' : 'Address added')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this address.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saveAddress.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? 'Edit address' : 'Add address'}</DialogTitle>
          <DialogDescription>Saved addresses speed up checkout.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {textFields.map((config) => (
                <FormField
                  key={config.name}
                  control={form.control}
                  name={config.name}
                  render={({ field }) => (
                    <FormItem className={config.span ? 'sm:col-span-2' : undefined}>
                      <FormLabel>{config.label}</FormLabel>
                      <FormControl>
                        <Input placeholder={config.placeholder} className="min-h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="deliveryInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Delivery instructions{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex min-h-11 flex-row items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Use as my default address</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
                disabled={saveAddress.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="min-h-11" disabled={saveAddress.isPending}>
                {saveAddress.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Save address
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
