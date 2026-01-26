import { test, expect } from '@playwright/test'

test.describe('Personal Calendar - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    // Wait for the app to load - just wait for body to have content
    await page.waitForTimeout(2000)
  })

  test('app should load without critical errors', async ({ page }) => {
    // Check if the page has loaded by looking for any content
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent.length).toBeGreaterThan(0)

    // Check if there are no critical console errors
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a bit more for any errors to appear
    await page.waitForTimeout(1000)

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('manifest') &&
        !error.includes('analytics') &&
        !error.includes('chunk')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should have basic UI elements', async ({ page }) => {
    // Wait a bit more for the app to fully load
    await page.waitForTimeout(3000)

    // Check for some basic elements that should exist
    const hasHeader = (await page.locator('header').count()) > 0
    const hasMain = (await page.locator('main').count()) > 0
    const hasButtons = (await page.locator('button').count()) > 0

    // Log what we found for debugging
    console.log(`Header: ${hasHeader}, Main: ${hasMain}, Buttons: ${hasButtons}`)

    expect(hasHeader || hasMain || hasButtons).toBe(true)
  })

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size

    await page.goto('/')
    await page.waitForTimeout(2000)

    // Just verify the page loads on mobile
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent.length).toBeGreaterThan(0)
  })
})
