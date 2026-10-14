import { useState } from 'react'
import { useFormContext } from 'react-hook-form'

import type { SavedAddress } from '@/features/auth/domain/entities'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'

import { CheckoutTextField } from './CheckoutTextField'
import { NEW_ADDRESS, SavedAddressPicker } from './SavedAddressPicker'

const ADDRESS_FIELDS = [
  'addressLine',
  'barangay',
  'city',
  'province',
  'postalCode',
  'deliveryInstructions',
] as const

interface CheckoutShippingFieldsProps {
  savedAddresses: SavedAddress[]
}

export function CheckoutShippingFields({ savedAddresses }: CheckoutShippingFieldsProps) {
  const { setValue } = useFormContext<CheckoutFormValues>()
  const defaultAddress = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0]
  const [selectedId, setSelectedId] = useState<string>(defaultAddress?.id ?? NEW_ADDRESS)

  const applyAddress = (id: string) => {
    setSelectedId(id)
    const address = savedAddresses.find((entry) => entry.id === id)
    for (const field of ADDRESS_FIELDS) {
      setValue(field, address ? address[field] : '', { shouldDirty: true, shouldValidate: false })
    }
  }

  const showFields = savedAddresses.length === 0 || selectedId === NEW_ADDRESS

  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 text-xl font-semibold tracking-tight">Shipping address</legend>

      {savedAddresses.length > 0 ? (
        <SavedAddressPicker
          addresses={savedAddresses}
          selectedId={selectedId}
          onSelect={applyAddress}
        />
      ) : null}

      {showFields ? (
        <div className="space-y-5">
          <CheckoutTextField
            name="addressLine"
            label="Street address"
            autoComplete="street-address"
            placeholder="House no., street, subdivision"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <CheckoutTextField name="barangay" label="Barangay" autoComplete="address-level3" />
            <CheckoutTextField
              name="city"
              label="City / Municipality"
              autoComplete="address-level2"
            />
            <CheckoutTextField name="province" label="Province" autoComplete="address-level1" />
            <CheckoutTextField
              name="postalCode"
              label="Postal code"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="1234"
            />
          </div>
        </div>
      ) : null}

      <CheckoutTextField
        name="deliveryInstructions"
        label="Delivery instructions"
        multiline
        optional
        placeholder="Landmarks, gate codes, preferred delivery time"
      />
    </fieldset>
  )
}
