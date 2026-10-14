import { chromium } from '@playwright/test'
const base = process.env.BASE_URL ?? 'http://localhost:5174'
const out = process.argv[2]
const browser = await chromium.launch()
for (const [label, w] of [['phone', 402], ['tablet', 1280], ['narrow', 320]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 874 } })
  await page.goto(base + '/cart', { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const dialog = await page.getByRole('dialog', { name: 'Your cart' }).isVisible().catch(() => false)
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  console.log(label, 'url', new URL(page.url()).pathname, 'drawer', dialog, 'scrollWidth', sw)
  await page.screenshot({ path: `${out}/cart-route-${label}.png` })
  await page.close()
}
await browser.close()
