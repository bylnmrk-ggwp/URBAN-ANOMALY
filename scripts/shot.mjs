import { chromium } from '@playwright/test'
const [url, w, out, full] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: 844 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page
  .locator('text=Loading…')
  .first()
  .waitFor({ state: 'detached', timeout: 15000 })
  .catch(() => {})
// Scroll through the page so IntersectionObserver reveals fire before capture.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 120))
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: full === 'full' })
await browser.close()
