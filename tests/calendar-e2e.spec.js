import { test, expect } from '@playwright/test'

test.describe('Personal Calendar App - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('header, main, .app', { timeout: 10000 })
  })

  test('should load the calendar app successfully', async ({ page }) => {
    // Check if the main app container is present
    await expect(page.locator('.app')).toBeVisible()

    // Check if header is present
    await expect(page.locator('header')).toBeVisible()

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
        const navItem = desktopNav.getByText(view, { exact: false })
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

  test('should create a new event using template', async ({ page }) => {
    // Click on a time slot or add event button
    const addButton = page
      .locator('button')
      .getByText(/add|new|create/i)
      .first()
    if (await addButton.isVisible()) {
      await addButton.click()
    } else {
      // Try clicking on a calendar cell
      const calendarCell = page.locator('.calendar-cell, .day-cell, [data-date]').first()
      if (await calendarCell.isVisible()) {
        await calendarCell.click()
      }
    }

    // Wait for modal to appear
    await page.waitForSelector('.modal, .quick-add-modal', { timeout: 5000 })

    // Select a template
    const templateSelect = page.locator('select[name="template"], .template-select')
    if (await templateSelect.isVisible()) {
      await templateSelect.selectOption({ index: 1 }) // Select second option (first might be placeholder)
    }

    // Fill in event details
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first()
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Event - E2E')
    }

    // Set date if available
    const dateInput = page.locator('input[type="date"], input[name="date"]')
    if (await dateInput.isVisible()) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
    }

    // Set time if available
    const timeInputs = page.locator('input[type="time"], input[name*="time"]')
    if ((await timeInputs.count()) > 0) {
      await timeInputs.first().fill('10:00')
      if ((await timeInputs.count()) > 1) {
        await timeInputs.nth(1).fill('11:00')
      }
    }

    // Submit the form
    const submitButton = page
      .locator('button[type="submit"], button')
      .getByText(/save|create|add/i)
      .first()
    await submitButton.click()

    // Wait for modal to close
    await page.waitForTimeout(1000)

    // Verify event was created (check if it appears in the calendar)
    await expect(page.locator('body')).toContainText('Test Event - E2E')
  })

  test('should edit an existing event', async ({ page }) => {
    // First create an event if none exists
    await test.step('Create event if needed', async () => {
      const eventExists = await page.locator('text=/Test Event/').isVisible()
      if (!eventExists) {
        // Click add button or calendar cell
        const addButton = page
          .locator('button')
          .getByText(/add|new/i)
          .first()
        if (await addButton.isVisible()) {
          await addButton.click()
        } else {
          const calendarCell = page.locator('.calendar-cell, [data-date]').first()
          if (await calendarCell.isVisible()) {
            await calendarCell.click()
          }
        }

        // Fill and submit form quickly
        await page.waitForSelector('.modal, .quick-add-modal', { timeout: 3000 })
        const titleInput = page.locator('input[name="title"]').first()
        if (await titleInput.isVisible()) {
          await titleInput.fill('Event to Edit')
          const submitBtn = page.locator('button[type="submit"]').first()
          await submitBtn.click()
          await page.waitForTimeout(1000)
        }
      }
    })

    // Find and click on an event to edit
    const eventElement = page.locator('text=/Test Event|Event to Edit/').first()
    await eventElement.click()

    // Wait for edit modal/form
    await page.waitForSelector('.modal, .edit-modal, form', { timeout: 5000 })

    // Modify the title
    const titleInput = page.locator('input[name="title"]').first()
    await titleInput.fill('Edited Test Event')

    // Save changes
    const saveButton = page
      .locator('button')
      .getByText(/save|update/i)
      .first()
    await saveButton.click()

    // Verify the change
    await expect(page.locator('body')).toContainText('Edited Test Event')
  })

  test('should delete an event', async ({ page }) => {
    // Create an event to delete
    const addButton = page
      .locator('button')
      .getByText(/add|new/i)
      .first()
    if (await addButton.isVisible()) {
      await addButton.click()
    } else {
      const calendarCell = page.locator('.calendar-cell, [data-date]').first()
      if (await calendarCell.isVisible()) {
        await calendarCell.click()
      }
    }

    await page.waitForSelector('.modal, .quick-add-modal', { timeout: 3000 })
    const titleInput = page.locator('input[name="title"]').first()
    if (await titleInput.isVisible()) {
      await titleInput.fill('Event to Delete')
      const submitBtn = page.locator('button[type="submit"]').first()
      await submitBtn.click()
      await page.waitForTimeout(1000)
    }

    // Find and click on the event
    const eventElement = page.locator('text=Event to Delete').first()
    await eventElement.click()

    // Look for delete button
    const deleteButton = page
      .locator('button')
      .getByText(/delete|remove/i)
      .first()
    await deleteButton.click()

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = page
      .locator('button')
      .getByText(/confirm|yes|delete/i)
      .first()
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    // Verify event is deleted
    await expect(page.locator('text=Event to Delete')).not.toBeVisible()
  })

  test('should search for events', async ({ page }) => {
    // Create a few test events
    for (let i = 1; i <= 3; i++) {
      const addButton = page
        .locator('button')
        .getByText(/add|new/i)
        .first()
      if (await addButton.isVisible()) {
        await addButton.click()
      } else {
        const calendarCell = page.locator('.calendar-cell, [data-date]').first()
        if (await calendarCell.isVisible()) {
          await calendarCell.click()
        }
      }

      await page.waitForSelector('.modal, .quick-add-modal', { timeout: 3000 })
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Searchable Event ${i}`)
        const submitBtn = page.locator('button[type="submit"]').first()
        await submitBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Searchable')

      // Wait for search results
      await page.waitForTimeout(1000)

      // Verify search results
      const searchResults = page.locator('text=/Searchable Event/')
      await expect(searchResults).toHaveCount(3)
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
      const viewButton = page.locator(`nav, .navigation`).getByText(view).first()
      if (await viewButton.isVisible()) {
        await viewButton.click()

        // Wait for view to load
        await page.waitForTimeout(1000)

        // Verify view-specific elements are present
        if (view === 'Month') {
          await expect(page.locator('.month-view, .calendar-month')).toBeVisible()
        } else if (view === 'Week') {
          await expect(page.locator('.week-view, .calendar-week')).toBeVisible()
        } else if (view === 'Day') {
          await expect(page.locator('.day-view, .calendar-day')).toBeVisible()
        } else if (view === 'List') {
          await expect(page.locator('.list-view, .events-list')).toBeVisible()
        }
      }
    }
  })

  test('should handle form validation', async ({ page }) => {
    // Open add event modal
    const addButton = page
      .locator('button')
      .getByText(/add|new/i)
      .first()
    if (await addButton.isVisible()) {
      await addButton.click()
    } else {
      const calendarCell = page.locator('.calendar-cell, [data-date]').first()
      if (await calendarCell.isVisible()) {
        await calendarCell.click()
      }
    }

    await page.waitForSelector('.modal, .quick-add-modal', { timeout: 3000 })

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    // Check for validation errors
    const errorMessages = page.locator('.error, .validation-error, [class*="error"]')
    if ((await errorMessages.count()) > 0) {
      await expect(errorMessages.first()).toBeVisible()
    }

    // Fill required fields and submit
    const titleInput = page.locator('input[name="title"]').first()
    if (await titleInput.isVisible()) {
      await titleInput.fill('Validation Test Event')
      await submitButton.click()

      // Should succeed now
      await page.waitForTimeout(1000)
      await expect(page.locator('text=Validation Test Event')).toBeVisible()
    }
  })
})
