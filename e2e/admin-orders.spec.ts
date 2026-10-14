import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'password'
// First navigation also downloads the lazy route chunk; cold preview servers can be slow.
const FIRST_LOAD = 20_000

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
    timeout: FIRST_LOAD,
  })
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('admin confirms the first pending COD order', async ({ page, isMobile }) => {
  await test.step('login as admin', async () => {
    await login(page, 'admin@demo.local')
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  })

  await test.step('open the first pending order awaiting confirmation', async () => {
    await page.goto('/admin/orders?status=pending', { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible()

    // Desktop renders a table (row click navigates); mobile renders card links.
    const pendingCod = isMobile
      ? page.getByRole('link').filter({ hasText: 'Pending Confirmation' })
      : page.getByRole('row').filter({ hasText: 'Pending Confirmation' })
    const first = pendingCod.filter({ hasText: 'Cash on Delivery' }).first()
    await expect(first).toBeVisible()
    const orderNumber =
      (await first
        .getByText(/ORD-\d{4}-\d{5}/)
        .first()
        .textContent()) ?? ''
    await first.click()

    await expect(page).toHaveURL(/\/admin\/orders\/[^/]+$/)
    await expect(page.getByRole('heading', { level: 1, name: orderNumber })).toBeVisible()
    await expect(page.getByText('Current status: Pending Confirmation')).toBeVisible()
  })

  await test.step('confirm the order through the dialog', async () => {
    await expect(page.getByRole('button', { name: 'Mark Delivered' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Confirm Order' }).click()

    const dialog = page.getByRole('alertdialog', { name: 'Confirm this order?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Confirmed' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Current status: Confirmed')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark Processing' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm Order' })).toHaveCount(0)
    // The order_update notification says "...is now Confirmed." too, so match the toast.
    await expect(page.locator('[data-sonner-toast]').getByText(/is now Confirmed\./)).toBeVisible()
  })
})

test('buyer visiting /admin sees a 403 message', async ({ page }) => {
  await test.step('login as buyer', async () => {
    await login(page, 'buyer@demo.local')
    await expect(page).toHaveURL(/\/account$/)
  })

  await test.step('admin area is refused with an explicit message', async () => {
    await page.goto('/admin', { waitUntil: 'commit' })
    const alert = page.getByRole('alert')
    await expect(alert).toContainText("403 – You don't have access to the admin area")
    await expect(alert).toContainText('This section is reserved for store staff.')
    await expect(page.getByRole('link', { name: 'Back to store' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('button', { name: 'Open admin menu' })).toHaveCount(0)
  })
})
