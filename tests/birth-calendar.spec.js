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
  // Deliberately starts on the productivity calendar — the app's own default is
  // the birth calendar now, and this helper is here to prove the switch works.
  await page.goto('/?calendar=standard')

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
  test('is where a first-time visitor lands', async ({ page }) => {
    await page.goto('/')
    // Nothing saved yet, so this is the shipped default rather than a
    // preference — the birth calendar owns the front door.
    await expect(page.getByRole('button', { name: '← Calendar' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Womb Whispers')).toBeVisible()
  })

  test.describe('in dark mode', () => {
    test.use({ colorScheme: 'dark' })

    test('darkens the background as well as the text', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('button', { name: '← Calendar' })).toBeVisible({ timeout: 20000 })
      // The back button belongs to the shell; the scope arrives with the
      // lazily loaded calendar chunk.
      await page.locator('.birth-scope').first().waitFor({ timeout: 20000 })

      // The gradient stops are inline custom properties, so they override
      // anything `.dark .birth-scope` sets. The bug this guards against was a
      // near-white ink left sitting on the pale rose daytime gradient.
      const { textLuminance, backgroundLuminance } = await page.evaluate(() => {
        const luminance = (value) => {
          const [r, g, b] = value.match(/\d+/g).map(Number)
          return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        }
        const scope = document.querySelector('.birth-scope')
        const style = getComputedStyle(scope)
        const firstStop = style.backgroundImage.match(/rgba?\([^)]+\)/)[0]
        return {
          textLuminance: luminance(style.color),
          backgroundLuminance: luminance(firstStop)
        }
      })

      expect(backgroundLuminance).toBeLessThan(0.3)
      expect(textLuminance - backgroundLuminance).toBeGreaterThan(0.4)
    })
  })

  test('a manifest shortcut can ask for the other calendar', async ({ page }) => {
    await page.goto('/?calendar=standard')
    await expect(page.getByRole('button', { name: '← Calendar' })).toHaveCount(0)
  })

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
      // Back to the bare URL: this helper started on ?calendar=standard, and
      // that param deliberately outranks the saved preference.
      await page.goto('/')
      // No click on the switch this time: it should open here by itself.
      await expect(page.getByText(/Day 87 of 280/)).toBeVisible({ timeout: 3000 })
    }).toPass({ timeout: 20000 })
  })

  test('returns to the standard calendar', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    await page.getByRole('button', { name: '← Calendar' }).click()
    await expect(page.getByRole('heading', { name: /^(My |Personal )?Calendar$/ })).toBeVisible()
  })
})

test.describe('Several children', () => {
  test('keeps each child’s journal to themselves', async ({ page }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    // Name the pregnancy, so the switcher has something to show.
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel("Baby's name").fill('Hope')
    await page.getByLabel("Baby's name").blur()

    // Add a school-age child.
    await page.getByRole('button', { name: 'Add a child' }).click()
    await page.getByLabel('Name', { exact: true }).fill('Ada')
    await page.getByLabel('Birthday', { exact: true }).fill('2015-04-02')
    await page.getByRole('button', { name: 'Add them' }).click()

    // Adding switches to them, and their stage is derived from the birthday.
    const switcher = page.getByRole('navigation', { name: 'Choose a child' })
    await expect(switcher).toBeVisible()
    await expect(switcher.getByRole('button', { name: /Ada/ })).toHaveAttribute(
      'aria-current',
      'true'
    )
    await expect(page.getByText(/School Years/).first()).toBeVisible()

    // Ada reads the theme for whatever month it is. Only January is written so
    // far, so step the month view round to it rather than depending on today's
    // date — this test must pass in March as well as in January.
    await page.getByRole('button', { name: 'Month' }).click()
    const heading = page.getByRole('heading', { level: 1 })
    for (let i = 0; i < 12; i++) {
      if ((await heading.textContent())?.includes('Identity & Belonging')) break
      await page.getByRole('button', { name: 'Previous month' }).click()
    }
    await expect(heading).toHaveText('Identity & Belonging')

    // A written day opens on Today with its declaration and Scripture.
    await page.getByRole('button', { name: /^Day 3:/ }).click()
    await expect(page.getByRole('heading', { name: 'Wonderfully Made' })).toBeVisible()
    await expect(page.getByText(/fearfully and wonderfully made/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Speak this over Ada' })).toBeVisible()

    // The parents' prayer says the child's name rather than "our child".
    const prayer = page.getByText(/Amen\.$/).first()
    await expect(prayer).toContainText('Ada')
    await expect(prayer).not.toContainText('our child')

    // Saving it files it under the theme, not under a date.
    await page.getByRole('button', { name: 'Save to favourites' }).click()
    await page.getByRole('button', { name: 'Saved' }).click()
    await expect(page.getByText('Identity & Belonging · Day 3')).toBeVisible()

    // Switching back restores the pregnancy exactly as it was.
    await switcher.getByRole('button', { name: /Hope/ }).click()
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page.getByText('12w 3d')).toBeVisible()

    // And it survives a restart. Deliberately not `page.reload()`: the helper
    // arrived at `?calendar=standard`, which forces the productivity calendar
    // for one launch, so a reload would reopen that instead of the birth one.
    await page.goto('/')
    await expect(page.getByText('12w 3d')).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('navigation', { name: 'Choose a child' }).getByRole('button', { name: /Ada/ })
    ).toBeVisible()
  })
})

/** Parses `rgb()` / `rgba()` into channels, ignoring alpha. */
function channels(colour) {
  const parts = String(colour).match(/[\d.]+/g) || []
  return parts.slice(0, 3).map(Number)
}

/** Crude perceived-brightness difference, enough to catch white-on-white. */
function contrast(a, b) {
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  return Math.abs(lum(channels(a)) - lum(channels(b)))
}

test.describe('Form fields in the birth calendar', () => {
  // A transparent control with an explicit ink colour rendered near-white text
  // on the white background a native <select> popup paints for itself. Only a
  // real browser can prove this one, so it is asserted here rather than in a
  // unit test.
  for (const theme of ['light', 'dark']) {
    test(`the life stage selector is readable in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await openBirthCalendar(page)
      await completeOnboarding(page)

      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByRole('button', { name: 'Add a child' }).click()
      await page.getByLabel('Name', { exact: true }).fill('Ada')
      await page.getByLabel('Birthday', { exact: true }).fill('2015-04-02')
      await page.getByRole('button', { name: 'Add them' }).click()

      await page.getByRole('button', { name: 'Settings' }).click()
      await page.getByRole('button', { name: 'Edit' }).last().click()

      const select = page.getByLabel('Life stage')
      await expect(select).toBeVisible()

      const style = await select.evaluate((el) => {
        const s = getComputedStyle(el)
        const option = el.querySelector('option')
        return {
          colour: s.color,
          background: s.backgroundColor,
          optionColour: option ? getComputedStyle(option).color : s.color,
          optionBackground: option ? getComputedStyle(option).backgroundColor : s.backgroundColor
        }
      })

      // Not transparent, and legible against its own background.
      expect(style.background).not.toBe('rgba(0, 0, 0, 0)')
      expect(contrast(style.colour, style.background)).toBeGreaterThan(60)
      expect(contrast(style.optionColour, style.optionBackground)).toBeGreaterThan(60)
    })
  }
})

test.describe('Prayer journal', () => {
  test('opens from the pill beside the calendar switch, keeps a prayer, and marks it answered', async ({
    page
  }) => {
    await openBirthCalendar(page)
    await completeOnboarding(page)

    const pill = page.getByRole('button', { name: 'Open the prayer journal' })
    await expect(pill).toBeVisible()
    await expect(pill).toHaveText(/Prayers/)

    // Same top row as the "← Calendar" control, to its left.
    const calendarBox = await page.getByRole('button', { name: '← Calendar' }).boundingBox()
    const pillBox = await pill.boundingBox()
    expect(Math.abs(pillBox.y - calendarBox.y)).toBeLessThan(4)
    expect(pillBox.x + pillBox.width).toBeLessThanOrEqual(calendarBox.x)

    await pill.click()
    await expect(page.getByRole('heading', { name: 'Prayer journal' })).toBeVisible()

    await page.getByLabel('A new prayer').fill('A safe and gentle delivery.')
    await page.getByRole('button', { name: 'Add prayer' }).click()
    await expect(page.getByText('A safe and gentle delivery.')).toBeVisible()
    await expect(pill).toHaveText(/1 praying/)

    // It is in IndexedDB, not component state. The URL still carries
    // `?calendar=standard`, so re-enter the way the other reload test does.
    await openBirthCalendar(page)
    await expect(page.getByRole('button', { name: 'Open the prayer journal' })).toHaveText(
      /1 praying/,
      { timeout: 20000 }
    )
    await page.getByRole('button', { name: 'Open the prayer journal' }).click()
    await expect(page.getByText('A safe and gentle delivery.')).toBeVisible()

    await page.getByRole('button', { name: 'Answered', exact: true }).click()
    await page.getByLabel('How was it answered?').fill('She arrived on a Tuesday morning.')
    await page.getByRole('button', { name: 'Mark answered' }).click()
    await expect(page.getByRole('heading', { name: 'Answered' })).toBeVisible()
    await expect(page.getByText('She arrived on a Tuesday morning.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open the prayer journal' })).toHaveText(
      /Prayers/
    )

    // Back returns to the tab the journal was opened from.
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('heading', { name: 'Prayer journal' })).toBeHidden()
    await expect(page.getByRole('button', { name: '← Calendar' })).toBeVisible()
  })
})
