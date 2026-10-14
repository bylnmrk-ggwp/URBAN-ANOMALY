import { expect, test, type Page } from '@playwright/test'

const ORDER_NUMBER = /ORD-\d{4}-\d{5}/
// First navigation also downloads the lazy route chunk; cold preview servers can be slow.
const FIRST_LOAD = 20_000

async function openShop(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Shop' }).click()
  } else {
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Shop' })
      .click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Shop' })).toBeVisible()
}

test('buyer can add a product and place a Cash on Delivery order', async ({ page, isMobile }) => {
  await test.step('home -> shop', async () => {
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: FIRST_LOAD })
    await openShop(page, isMobile)
  })

  await test.step('open the first in-stock product', async () => {
    await expect(page.getByRole('status').filter({ hasText: /\d+ products/ })).toBeVisible()
    const inStockCard = page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { level: 3 }) })
      .filter({ hasNotText: 'Sold out' })
      .first()
    await inStockCard.click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: FIRST_LOAD })
    await expect(page.getByRole('radiogroup', { name: 'Color' })).toBeVisible()
  })

  await test.step('pick an available colour and size, then add to cart', async () => {
    const addToCart = page.getByRole('button', { name: 'Add to cart' }).first()
    await expect(addToCart).toBeDisabled()

    await page
      .getByRole('radiogroup', { name: 'Color' })
      .getByRole('radio')
      .and(page.locator(':enabled'))
      .first()
      .click()
    await page
      .getByRole('radiogroup', { name: 'Size' })
      .getByRole('radio')
      .and(page.locator(':enabled'))
      .first()
      .click()

    await expect(addToCart).toBeEnabled()
    await addToCart.click()
    await expect(page.getByLabel('1 item in cart')).toBeVisible()
  })

  await test.step('cart -> checkout', async () => {
    // Adding an item opens the cart drawer; checkout starts from there.
    const drawer = page.getByRole('dialog', { name: 'Your cart' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('1 items')).toBeVisible()
    await drawer.getByRole('link', { name: 'Check out' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible()
  })

  await test.step('fill the form and place a COD order', async () => {
    await page.getByLabel('Full name').fill('Juan Dela Cruz')
    await page.getByLabel('Email', { exact: true }).fill('juan.e2e@example.com')
    await page.getByLabel('Mobile number').fill('09171234567')
    await page.getByLabel('Street address').fill('88 Kalayaan Avenue')
    await page.getByLabel('Barangay').fill('Poblacion')
    await page.getByLabel('City / Municipality').fill('Makati City')
    await page.getByLabel('Province').fill('Metro Manila')
    await page.getByLabel('Postal code').fill('1605')

    const cod = page.getByRole('radio', { name: /Cash on Delivery/ })
    await cod.click()
    await expect(cod).toBeChecked()

    const placeOrder = page.getByRole('button', { name: /Place order/ })
    await expect(placeOrder).toBeEnabled()
    await placeOrder.click()
  })

  await test.step('confirmation shows the order number and payment method', async () => {
    await expect(page).toHaveURL(/\/orders\/confirmation\/ORD-\d{4}-\d{5}$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Thank you for your order' }),
    ).toBeVisible()
    await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible()
    await expect(page.getByText('Cash on Delivery', { exact: true })).toBeVisible()
    await expect(page.getByText(/Order placed — pay ₱[\d,.]+ on delivery\./)).toBeVisible()
    // The cart was cleared by the successful order.
    await expect(page.getByLabel(/items? in cart/)).toHaveCount(0)
  })
})
