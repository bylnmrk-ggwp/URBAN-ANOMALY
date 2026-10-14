import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    console.log(m.type().toUpperCase(), m.text().slice(0, 300))
})
page.on('requestfailed', (r) =>
  console.log('REQFAIL', r.url().slice(0, 120), r.failure()?.errorText),
)
await page.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
console.log('TITLE', await page.title())
console.log('ROOT_HTML_LEN', (await page.locator('#root').innerHTML()).length)
console.log(
  'BODY_TEXT',
  (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' | '),
)
await browser.close()
