import type { HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute } from 'react'
import { useFormContext } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'

type TextFieldName = Exclude<keyof CheckoutFormValues, 'paymentMethod'>

interface CheckoutTextFieldProps {
  name: TextFieldName
  label: string
  placeholder?: string
  description?: string
  autoComplete?: HTMLInputAutoCompleteAttribute
  type?: HTMLInputTypeAttribute
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  multiline?: boolean
  optional?: boolean
  className?: string
}

export function CheckoutTextField({
  name,
  label,
  placeholder,
  description,
  autoComplete,
  type = 'text',
  inputMode,
  multiline = false,
  optional = false,
  className,
}: CheckoutTextFieldProps) {
  const { control } = useFormContext<CheckoutFormValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {optional ? (
              <span className="text-muted-foreground font-normal"> (optional)</span>
            ) : null}
          </FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea placeholder={placeholder} rows={3} {...field} />
            ) : (
              <Input
                type={type}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className="min-h-11"
                {...field}
              />
            )}
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
