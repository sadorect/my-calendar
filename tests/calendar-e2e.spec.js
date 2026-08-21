import { test, expect } from '@playwright/test'

test.describe('Personal Calendar App - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/?calendar=standard')
    // Wait for the app to load
    await page.waitForSelector('header, main, .app', { timeout: 10000 })
  })

  test('should load the calendar app successfully', async ({ page }) => {
    // Check if the main app container is present
    await expect(page.locator('.app')).toBeVisible()

    // There are two headers in the DOM — a desktop one and an md:hidden mobile
    // one — and only one is ever visible. `.first()` always picked the desktop
    // one, which is hidden on the mobile projects.
    await expect(page.locator('header:visible').first()).toBeVisible()

    // Check if main content area is present
    await expect(page.locator('main')).toBeVisible()

    // Check if today's date is displayed
    const today = new Date()
    await expect(page.locator('body')).toContainText(today.getFullYear().toString())
  })

  test('should navigate between different calendar views', async ({ page }) => {
    // Test desktop navigation
    const desktopNav = page.locator('header nav').first()
    if (await desktopNav.isVisible()) {
      const views = ['Today', 'Month', 'Week', 'Day', 'List', 'Analytics']

      for (const view of views) {
        const navItem = desktopNav.getByRole('button', { name: view, exact: true })
        if (await navItem.isVisible()) {
          await navItem.click()
          // Wait for view to change
          await page.waitForTimeout(500)
          // Check if main content is still visible
          await expect(page.locator('main')).toBeVisible()
        }
      }
    }
  })

  /**
   * The real create flow: the FAB opens a template picker, choosing a template
   * opens the event form, and the form is submitted. The previous version of
   * this test drove a `select[name="template"]` and `.modal` that have never
   * existed in this app, so every step silently no-opped.
   */
  async function createEvent(page, title) {
    await page.getByRole('button', { name: 'Add event' }).click()

    const picker = page.getByRole('dialog', { name: 'Choose an event template' })
    await expect(picker).toBeVisible()
    await picker
      .getByRole('button', { name: /Select .* event template/ })
      .first()
      .click()

    const form = page.getByRole('dialog').filter({ has: page.getByLabel('Title') })
    await expect(form).toBeVisible()
    await form.getByLabel('Title').fill(title)
    await form.getByRole('button', { name: 'Save' }).click()
    await expect(form).toBeHidden()
  }

  test('should create a new event using template', async ({ page }) => {
    await createEvent(page, 'Test Event - E2E')
    await expect(page.locator('body')).toContainText('Test Event - E2E')
  })

  test('should edit an existing event', async ({ page }) => {
    await createEvent(page, 'Event to Edit')

    // The Today dashboard exposes per-event actions rather than opening details
    // on click, so edit is reached through its Edit button.
    await page.getByRole('button', { name: 'Edit event' }).first().click()

    const form = page.getByRole('dialog').filter({ has: page.getByLabel('Title') })
    await expect(form).toBeVisible()
    await form.getByLabel('Title').fill('Edited Test Event')
    await form.getByRole('button', { name: /Save|Update/ }).click()
    await expect(form).toBeHidden()

    await expect(page.locator('body')).toContainText('Edited Test Event')
  })

  test('should delete an event', async ({ page }) => {
    await createEvent(page, 'Event to Delete')
    await expect(page.getByText('Event to Delete').first()).toBeVisible()

    // Deletion is confirmed with a NATIVE confirm(). Playwright dismisses native
    // dialogs by default, which would silently cancel the delete.
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete event' }).first().click()

    await expect(page.getByText('Event to Delete')).toHaveCount(0)
  })

  test('should search for events', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      await createEvent(page, `Searchable Event ${i}`)
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first()

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Searchable')
      await page.waitForTimeout(800)
    }

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(`Searchable Event ${i}`).first()).toBeVisible()
    }
  })

  test('should toggle dark mode', async ({ page }) => {
    // Find dark mode toggle
    const darkModeToggle = page
      .locator('button')
      .getByText(/dark|theme|moon/i)
      .first()
    if (await darkModeToggle.isVisible()) {
      const initialClass = await page.locator('html').getAttribute('class')

      await darkModeToggle.click()

      // Wait for theme change
      await page.waitForTimeout(500)

      const newClass = await page.locator('html').getAttribute('class')

      // Verify theme changed
      expect(initialClass).not.toBe(newClass)
    }
  })

  test('should export calendar data', async ({ page }) => {
    // Navigate to export/import section
    const exportTab = page
      .locator('nav')
      .getByText(/export|import/i)
      .first()
    if (await exportTab.isVisible()) {
      await exportTab.click()

      // Find export button
      const exportButton = page
        .locator('button')
        .getByText(/export/i)
        .first()
      if (await exportButton.isVisible()) {
        // Start download listening
        const downloadPromise = page.waitForEvent('download')

        await exportButton.click()

        // Wait for download to start
        const download = await downloadPromise

        // Verify download started
        expect(download.suggestedFilename()).toMatch(/\.(json|ics|csv)$/)
      }
    }
  })

  test('should import ICS calendar data', async ({ page }) => {
    // Navigate to export/import section
    const exportTab = page
      .locator('nav')
      .getByText(/export|import/i)
      .first()
    if (await exportTab.isVisible()) {
      await exportTab.click()

      // Check if file input accepts .ics files
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        const acceptAttribute = await fileInput.getAttribute('accept')
        expect(acceptAttribute).toContain('.ics')

        // Check if import description mentions .ics
        const importDescription = page.locator('p').filter({ hasText: /Import events from/ })
        if (await importDescription.isVisible()) {
          const descriptionText = await importDescription.textContent()
          expect(descriptionText).toContain('iCal')
        }
      }
    }
  })

  test('should handle mobile navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile viewports')

    // Check if mobile menu exists
    const mobileMenuButton = page
      .locator('button')
      .getByText(/menu|hamburger/i)
      .first()
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()

      // Check if navigation menu is visible
      const navMenu = page.locator('nav, .mobile-nav')
      await expect(navMenu).toBeVisible()

      // Try navigating to a different view
      const monthView = navMenu.getByText('Month').first()
      if (await monthView.isVisible()) {
        await monthView.click()
        await expect(page.locator('body')).toBeVisible()
      }
    }
  })

  test('should display calendar in different view modes', async ({ page }) => {
    const views = ['Month', 'Week', 'Day', 'List']

    for (const view of views) {
      const viewButton = page
        .locator('nav')
        .getByRole('button', { name: view, exact: true })
        .first()
      if (await viewButton.isVisible()) {
        await viewButton.click()

        // Wait for view to load
        await page.waitForTimeout(1000)

        // Verify view-specific elements are present
        if (view === 'List') {
          // The list view renders its own markup, not a FullCalendar grid.
          await expect(page.locator('main')).toBeVisible()
        } else {
          // Month / Week / Day are all FullCalendar, which renders .fc.
          await expect(page.locator('.fc').first()).toBeVisible()
        }
      }
    }
  })

  test('should handle form validation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add event' }).click()
    await page
      .getByRole('dialog', { name: 'Choose an event template' })
      .getByRole('button', { name: /Select .* event template/ })
      .first()
      .click()

    const form = page.getByRole('dialog').filter({ has: page.getByLabel('Title') })
    await expect(form).toBeVisible()

    // Submitting with an empty title must not create anything.
    await form.getByLabel('Title').fill('')
    await form.getByRole('button', { name: 'Save' }).click()
    await expect(form).toBeVisible()

    // Filling it in should now succeed and close the form.
    await form.getByLabel('Title').fill('Validation Test Event')
    await form.getByRole('button', { name: 'Save' }).click()
    await expect(form).toBeHidden()
    await expect(page.locator('body')).toContainText('Validation Test Event')
  })
})
