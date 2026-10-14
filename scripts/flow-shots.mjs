import { chromium } from '@playwright/test'
const base = process.env.BASE_URL ?? 'http://localhost:5174'
const out = process.argv[2]
const browser = await chromium.launch()
const errors = []
for (const [label, w] of [
  ['desktop', 1440],
  ['mobile', 390],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label} console: ${m.text().slice(0, 160)}`)
  })
  await page.goto(base + '/shop', { waitUntil: 'networkidle' })
  await page.locator('a[href^="/products/"]').first().click()
  await page.waitForLoadState('networkidle')
  const swatch = page
    .locator(
      '[role="radiogroup"] button:not([disabled]), button[aria-label^="Color"]:not([disabled])',
    )
    .first()
  // pick first enabled color then first enabled size
  const colorGroup = page.getByRole('radiogroup', { name: /colou?r/i })
  const sizeGroup = page.getByRole('radiogroup', { name: /size/i })
  await (
    (await colorGroup.count())
      ? colorGroup
          .getByRole('radio')
          .filter({ hasNot: page.locator('[disabled]') })
          .first()
      : swatch
  )
    .click()
    .catch(() => {})
  const sizeBtn = sizeGroup.getByRole('radio').filter({ hasNot: page.locator('[disabled]') })
  for (let i = 0; i < (await sizeBtn.count()); i++) {
    const b = sizeBtn.nth(i)
    if (await b.isEnabled()) {
      await b.click()
      break
    }
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${label}-flow-1-selected.png` })
  await page
    .getByRole('button', { name: /add to cart/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${label}-flow-2-added.png` })
  await page.goto(base + '/cart', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${label}-flow-3-cart.png`, fullPage: true })
  await page.goto(base + '/checkout', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${label}-flow-4-checkout.png`, fullPage: true })
  await page.getByRole('button', { name: /place order/i }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${label}-flow-5-checkout-errors.png`, fullPage: true })
  const fill = async (name, v) => page.getByLabel(name, { exact: false }).first().fill(v)
  await fill(/full name/i, 'Maria Santos')
  await fill(/^email/i, 'maria@example.com')
  await fill(/mobile|phone/i, '09171234567')
  await fill(/address line|street/i, '12 Mabini St.')
  await fill(/barangay/i, 'San Antonio')
  await fill(/city/i, 'Pasig')
  await fill(/province/i, 'Metro Manila')
  await fill(/postal/i, '1605')
  await page.getByRole('button', { name: /place order/i }).click()
  await page
    .waitForURL(/orders\/confirmation/, { timeout: 15000 })
    .catch(() => errors.push(`${label}: no confirmation redirect, url=${page.url()}`))
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${label}-flow-6-confirmation.png`, fullPage: true })
  await page.close()
}
await browser.close()
console.log(errors.length ? errors.join('\n') : 'NO ERRORS')
