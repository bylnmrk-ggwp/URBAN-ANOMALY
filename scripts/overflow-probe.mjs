import { chromium } from '@playwright/test'
const [url, w = '390'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: 844 } })
await page.goto(url, { waitUntil: 'networkidle' })
if (url.includes('/admin')) {
  await page.goto(new URL('/login', url).href, { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin@demo.local')
  await page.getByRole('textbox', { name: /^password/i }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/admin/)
  await page.goto(url, { waitUntil: 'networkidle' })
}
await page
  .locator('text=Loading…')
  .first()
  .waitFor({ state: 'detached', timeout: 15000 })
  .catch(() => {})
await page.waitForTimeout(500)
const wide = await page.evaluate(() => {
  const vw = window.innerWidth
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 && r.width > 0) {
      const cls = (el.getAttribute('class') ?? '').slice(0, 80)
      out.push(
        `${el.tagName.toLowerCase()} right=${Math.round(r.right)} w=${Math.round(r.width)} class="${cls}"`,
      )
    }
  }
  return { vw, sw: document.documentElement.scrollWidth, out: out.slice(0, 12) }
})
console.log(JSON.stringify(wide, null, 1))
await browser.close()
