/**
 * Responsive sweep: visits every route at every target width, reports horizontal overflow,
 * console errors, and the widest offending element. Usage:
 *   node scripts/responsive-sweep.mjs [--base http://localhost:5174] [--only storefront|admin] [--widths 320,768]
 */
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5174'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : 'all'

const ALL_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]
// --widths 320,768 runs a slice; useful when memory is tight.
const WIDTHS = args.includes('--widths')
  ? args[args.indexOf('--widths') + 1].split(',').map(Number)
  : ALL_WIDTHS

const storefront = [
  '/',
  '/shop',
  '/shop?q=tee',
  '/collections/clogs',
  '/products/__first__',
  '/cart',
  '/cart?__fill__',
  '/checkout?__fill__',
  '/about',
  '/login',
  '/register',
  '/forgot-password',
  '/track',
  '/wishlist',
  '/pages/does-not-exist',
  '/account',
  '/account/orders',
  '/account/orders/__first__',
]

const admin = [
  '/admin/dashboard',
  '/admin/content',
  '/admin/editor?doc=page:home',
  '/admin/editor?doc=page:about',
  '/admin/content/revisions?doc=page:home',
  '/admin/media',
  '/admin/navigation',
  '/admin/theme',
  '/admin/announcement',
  '/admin/products',
  '/admin/products/new',
  '/admin/products/__first__/edit',
  '/admin/categories',
  '/admin/inventory',
  '/admin/stock-alerts',
  '/admin/orders',
  '/admin/orders/__first__',
  '/admin/orders/__first__/packing-slip',
  '/admin/returns',
  '/admin/reviews',
  '/admin/discounts',
  '/admin/customers',
  '/admin/team',
  '/admin/settings',
]

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page
    .locator('text=Loading…')
    .first()
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => {})
  await page.waitForTimeout(350)
}

async function signIn(page, email) {
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: /^password/i }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
}

async function fillCart(page) {
  await page.goto(base + '/shop', { waitUntil: 'networkidle' })
  const href = await page.locator('a[href^="/products/"]').first().getAttribute('href')
  await page.goto(base + href, { waitUntil: 'networkidle' })
  await settle(page)
  const color = page.getByRole('radiogroup', { name: /colou?r/i }).getByRole('radio')
  for (let i = 0; i < (await color.count()); i++) {
    if (await color.nth(i).isEnabled()) {
      await color.nth(i).click()
      break
    }
  }
  const size = page.getByRole('radiogroup', { name: /size/i }).getByRole('radio')
  for (let i = 0; i < (await size.count()); i++) {
    if (await size.nth(i).isEnabled()) {
      await size.nth(i).click()
      break
    }
  }
  await page
    .getByRole('button', { name: /add to cart/i })
    .first()
    .click()
  await page.waitForTimeout(500)
}

async function resolve(page, path) {
  if (path.includes('/products/__first__')) {
    await page.goto(base + '/shop', { waitUntil: 'networkidle' })
    const href = await page.locator('a[href^="/products/"]').first().getAttribute('href')
    return href ?? '/shop'
  }
  if (path.startsWith('/account/orders/__first__')) {
    await page.goto(base + '/account/orders', { waitUntil: 'networkidle' })
    await settle(page)
    const href = await page
      .locator('a[href^="/account/orders/"]')
      .first()
      .getAttribute('href')
      .catch(() => null)
    return href ?? '/account/orders'
  }
  if (path.includes('/admin/orders/__first__')) {
    await page.goto(base + '/admin/orders', { waitUntil: 'networkidle' })
    await settle(page)
    const href = await page.locator('a[href^="/admin/orders/"]').first().getAttribute('href')
    return path.replace('/admin/orders/__first__', href ?? '/admin/orders')
  }
  if (path.includes('/admin/products/__first__')) {
    await page.goto(base + '/admin/products', { waitUntil: 'networkidle' })
    await settle(page)
    const href = await page
      .locator('a[href$="/edit"]')
      .first()
      .getAttribute('href')
      .catch(() => null)
    return href ?? '/admin/products'
  }
  return path.replace('?__fill__', '')
}

const browser = await chromium.launch()
const report = []
const groups = []
if (only === 'all' || only === 'storefront') groups.push(['buyer', storefront])
if (only === 'all' || only === 'admin') groups.push(['admin', admin])

for (const [role, paths] of groups) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)))
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|401|net::ERR/i.test(m.text()))
        errors.push(m.text().slice(0, 120))
    })
    await signIn(page, role === 'admin' ? 'admin@demo.local' : 'buyer@demo.local')
    let cartFilled = false
    for (const raw of paths) {
      try {
        if (raw.includes('__fill__') && !cartFilled) {
          await fillCart(page)
          cartFilled = true
        }
        const path = await resolve(page, raw)
        errors.length = 0
        await page.goto(base + path, { waitUntil: 'networkidle' })
        await settle(page)
        const result = await page.evaluate(() => {
          const vw = window.innerWidth
          const sw = document.documentElement.scrollWidth
          let worst = null
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect()
            if (r.right > vw + 1 && r.width > 0 && r.width < 20000) {
              if (!worst || r.right > worst.right) {
                worst = {
                  right: Math.round(r.right),
                  tag: el.tagName.toLowerCase(),
                  cls: (el.getAttribute('class') ?? '').slice(0, 70),
                }
              }
            }
          }
          return { vw, sw, worst }
        })
        const status = page.url().includes('/login') && !path.startsWith('/login') ? 'REDIRECT' : ''
        if (result.sw > result.vw + 1 || errors.length || status) {
          report.push({
            role,
            width,
            path: raw,
            sw: result.sw,
            vw: result.vw,
            worst: result.worst,
            errors: [...errors],
            status,
          })
        }
      } catch (e) {
        report.push({ role, width, path: raw, error: String(e).slice(0, 160) })
      }
    }
    await ctx.close()
  }
  process.stdout.write(`${role} done\n`)
}
await browser.close()

if (report.length === 0) {
  console.log('CLEAN: no overflow, no console errors on any route at any width')
} else {
  for (const r of report) {
    if (r.error) console.log(`${r.role} ${r.width} ${r.path} :: SCRIPT ${r.error}`)
    else
      console.log(
        `${r.role} ${r.width} ${r.path} :: sw=${r.sw}/${r.vw} ${r.status} ${r.worst ? `<${r.worst.tag} class="${r.worst.cls}"> right=${r.worst.right}` : ''} ${r.errors.length ? 'ERRORS: ' + r.errors.join(' | ') : ''}`,
      )
  }
}
