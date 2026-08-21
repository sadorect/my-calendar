import { test, expect } from '@playwright/test'

/**
 * Smoke coverage for the birth calendar. Unit tests already cover the date
 * maths; this checks the parts only a browser can prove — that the mode switch
 * works, onboarding persists, and the Today screen renders real content.
 */

/**
 * The way in differs by viewport: the desktop header is `hidden md:flex`, so
 * below md the only entry point is the "More" sheet. Clicking whichever exists
 * keeps this working on the mobile projects instead of only on desktop ones.
 */
async function openBirthCalendar(page) {
  await page.goto('/')

  const headerButton = page.getByRole('button', { name: 'Birth calendar', exact: true })
  if (await headerButton.count()) {
    await headerButton.click()
  } else {
    await page.getByRole('button', { name: 'More options' }).click()
    await page.getByRole('button', { name: /birth calendar/i }).click()
  }

  // Assert on the mode, not on the onboarding heading: "Womb Whispers" only
  // greets a user who has no due date yet, so a helper that waited for it could
  // never be used a second time. The back button is present in birth mode
  // whatever the screen shows.
  //
  // The birth calendar is a lazily loaded chunk, so first paint waits on a
  // network fetch. The default 5s is not enough on a loaded CI runner.
  await expect(page.getByRole('button', { name: '← Calendar' })).toBeVisible({
    timeout: 20000
  })
}

async function completeOnboarding(page, { weeks = 12, days = 3 } = {}) {
  await page.getByRole('tab', { name: /i know my week/i }).click()
  await page.getByLabel('Weeks').fill(String(weeks))
  await page.getByLabel('Days').fill(String(days))
  await page.getByRole('button', { name: 'Begin' }).click()
}

test.describe('birth calendar', () => {
  test('switches from the standard calendar and onboards', async ({ page }) => {
    await openBirthCalendar(page)

    // Only a user with no due date yet is greeted by name.
    await expect(page.getByRole('heading', { name: 'Womb Whispers' })).toBeVisible()

    // Preview should reflect what was typed before committing.
    await page.getByRole('tab', { name: /i know my week/i }).click()
    await page.getByLabel('Weeks').fill('12')
    await page.getByLabel('Days').fill('3')
    await expect(page.getByText(/12 weeks and 3 days/)).toBeVisible()

    await page.getByRole('button', { name: 'Begin' }).click()

    // Today screen: month theme, progress and a real declaration.
    await expect(page.getByText(/Month 3 · Week 13/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Alive with Purpose' })).toBeVisible()
    await expect(page.getByText('12w 3d')).toBeVisible()
    await expect(page.getByText(/Day 87 of 280/)).toBeVisible()
  })

  test('remembers the due date across a reload', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)
    await expect(page.getByText(/Day 87 of 280/)).toBeVisible()

    await openBirthCalendar(page)

    // Straight to Today — no onboarding a second time.
    await expect(page.getByText(/Day 87 of 280/)).toBeVisible()
  })

  test('saves a favourite and surfaces it under Saved', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: 'Save to favourites' }).first().click()
    await page.getByRole('button', { name: 'Saved', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible()
    await expect(page.getByText('Day 87')).toBeVisible()
  })

  test('marks a day as spoken and keeps it after navigating away', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: 'Mark as spoken' }).click()
    await expect(page.getByRole('button', { name: 'Spoken today' })).toBeVisible()

    await page.getByRole('button', { name: 'Weeks', exact: true }).click()
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Spoken today' })).toBeVisible()
  })

  test('writes a journal note against a day', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: 'Journal →' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('textbox').fill('Felt the first proper kick today.')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Saved', exact: true })).toBeVisible()
  })

  test('browses forward into a later month and finds it written', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: 'Month', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Alive with Purpose' })).toBeVisible()

    // Month 4 used to be a placeholder. Every month is written now, so the
    // assertion is that browsing ahead lands on real content.
    await page.getByRole('button', { name: 'Next month' }).click()
    await expect(page.getByRole('heading', { name: 'Growing Strong Under His Hand' })).toBeVisible()
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await expect(page.getByText('Carried, Not Merely Kept').first()).toBeVisible()
  })

  test('default view setting sends the user straight to the birth calendar', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: 'Settings' }).click()
    const option = page.getByRole('button', { name: 'Birth calendar', exact: true })
    await option.click()
    await expect(option).toHaveAttribute('aria-pressed', 'true')

    // The preference is written to IndexedDB asynchronously, and aria-pressed
    // flips on the reactive state before that write lands. Under load the
    // reload can beat it, so retry the reload rather than assume one is enough.
    await expect(async () => {
      await page.reload()
      // No click on the switch this time: it should open here by itself.
      await expect(page.getByText(/Day 87 of 280/)).toBeVisible({ timeout: 3000 })
    }).toPass({ timeout: 20000 })
  })

  test('returns to the standard calendar', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: '← Calendar' }).click()
    await expect(page.getByRole('heading', { name: /^(Personal )?Calendar$/ })).toBeVisible()
  })
})
