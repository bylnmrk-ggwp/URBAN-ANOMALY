import { chromium } from '@playwright/test'
const base = process.env.BASE_URL ?? 'http://localhost:5174'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin@demo.local')
await page.getByRole('textbox', { name: /^password/i }).fill('password')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(2500)
console.log('URL after login:', page.url())
await browser.close()
