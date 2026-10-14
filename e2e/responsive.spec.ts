/// <reference lib="dom" />
// tsconfig.node.json compiles e2e without the DOM lib; `page.evaluate` callbacks need it.
import { expect, test, type Page } from '@playwright/test'

const WIDTHS = [320, 375, 768, 1024, 1440] as const
const DESKTOP_NAV_FROM = 1024 // Tailwind `lg`
// First navigation also downloads the lazy route chunk; cold preview servers can be slow.
const FIRST_LOAD = 20_000

const PAGES = [
  { path: '/', heading: 'Clogs built for Manila streets.' },
  { path: '/shop', heading: 'Shop' },
] as const

async function horizontalOverflow(
  page: Page,
): Promise<{ scrollWidth: number; innerWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

for (const width of WIDTHS) {
  for (const { path, heading } of PAGES) {
    test(`${path} has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path, { waitUntil: 'commit' })
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({
        timeout: FIRST_LOAD,
      })

      await test.step('page does not scroll sideways', async () => {
        if (path === '/shop') {
          await expect(page.getByRole('status').filter({ hasText: /\d+ products/ })).toBeVisible()
        }
        const { scrollWidth, innerWidth } = await horizontalOverflow(page)
        expect(
          scrollWidth,
          `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`,
        ).toBeLessThanOrEqual(innerWidth + 1)
      })

      await test.step('header switches between hamburger and inline nav', async () => {
        const hamburger = page.getByRole('button', { name: 'Open menu' })
        const primaryNav = page.getByRole('navigation', { name: 'Primary' })
        if (width >= DESKTOP_NAV_FROM) {
          await expect(primaryNav).toBeVisible()
          await expect(hamburger).toBeHidden()
        } else {
          await expect(hamburger).toBeVisible()
          await expect(primaryNav).toBeHidden()
        }
        await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible()
      })
    })
  }
}
