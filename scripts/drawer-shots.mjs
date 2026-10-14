import { chromium } from '@playwright/test'
const base = process.env.BASE_URL ?? 'http://localhost:5174'
const out = process.argv[2]
const browser = await chromium.launch()
for (const [label, w] of [
  ['desktop', 1440],
  ['mobile', 390],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Cart', exact: true }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${label}-drawer-empty.png` })
  await page.keyboard.press('Escape')
  await page.goto(base + '/shop', { waitUntil: 'networkidle' })
  const href = (await page.locator('a[href^="/products/"]').first().getAttribute('href')) ?? '/shop'
  await page.goto(base + href, { waitUntil: 'networkidle' })
  // Try colour/size combinations until Add to cart enables.
  const colors = page.getByRole('radiogroup', { name: /colou?r/i }).getByRole('radio')
  const sizes = page.getByRole('radiogroup', { name: /size/i }).getByRole('radio')
  const add = page.getByRole('button', { name: /add to cart/i }).first()
  outer: for (let c = 0; c < (await colors.count()); c++) {
    if (!(await colors.nth(c).isEnabled())) continue
    await colors.nth(c).click()
    for (let i = 0; i < (await sizes.count()); i++) {
      if (!(await sizes.nth(i).isEnabled())) continue
      await sizes.nth(i).click()
      if (await add.isEnabled()) break outer
    }
  }
  await page
    .getByRole('button', { name: /add to cart/i })
    .first()
    .click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${label}-drawer-filled.png` })
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  console.log(label, 'drawer open scrollWidth', sw)
  await page.close()
}
await browser.close()
