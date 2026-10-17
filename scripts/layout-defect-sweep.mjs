/**
 * Layout defect sweep. Visits every route at every target width and reports the things
 * that actually break a layout: horizontal page overflow, buttons whose label escapes or
 * is clipped by its box, cards and grid tiles whose content escapes or is cut off,
 * fixed/sticky chrome sitting on top of an interactive control, page and console errors,
 * failed requests, and routes that fall through to the not-found or error screen.
 *
 * It extends scripts/responsive-sweep.mjs with the per-element audits and a screenshot
 * per route per width.
 *
 * Usage:
 *   BASE_URL=http://localhost:4173 node scripts/layout-defect-sweep.mjs <out-dir> [--widths 320,768] [--only storefront|admin]
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const out = args[0]
if (!out) {
  console.error('usage: node scripts/layout-defect-sweep.mjs <out-dir> [--widths ...] [--only ...]')
  process.exit(1)
}
const base = process.env.BASE_URL ?? 'http://localhost:4173'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : 'all'

const ALL_VIEWPORTS = [
  { width: 320, height: 874 },
  { width: 402, height: 874 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1280, height: 900 },
  { width: 1920, height: 900 },
]
const VIEWPORTS = args.includes('--widths')
  ? args[args.indexOf('--widths') + 1]
      .split(',')
      .map(Number)
      .map((w) => ALL_VIEWPORTS.find((v) => v.width === w) ?? { width: w, height: 900 })
  : ALL_VIEWPORTS

/** Slugs and ids below come from src/mocks/data/ so every page loads populated. */
const storefront = [
  ['home', '/'],
  ['shop', '/shop'],
  ['shop-search', '/shop?q=clog'],
  ['collection-clogs', '/collections/clogs'],
  ['collection-straps', '/collections/straps-accessories'],
  ['product-lava-clog', '/products/lava-premium-clog'],
  ['product-strap-set', '/products/replacement-strap-set'],
  ['cart-empty', '/cart'],
  ['cart-filled', '/cart?__fill__'],
  ['checkout', '/checkout?__fill__'],
  ['order-confirmation', '/orders/confirmation/__ordernumber__'],
  ['about', '/about'],
  ['cms-page-about', '/pages/about'],
  ['cms-page-home', '/pages/home'],
  ['wishlist', '/wishlist?__wish__'],
  ['track', '/track'],
  ['account', '/account'],
  ['account-orders', '/account/orders'],
  ['account-order-details', '/account/orders/__buyerorder__'],
  ['account-wishlist', '/account/wishlist'],
  ['not-found', '/this-route-does-not-exist'],
]

/** Routes that only make sense signed out; a signed-in context is bounced to /account. */
const guest = [
  ['login', '/login'],
  ['register', '/register'],
  ['verify-email', '/verify-email'],
  ['forgot-password', '/forgot-password'],
  ['account-guard-redirect', '/account'],
]

const admin = [
  ['admin-root-redirect', '/admin'],
  ['admin-dashboard', '/admin/dashboard'],
  ['admin-products', '/admin/products'],
  ['admin-product-new', '/admin/products/new'],
  ['admin-product-edit', '/admin/products/prod-01/edit'],
  ['admin-categories', '/admin/categories'],
  ['admin-inventory', '/admin/inventory'],
  ['admin-orders', '/admin/orders'],
  ['admin-order-details', '/admin/orders/ord-01'],
  ['admin-packing-slip', '/admin/orders/ord-01/packing-slip'],
  ['admin-customers', '/admin/customers'],
  ['admin-settings', '/admin/settings'],
  ['admin-media', '/admin/media'],
  ['admin-navigation', '/admin/navigation'],
  ['admin-theme', '/admin/theme'],
  ['admin-announcement', '/admin/announcement'],
  ['admin-content', '/admin/content'],
  ['admin-revisions', '/admin/content/revisions?doc=page%3Ahome'],
  ['admin-editor-home', '/admin/editor?doc=page%3Ahome'],
  ['admin-editor-about', '/admin/editor?doc=page%3Aabout'],
  ['admin-reviews', '/admin/reviews'],
  ['admin-returns', '/admin/returns'],
  ['admin-stock-alerts', '/admin/stock-alerts'],
  ['admin-discounts', '/admin/discounts'],
  ['admin-team', '/admin/team'],
]

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page
    .locator('text=Loading…')
    .first()
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => {})
  await page.waitForTimeout(400)
}

async function signIn(page, email) {
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: /^password/i }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
}

/** Adds one line to the cart so /cart and /checkout render populated. Never submits the order. */
async function fillCart(page) {
  await page.goto(base + '/products/lava-premium-clog', { waitUntil: 'networkidle' })
  await settle(page)
  for (const name of [/colou?r/i, /size/i]) {
    const radios = page.getByRole('radiogroup', { name }).getByRole('radio')
    const count = await radios.count().catch(() => 0)
    for (let i = 0; i < count; i++) {
      if (await radios.nth(i).isEnabled()) {
        await radios.nth(i).click()
        break
      }
    }
  }
  await page
    .getByRole('button', { name: /add to cart/i })
    .first()
    .click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape').catch(() => {})
}

/** Hearts one product so the wishlist route is not an empty state. */
async function fillWishlist(page) {
  await page.goto(base + '/shop', { waitUntil: 'networkidle' })
  await settle(page)
  const toggle = page.locator('button[aria-label*="wishlist" i]').first()
  if (await toggle.count()) await toggle.click()
  await page.waitForTimeout(400)
}

const resolved = {}

async function resolvePlaceholders(page, role) {
  if (role === 'buyer') {
    await page.goto(base + '/account/orders', { waitUntil: 'networkidle' })
    await settle(page)
    const href = await page
      .locator('a[href^="/account/orders/"]')
      .first()
      .getAttribute('href')
      .catch(() => null)
    resolved.buyerorder = href ? href.split('/').pop() : null
    const body = await page.locator('body').innerText()
    const match = body.match(/ORD-\d{4}-\d{5}/)
    resolved.ordernumber = match ? match[0] : null
  }
}

function applyPlaceholders(path) {
  return path
    .replace('__buyerorder__', resolved.buyerorder ?? 'ord-01')
    .replace('__ordernumber__', resolved.ordernumber ?? 'ORD-0000-00000')
    .replace('?__fill__', '')
    .replace('?__wish__', '')
}

/**
 * Runs in the page. Returns every layout defect it can see at the current viewport.
 * Thresholds are deliberately above a pixel of rounding so sub-pixel noise stays out.
 */
const audit = (opts) => {
  const { smallScreen } = opts
  const de = document.documentElement
  const vw = de.clientWidth
  const vh = de.clientHeight
  const EPS = 2

  const describe = (el) => {
    if (!el || el === document.documentElement) return 'html'
    const parts = [el.tagName.toLowerCase()]
    if (el.id) parts.push('#' + el.id)
    const slot = el.getAttribute?.('data-slot')
    if (slot) parts.push(`[data-slot="${slot}"]`)
    const cls = (el.getAttribute?.('class') ?? '').trim()
    if (cls) parts.push('.' + cls.split(/\s+/).slice(0, 6).join('.'))
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 48)
    return parts.join('') + (text ? ` « ${text} »` : '')
  }

  // checkVisibility walks the ancestor chain, so an element hidden by a `md:hidden`
  // parent is correctly treated as not rendered at this width.
  const rendered = (el) =>
    typeof el.checkVisibility === 'function'
      ? el.checkVisibility({ checkVisibilityCSS: true })
      : getComputedStyle(el).display !== 'none'

  const visible = (el) => {
    if (!rendered(el)) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  /** Visually-hidden helpers (`sr-only`) are 1px clipped boxes; they are not layout defects. */
  const srOnly = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.classList?.contains('sr-only')) return true
    }
    const r = el.getBoundingClientRect()
    return r.width <= 2 || r.height <= 2
  }

  /** A carousel or table that scrolls sideways is allowed to hold content past the edge. */
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX
      if (ox === 'auto' || ox === 'scroll') return n
    }
    return null
  }

  /** True while a modal (dialog, sheet, drawer) has marked the rest of the page inert. */
  const behindModal = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n.getAttribute?.('aria-hidden') === 'true' || n.hasAttribute?.('inert')) return true
    }
    return false
  }

  const defects = []
  const push = (kind, severity, el, detail, extra = {}) =>
    defects.push({ kind, severity, element: describe(el), detail, ...extra })

  // 1. Horizontal page overflow, attributed to the widest element past the right edge.
  const pageOverflow = de.scrollWidth - de.clientWidth
  if (pageOverflow > EPS) {
    let worst = null
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.width > 20000) continue
      if (inScroller(el)) continue
      if (r.right > vw + 1 && (!worst || r.right > worst.right)) worst = { el, right: r.right }
    }
    push(
      'page-overflow',
      'high',
      worst?.el,
      `document scrollWidth ${de.scrollWidth} vs clientWidth ${de.clientWidth} (+${Math.round(pageOverflow)}px); widest element right edge ${worst ? Math.round(worst.right) : '?'}px`,
      { overflowPx: Math.round(pageOverflow) },
    )
  }

  // Measures how far a box's own content spills out of its padding box. Needed because a
  // button with overflow:visible reports scrollWidth === clientWidth even while the label
  // hangs outside, so scrollWidth alone misses clipped and escaping labels.
  // Spill is measured against the border box — the visible edge of the control — so a
  // label that merely eats into its own padding is not reported.
  const contentSpill = (el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const left = r.left
    const right = r.right
    const bottom = r.bottom
    let maxRight = -Infinity
    let minLeft = Infinity
    let maxBottom = -Infinity
    const rects = []
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        if (!node.textContent.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        rects.push(...range.getClientRects())
      } else if (node.nodeType === 1) {
        if (getComputedStyle(node).position === 'absolute') continue
        rects.push(node.getBoundingClientRect())
      }
    }
    for (const rc of rects) {
      if (rc.width === 0 && rc.height === 0) continue
      maxRight = Math.max(maxRight, rc.right)
      minLeft = Math.min(minLeft, rc.left)
      maxBottom = Math.max(maxBottom, rc.bottom)
    }
    if (maxRight === -Infinity) return null
    return {
      overRight: maxRight - right,
      overLeft: left - minLeft,
      overBottom: maxBottom - bottom,
      cs,
      rect: r,
    }
  }

  // 2. Buttons and links styled as buttons.
  const buttonNodes = new Set(
    document.querySelectorAll(
      '[data-slot="button"], button, [role="button"], input[type="submit"], input[type="button"]',
    ),
  )
  const buttons = [...buttonNodes].filter(visible)
  for (const el of buttons) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const spill = contentSpill(el)
    const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    const clipped = cs.overflowX !== 'visible' && el.scrollWidth - el.clientWidth > EPS
    if (clipped && cs.textOverflow !== 'ellipsis') {
      push(
        'button-clipped',
        'high',
        el,
        `label is cut off: scrollWidth ${el.scrollWidth} vs clientWidth ${el.clientWidth} with overflow-x:${cs.overflowX}`,
      )
    }
    if (spill && (spill.overRight > EPS || spill.overLeft > EPS)) {
      push(
        'button-label-escapes',
        'high',
        el,
        `label overhangs the button box horizontally by ${Math.round(Math.max(spill.overRight, spill.overLeft))}px (button ${Math.round(r.width)}px wide, label "${label}")`,
      )
    }
    if (spill && spill.overBottom > EPS) {
      push(
        'button-label-escapes',
        'high',
        el,
        `label overhangs the button box vertically by ${Math.round(spill.overBottom)}px — the text wraps but the height is fixed (button ${Math.round(r.height)}px tall, label "${label}")`,
      )
    }
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el) && !behindModal(el)) {
      push(
        'button-offscreen',
        'high',
        el,
        `button box sits outside the viewport: left ${Math.round(r.left)}, right ${Math.round(r.right)}, viewport ${vw}`,
      )
    }
    if (smallScreen && (r.width < 44 || r.height < 44)) {
      push(
        'tap-target',
        'low',
        el,
        `tap target ${Math.round(r.width)}x${Math.round(r.height)} is under 44x44`,
        { w: Math.round(r.width), h: Math.round(r.height) },
      )
    }
  }
  // Zero-size buttons are checked separately because `visible` filters them out.
  for (const el of buttonNodes) {
    if (!rendered(el) || getComputedStyle(el).visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) {
      push(
        'button-zero-size',
        'medium',
        el,
        `rendered but collapsed to ${Math.round(r.width)}x${Math.round(r.height)}`,
      )
    }
  }
  // Overlapping buttons under the same parent.
  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i]
      const b = buttons[j]
      if (a.parentElement !== b.parentElement) continue
      if (a.contains(b) || b.contains(a)) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const ow = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const oh = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (ow > 2 && oh > 2) {
        const area = ow * oh
        const smaller = Math.min(ra.width * ra.height, rb.width * rb.height)
        if (smaller > 0 && area / smaller > 0.25) {
          push(
            'button-overlap',
            'high',
            a,
            `overlaps sibling ${describe(b)} by ${Math.round(ow)}x${Math.round(oh)}px`,
          )
        }
      }
    }
  }

  // 3. Cards and grid/flex tiles.
  const tiles = new Set(document.querySelectorAll('[data-slot="card"]'))
  for (const container of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(container)
    if (cs.display !== 'grid' && cs.display !== 'inline-grid') continue
    // A grid whose own row is wider than its box, with no scroll container to absorb it.
    if (
      container.scrollWidth - container.clientWidth > EPS &&
      (cs.overflowX === 'visible' || cs.overflowX === 'hidden' || cs.overflowX === 'clip')
    ) {
      push(
        'grid-row-too-wide',
        'high',
        container,
        `grid row is ${container.scrollWidth}px inside a ${container.clientWidth}px box with overflow-x:${cs.overflowX} — the row cannot fit and nothing can scroll it`,
      )
    }
    for (const child of container.children) tiles.add(child)
  }
  const FORM_CONTROL = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  for (const el of tiles) {
    // Form controls scroll their own value; a long value in a short field is not a defect.
    if (FORM_CONTROL.has(el.tagName)) continue
    if (!visible(el) || srOnly(el) || behindModal(el)) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.right > vw + 1 && !inScroller(el)) {
      push(
        'card-offscreen',
        'high',
        el,
        `card/tile extends past the right edge: right ${Math.round(r.right)} vs viewport ${vw} (width ${Math.round(r.width)})`,
      )
    }
    const hiddenX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
    const hiddenY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    if (hiddenY && el.scrollHeight - el.clientHeight > 4 && (el.textContent ?? '').trim()) {
      push(
        'card-text-clipped',
        'medium',
        el,
        `content is ${el.scrollHeight}px tall inside a ${el.clientHeight}px box with overflow-y:${cs.overflowY} — ${el.scrollHeight - el.clientHeight}px is cut off`,
      )
    }
    if (hiddenX && el.scrollWidth - el.clientWidth > 4) {
      push(
        'card-text-clipped',
        'medium',
        el,
        `content is ${el.scrollWidth}px wide inside a ${el.clientWidth}px box with overflow-x:${cs.overflowX}`,
      )
    }
    if (!hiddenX && cs.overflowX === 'visible') {
      let worst = 0
      let worstEl = null
      for (const d of el.querySelectorAll('*')) {
        const dcs = getComputedStyle(d)
        if (dcs.position === 'absolute' || dcs.position === 'fixed') continue
        if (!rendered(d)) continue
        const scroller = inScroller(d)
        if (scroller && el.contains(scroller)) continue
        const dr = d.getBoundingClientRect()
        if (dr.width === 0) continue
        const over = dr.right - r.right
        if (over > worst) {
          worst = over
          worstEl = d
        }
      }
      if (worst > 4) {
        push(
          'card-content-escapes',
          'high',
          el,
          `descendant ${describe(worstEl)} sticks out ${Math.round(worst)}px past the card's right edge`,
        )
      }
    }
  }

  // Images with no intrinsic size, which collapse or blow out the box around them.
  for (const img of document.querySelectorAll('img')) {
    if (!rendered(img)) continue
    const r = img.getBoundingClientRect()
    if (img.complete && img.naturalWidth === 0) {
      push(
        'image-no-intrinsic-size',
        'medium',
        img,
        `image finished loading with naturalWidth 0 (src ${(img.currentSrc || img.src || '(none)').slice(-70)}), box is ${Math.round(r.width)}x${Math.round(r.height)}`,
      )
    } else if (r.height <= 1 && r.width > 1) {
      push(
        'image-no-intrinsic-size',
        'medium',
        img,
        `image box collapsed to ${Math.round(r.width)}x${Math.round(r.height)}`,
      )
    }
  }

  // 4. Fixed/sticky chrome on top of an interactive control. Hit-tested, not guessed:
  // if the centre of a control resolves to a different element that lives under fixed or
  // sticky positioning, the control cannot be used at this width.
  const controls = [
    ...document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => visible(el) && !srOnly(el) && !behindModal(el))
  const fixedAncestor = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const p = getComputedStyle(n).position
      if (p === 'fixed' || p === 'sticky') return n
    }
    return null
  }
  const seenCover = new Set()
  for (const el of controls) {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue
    if (fixedAncestor(el)) continue
    const hit = document.elementFromPoint(cx, cy)
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue
    const overlay = fixedAncestor(hit)
    if (!overlay) continue
    // An open dialog, sheet or drawer is meant to sit over the page behind it.
    if (
      overlay.closest(
        '[role="dialog"], [role="alertdialog"], [data-slot*="sheet"], [data-slot*="drawer"], [data-slot*="dialog"], [data-state="open"]',
      )
    )
      continue
    const key = describe(overlay) + '>>' + describe(el)
    if (seenCover.has(key)) continue
    seenCover.add(key)
    push(
      'fixed-covers-control',
      'high',
      overlay,
      `${getComputedStyle(overlay).position} element covers the centre of ${describe(el)} at (${Math.round(cx)}, ${Math.round(cy)}) — the control cannot be clicked`,
    )
  }

  // 6. Did the route render content, or fall through?
  const bodyText = (document.body.innerText ?? '').replace(/\s+/g, ' ').trim()
  const notFound = /Page not found/i.test(bodyText) && /404/.test(bodyText)
  const errorScreen = [...document.querySelectorAll('[role="alert"]')]
    .map((n) => n.innerText.replace(/\s+/g, ' ').trim())
    .filter((t) => /something went wrong|failed|error/i.test(t))
  const main = document.querySelector('main') ?? document.body
  // A grid of 24 identical product cards produces 24 identical defects; collapse them so
  // the report names the component once with a count.
  const merged = new Map()
  for (const d of defects) {
    const key = `${d.kind}|${d.element.split(' « ')[0]}|${d.detail.replace(/\d+/g, '#')}`
    const hit = merged.get(key)
    if (hit) hit.occurrences += 1
    else merged.set(key, { ...d, occurrences: 1 })
  }
  return {
    defects: [...merged.values()],
    notFound,
    errorScreen,
    bodyChars: bodyText.length,
    mainHeight: Math.round(main.getBoundingClientRect().height),
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    title: (document.querySelector('h1')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
  }
}

mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const rows = []
const groups = []
if (only === 'all' || only === 'storefront') groups.push(['guest', guest], ['buyer', storefront])
if (only === 'all' || only === 'admin') groups.push(['admin', admin])

for (const [role, paths] of groups) {
  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    let pageErrors = []
    let consoleErrors = []
    let badResponses = []
    page.on('pageerror', (e) => pageErrors.push(e.message.replace(/\s+/g, ' ').slice(0, 300)))
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().replace(/\s+/g, ' ').slice(0, 300))
    })
    page.on('response', (res) => {
      if (res.status() >= 400)
        badResponses.push(`${res.status()} ${res.request().method()} ${res.url().slice(0, 140)}`)
    })

    if (role !== 'guest') {
      await signIn(page, role === 'admin' ? 'admin@demo.local' : 'buyer@demo.local')
      await resolvePlaceholders(page, role)
    }
    let cartFilled = false
    let wishFilled = false

    for (const [name, raw] of paths) {
      const shot = `${out}/${viewport.width}-${role}-${name}.png`
      try {
        if (raw.includes('__fill__') && !cartFilled) {
          await fillCart(page)
          cartFilled = true
        }
        if (raw.includes('__wish__') && !wishFilled) {
          await fillWishlist(page)
          wishFilled = true
        }
        const path = applyPlaceholders(raw)
        pageErrors = []
        consoleErrors = []
        badResponses = []
        page.removeAllListeners('pageerror')
        page.removeAllListeners('console')
        page.removeAllListeners('response')
        page.on('pageerror', (e) => pageErrors.push(e.message.replace(/\s+/g, ' ').slice(0, 300)))
        page.on('console', (m) => {
          if (m.type() === 'error') consoleErrors.push(m.text().replace(/\s+/g, ' ').slice(0, 300))
        })
        page.on('response', (res) => {
          if (res.status() >= 400)
            badResponses.push(
              `${res.status()} ${res.request().method()} ${res.url().slice(0, 140)}`,
            )
        })

        await page.goto(base + path, { waitUntil: 'networkidle' })
        await settle(page)
        const result = await page.evaluate(audit, {
          smallScreen: viewport.width <= 402,
        })
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
        rows.push({
          role,
          width: viewport.width,
          name,
          path,
          url: page.url().replace(base, ''),
          redirected: page.url().replace(base, '').split('?')[0] !== path.split('?')[0],
          shot,
          pageErrors: [...pageErrors],
          consoleErrors: [...consoleErrors],
          badResponses: [...badResponses],
          ...result,
        })
      } catch (e) {
        rows.push({
          role,
          width: viewport.width,
          name,
          path: raw,
          shot,
          scriptError: String(e).replace(/\s+/g, ' ').slice(0, 300),
          defects: [],
        })
      }
    }
    await ctx.close()
    process.stdout.write(`${role} @${viewport.width} done\n`)
  }
}
await browser.close()

writeFileSync(`${out}/report.json`, JSON.stringify(rows, null, 1))

const counts = {}
for (const r of rows) for (const d of r.defects ?? []) counts[d.kind] = (counts[d.kind] ?? 0) + 1
console.log(`\nrows: ${rows.length}`)
console.log('defects by kind:', JSON.stringify(counts, null, 1))
console.log(`report: ${out}/report.json`)
