import { expect, test, type Page } from '@playwright/test'

// First navigation also downloads the lazy route chunk; cold preview servers can be slow.
const FIRST_LOAD = 20_000
const PASSWORD = 'verify-me-1234'

/**
 * Mock mode has no mailbox, so `MockAuthRepository` logs the code it would have
 * mailed. Reading it back here is what lets the whole flow run end to end
 * without a Supabase project; Supabase mode sends the same six digits by email.
 */
function codeReader(page: Page, email: string): () => string | null {
  const needle = `[mock] verification code for ${email}: `
  let code: string | null = null
  page.on('console', (message) => {
    const text = message.text()
    const at = text.indexOf(needle)
    if (at >= 0) code = text.slice(at + needle.length).trim().slice(0, 6)
  })
  return () => code
}

function uniqueEmail(): string {
  return `buyer-${Date.now().toString(36)}@example.test`
}

test('a new buyer verifies the account with the emailed code, then signs in with it', async ({
  page,
}) => {
  const email = uniqueEmail()
  // The listener has to be attached before the form is submitted, because the
  // repository logs the code during sign-up.
  const latestCode = codeReader(page, email)

  await test.step('register', async () => {
    // A reload would reset the in-memory mock store and lose this account, so
    // every later step navigates inside the app rather than with goto.
    await page.goto('/register', { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({
      timeout: FIRST_LOAD,
    })
    await page.getByLabel('Full name').fill('Verification Tester')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Mobile number').fill('09170000123')
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Confirm password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
  })

  await test.step('sign-up routes to the code screen instead of signing in', async () => {
    await expect(page).toHaveURL(/\/verify-email$/)
    await expect(page.getByRole('heading', { name: 'Verify your account' })).toBeVisible()
    await expect(page.getByText(`We sent a 6-digit code to ${email}`)).toBeVisible()
    await expect.poll(latestCode).toMatch(/^\d{6}$/)
  })

  const firstCode = latestCode()
  if (!firstCode) throw new Error('the mock repository logged no verification code')

  await test.step('a wrong code is rejected and the account stays unverified', async () => {
    const field = page.getByLabel('Verification code')
    await field.fill(firstCode === '000000' ? '111111' : '000000')
    await page.getByRole('button', { name: 'Verify my account' }).click()
    await expect(page.getByRole('alert')).toHaveText(/That code is not correct/)
    await expect(page).toHaveURL(/\/verify-email$/)
  })

  await test.step('a resend issues a new code and retires the previous one', async () => {
    await page.getByRole('button', { name: 'Send me a new code' }).click()
    await expect(page.getByRole('status')).toHaveText(/a new code is on its way/)
    // The cooldown keeps a mistyped address from being used to flood a mailbox.
    await expect(page.getByRole('button', { name: /Resend code in \d+s/ })).toBeDisabled()
    await expect.poll(() => latestCode()).not.toBe(firstCode)

    await page.getByLabel('Verification code').fill(firstCode)
    await page.getByRole('button', { name: 'Verify my account' }).click()
    await expect(page.getByRole('alert')).toHaveText(/That code is not correct/)
  })

  await test.step('the current code verifies the account and opens it', async () => {
    const current = latestCode()
    if (!current) throw new Error('the resent verification code was not logged')
    await page.getByLabel('Verification code').fill(current)
    await page.getByRole('button', { name: 'Verify my account' }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  await test.step('the verified account can sign out and sign back in', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
      timeout: FIRST_LOAD,
    })
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/account$/)
  })
})

test('the code screen cannot be reached without an address to verify', async ({ page }) => {
  // The address travels in router state, so a direct visit has nothing to act
  // on and is sent back to registration rather than rendering an empty form.
  await page.goto('/verify-email', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({
    timeout: FIRST_LOAD,
  })
  await expect(page).toHaveURL(/\/register$/)
})
