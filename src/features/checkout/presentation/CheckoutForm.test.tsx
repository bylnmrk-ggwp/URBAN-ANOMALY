import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreSettings } from '@/features/settings/domain/entities'
import { SEED_SETTINGS } from '@/mocks/data/settings'
import { renderWithProviders, resetMockSession, screen, waitFor } from '@/tests/render'

import { CheckoutForm } from './CheckoutForm'

const settingsState: { data: StoreSettings } = { data: { ...SEED_SETTINGS } }

vi.mock('@/features/checkout/application/useStoreSettings', () => ({
  useStoreSettings: () => ({ data: settingsState.data, isPending: false, isError: false }),
}))

const validValues = {
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  phone: '09171234567',
  addressLine: '24 Maginhawa Street, Unit 3B',
  barangay: 'Teachers Village East',
  city: 'Quezon City',
  province: 'Metro Manila',
  postalCode: '1101',
}

async function renderForm(props: Partial<Parameters<typeof CheckoutForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const utils = renderWithProviders(
    <CheckoutForm total={1040} onSubmit={onSubmit} isSubmitting={false} {...props} />,
  )
  // The submit button stays disabled until the auth session resolves.
  const submit = await screen.findByRole('button', { name: /place order/i })
  await waitFor(() => expect(submit).toBeEnabled())
  return { ...utils, onSubmit, submit }
}

describe('CheckoutForm', () => {
  beforeEach(async () => {
    settingsState.data = { ...SEED_SETTINGS }
    await resetMockSession()
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('shows field errors from checkoutSchema when submitted empty', async () => {
    const { user, submit, onSubmit } = await renderForm()
    await user.click(submit)

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(
      screen.getByText('Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).'),
    ).toBeInTheDocument()
    expect(screen.getByText('Postal code must be 4 digits.')).toBeInTheDocument()
    expect(screen.getByText('Enter your street address.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits parsed values for a valid Cash on Delivery order', async () => {
    const { user, submit, onSubmit } = await renderForm()

    await user.type(screen.getByLabelText('Full name'), `  ${validValues.fullName}  `)
    await user.type(screen.getByLabelText('Email'), validValues.email)
    await user.type(screen.getByLabelText('Mobile number'), validValues.phone)
    await user.type(screen.getByLabelText('Street address'), validValues.addressLine)
    await user.type(screen.getByLabelText('Barangay'), validValues.barangay)
    await user.type(screen.getByLabelText('City / Municipality'), validValues.city)
    await user.type(screen.getByLabelText('Province'), validValues.province)
    await user.type(screen.getByLabelText('Postal code'), validValues.postalCode)

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked()
    expect(submit).toHaveTextContent('Place order · ₱1,040.00')
    await user.click(submit)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      ...validValues,
      deliveryInstructions: '',
      customerNote: '',
      paymentMethod: 'cod',
      paymentReference: '',
    })
  })

  it('shows the QR, account details and requires a reference number for GCash', async () => {
    const { user, submit, onSubmit } = await renderForm()

    await user.type(screen.getByLabelText('Full name'), validValues.fullName)
    await user.type(screen.getByLabelText('Email'), validValues.email)
    await user.type(screen.getByLabelText('Mobile number'), validValues.phone)
    await user.type(screen.getByLabelText('Street address'), validValues.addressLine)
    await user.type(screen.getByLabelText('Barangay'), validValues.barangay)
    await user.type(screen.getByLabelText('City / Municipality'), validValues.city)
    await user.type(screen.getByLabelText('Province'), validValues.province)
    await user.type(screen.getByLabelText('Postal code'), validValues.postalCode)

    // The instructions only appear once GCash is selected.
    expect(screen.queryByRole('img', { name: 'GCash QR code' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /^GCash/ }))

    const qr = screen.getByRole('img', { name: 'GCash QR code' })
    expect(qr).toHaveAttribute('src', SEED_SETTINGS.gcashQrUrl)
    expect(screen.getByText(SEED_SETTINGS.gcashAccountName)).toBeInTheDocument()
    expect(screen.getByText(SEED_SETTINGS.gcashNumber)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy gcash number' })).toBeInTheDocument()
    expect(screen.getByText('Found in your GCash receipt.')).toBeInTheDocument()

    await user.click(submit)
    expect(
      await screen.findByText('Enter the 8–20 character reference number from your GCash receipt.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('GCash reference number'), ' 1029384756123 ')
    await user.click(submit)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      paymentMethod: 'gcash',
      paymentReference: '1029384756123',
    })
  })

  it('hides GCash entirely until the store enables it and uploads a QR', async () => {
    settingsState.data = { ...SEED_SETTINGS, gcashEnabled: true, gcashQrUrl: null }
    await renderForm()

    expect(screen.queryByRole('radio', { name: /^GCash/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked()
  })

  it('disables the online payment option when the store turns it off', async () => {
    settingsState.data = { ...SEED_SETTINGS, onlinePaymentEnabled: false }
    await renderForm()

    const online = screen.getByRole('radio', { name: /online payment/i })
    expect(online).toBeDisabled()
    expect(screen.getByText('(currently unavailable)')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked()
  })

  // BUG: when store settings are already available on first render (e.g. a cached query)
  // and COD is disabled, CheckoutPaymentFields' effect switches paymentMethod to 'online',
  // but CheckoutForm's prefill effect (src/features/checkout/presentation/CheckoutForm.tsx,
  // `form.reset(defaults)` inside useEffect) runs afterwards in the same commit and resets
  // it back to 'cod'. The payment effect's deps do not change on the next render, so the
  // disabled COD option stays selected. It only works when settings arrive after mount.
  it('falls back to online payment when COD is disabled', async () => {
    settingsState.data = { ...SEED_SETTINGS, codEnabled: false }
    await renderForm()

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeDisabled()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /online payment/i })).toBeChecked(),
    )
  })

  it('blocks submission and explains why when a disabled reason is given', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(
      <CheckoutForm
        total={0}
        onSubmit={onSubmit}
        isSubmitting={false}
        disabledReason="Some items are unavailable."
      />,
    )
    const submit = await screen.findByRole('button', { name: /place order/i })
    expect(submit).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Some items are unavailable.')
  })

  it('shows the submit error returned by the server', async () => {
    renderWithProviders(
      <CheckoutForm
        total={0}
        onSubmit={vi.fn()}
        isSubmitting={false}
        submitError={new Error('Stock changed.')}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Stock changed.')
  })
})
