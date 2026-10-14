// Adds a Gallery and an FAQ section to the home page in the visual editor, screenshots the
// 390 px preview, then checks nothing overflows at 320 px (editor, section sheet, preview).
// Usage: node scripts/cms-sections-probe.mjs <out-dir>
import { chromium } from '@playwright/test'

const base = process.env.BASE_URL ?? 'http://localhost:5174'
const out = process.argv[2] ?? '.'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200))
})

const measure = (root) =>
  root.evaluate(() => {
    const vw = window.innerWidth
    const wide = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 && r.width > 0) {
        wide.push(
          `${el.tagName.toLowerCase()} right=${Math.round(r.right)} w=${Math.round(r.width)} class="${(el.getAttribute('class') ?? '').slice(0, 80)}"`,
        )
      }
    }
    return { vw, sw: document.documentElement.scrollWidth, wide: wide.slice(0, 8) }
  })

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin@demo.local')
await page.getByRole('textbox', { name: /^password/i }).fill('password')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForURL(/admin/)
await page.goto(base + '/admin/editor?doc=page:home', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// Add a gallery and give it two real images through the URL popover.
await page.getByRole('button', { name: 'Add section' }).click()
await page.getByRole('menuitem', { name: /^Gallery/ }).click()
await page.waitForTimeout(600)
const settings = page.getByRole('region', { name: 'Section settings' })
const urls = [
  'https://images.pexels.com/photos/12922455/pexels-photo-12922455.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/13066629/pexels-photo-13066629.jpeg?auto=compress&cs=tinysrgb&w=900',
]
for (let i = 0; i < urls.length; i++) {
  await settings.getByRole('button', { name: 'Use URL' }).nth(i).click()
  await page.getByLabel('Image URL').fill(urls[i])
  await page.getByRole('button', { name: 'Use this URL' }).click()
  await page.waitForTimeout(300)
}
await settings.getByLabel('Caption').first().fill('Linen in the workshop')

// Then an FAQ.
await page.getByRole('button', { name: 'Add section' }).click()
await page.getByRole('menuitem', { name: /^FAQ/ }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/sections-1-editor.png` })

// Preview at 390 through the device switcher.
await page.getByRole('radio', { name: 'Mobile (390px)' }).click()
await page.waitForTimeout(1500)
const frame = page.frameLocator('iframe[title="Page preview"]')
await frame.locator('text=Frequently asked questions').first().waitFor({ timeout: 10000 })
const previewFrame = await (await page.$('iframe[title="Page preview"]'))?.contentFrame()
const preview390 = previewFrame ? await measure(previewFrame) : 'NO PREVIEW FRAME'
console.log('PREVIEW 390:', JSON.stringify(preview390))
await page.screenshot({ path: `${out}/sections-2-preview-390.png` })
await frame.locator('text=Frequently asked questions').first().scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/sections-3-preview-390-faq.png` })

// Editor page at 320 (no reload: local edits live in memory).
await page.setViewportSize({ width: 320, height: 720 })
await page.waitForTimeout(1200)
// The selected section opens as a bottom sheet below lg; close it to measure the bare editor.
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
console.log('EDITOR 320:', JSON.stringify(await measure(page)))
await page.screenshot({ path: `${out}/sections-4-editor-320.png`, fullPage: true })

// Open the gallery row so the sheet shows the GalleryForm, then measure again.
await page
  .getByRole('button', { name: /^Gallery/ })
  .first()
  .click()
await page.waitForTimeout(800)
console.log('EDITOR 320 + SHEET:', JSON.stringify(await measure(page)))
await page.screenshot({ path: `${out}/sections-5-sheet-320.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await page.getByRole('button', { name: /^FAQ/ }).first().click()
await page.waitForTimeout(800)
console.log('EDITOR 320 + FAQ SHEET:', JSON.stringify(await measure(page)))
await page.screenshot({ path: `${out}/sections-6-faq-sheet-320.png` })

await browser.close()
console.log(errors.length ? errors.join('\n') : 'NO ERRORS')
