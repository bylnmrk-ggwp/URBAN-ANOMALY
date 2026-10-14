import { expect, test, type Page } from '@playwright/test'

async function signInAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin@demo.local')
  await page.getByRole('textbox', { name: /^password/i }).fill('password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/admin/, { timeout: 20_000 })
}

test.describe('CMS visual editor', () => {
  test('edits the hero, previews it live, publishes, and the storefront updates', async ({
    page,
    isMobile,
  }) => {
    await signInAsAdmin(page)

    await test.step('open the home page in the editor', async () => {
      await page.goto('/admin/editor?doc=page:home')
      await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible({ timeout: 20_000 })
    })

    await test.step('change the hero headline', async () => {
      await page.getByRole('button', { name: /^Hero Clogs built/ }).click()
      await page.getByLabel('Headline').first().fill('Edited in the CMS')
      // On mobile the form lives in a bottom sheet; close it to reach the tabs.
      if (isMobile) await page.keyboard.press('Escape')
    })

    await test.step('the preview reflects the draft before publishing', async () => {
      if (isMobile) await page.getByRole('tab', { name: 'Preview' }).click()
      const preview = page.frameLocator('iframe[title="Page preview"]')
      await expect(preview.locator('h1').first()).toHaveText('Edited in the CMS', {
        timeout: 20_000,
      })
    })

    await test.step('publish', async () => {
      await page.getByRole('button', { name: /^publish$/i }).click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /publish/i })
        .click()
      await expect(page.getByText('Published.')).toBeVisible()
    })

    await test.step('the live storefront shows the published headline', async () => {
      // Client-side navigation keeps the in-memory mock store alive.
      if (isMobile) await page.getByRole('button', { name: /open admin menu/i }).click()
      await page
        .getByRole('link', { name: /back to storefront/i })
        .first()
        .click()
      await page.waitForURL((url) => url.pathname === '/')
      await expect(page.locator('h1').first()).toHaveText('Edited in the CMS')
    })
  })

  test('a buyer cannot open the editor', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('buyer@demo.local')
    await page.getByRole('textbox', { name: /^password/i }).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/account/, { timeout: 20_000 })
    await page.goto('/admin/editor?doc=page:home')
    await expect(page.getByText(/don't have access/i)).toBeVisible({ timeout: 20_000 })
  })

  test('storefront still renders the default content without a CMS edit', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toHaveText('Clogs built for Manila streets.')
    await page.goto('/about')
    await expect(page.locator('#shipping')).toBeAttached()
    await expect(page.locator('#contact')).toBeAttached()
  })
})
