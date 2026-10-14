import { CheckoutTextField } from './CheckoutTextField'

export function CheckoutContactFields() {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 text-xl font-semibold tracking-tight">Contact</legend>
      <CheckoutTextField name="fullName" label="Full name" autoComplete="name" />
      <div className="grid gap-5 sm:grid-cols-2">
        <CheckoutTextField
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          description="Order updates are sent here."
        />
        <CheckoutTextField
          name="phone"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09XXXXXXXXX"
          description="The courier may call this number."
        />
      </div>
    </fieldset>
  )
}
