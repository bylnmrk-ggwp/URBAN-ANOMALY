import { chromium } from '@playwright/test'
const base = process.env.BASE_URL ?? 'http://localhost:5174'
const out = process.argv[2]
const pages = [
  ['home', '/'],
  ['shop', '/shop'],
  ['product', '/shop'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['login', '/login'],
  ['about', '/about'],
]
async function settle(page) {
  await page.waitForLoadState('networkidle')
  await page
    .locator('text=Loading…')
    .first()
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => {})
  await page.waitForTimeout(400)
}
const browser = await chromium.launch()
const errors = []
for (const [label, w, h] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label} console: ${m.text().slice(0, 200)}`)
  })
  for (const [name, path] of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    if (name === 'product') {
      const link = page.locator('a[href^="/products/"]').first()
      await link.click()
      await page.waitForLoadState('networkidle')
    }
    await settle(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    if (overflow > 1) errors.push(`${label} ${name}: horizontal overflow ${overflow}px`)
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: name !== 'home' })
  }
  // admin
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin@demo.local')
  await page.getByRole('textbox', { name: /^password/i }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page
    .waitForURL(/admin/, { timeout: 10000 })
    .catch(() => errors.push(`${label}: admin login did not redirect, url=${page.url()}`))
  for (const [name, path] of [
    ['dashboard', '/admin/dashboard'],
    ['products', '/admin/products'],
    ['product-form', '/admin/products/new'],
    ['inventory', '/admin/inventory'],
    ['orders', '/admin/orders'],
    ['customers', '/admin/customers'],
    ['settings', '/admin/settings'],
  ]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await settle(page)
    if (name === 'orders') {
      const link = page.locator('a[href^="/admin/orders/"]').first()
      if (await link.count()) {
        await page.goto(base + (await link.getAttribute('href')))
        await settle(page)
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${out}/${label}-admin-order-details.png`, fullPage: true })
        await page.goto(base + path, { waitUntil: 'networkidle' })
      }
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    if (overflow > 1) errors.push(`${label} admin ${name}: horizontal overflow ${overflow}px`)
    await page.screenshot({ path: `${out}/${label}-admin-${name}.png`, fullPage: true })
  }
  await ctx.close()
}
await browser.close()
console.log(errors.length ? errors.join('\n') : 'NO ERRORS')
