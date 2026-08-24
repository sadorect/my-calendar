# Personal Productivity Calendar Application - Progress Tracker

## Project Overview

Building a comprehensive Vue.js 3 calendar app with advanced features for personal productivity management.

## Technology Stack

- Vue.js 3 (Composition API)
- Vite
- Pinia
- Tailwind CSS
- FullCalendar Vue
- date-fns
- localforage
- And more...

## Development Phases

### Phase 1: Core MVP (Week 1-2)

- [x] Project setup with Vue 3 + Vite
- [x] Basic calendar views (Month, Week, Day)
- [x] Event data model and IndexedDB setup
- [x] Icon-based quick add interface
- [x] CRUD operations for events
- [x] Color-coded categories
- [x] Today's dashboard

### Phase 2: Enhanced UX (Week 3)

- [x] Drag-and-drop rescheduling
- [x] Event conflict detection
- [x] Available time slot suggestions
- [x] Preferred time slots per category
- [x] Search and filter functionality
- [x] List view implementation

### Phase 3: Smart Features (Week 4)

- [x] Browser notifications
- [x] Reminder system (multi-reminder support)
- [x] Recurring events
- [x] Event completion tracking
- [x] Quick duplicate functionality
- [x] Event editing and deletion (all calendar views)

### Phase 4: Analytics & Export (Week 5)

- [x] Time analytics dashboard
- [x] Charts and visualizations
- [x] Export to iCal/CSV/JSON
- [x] Import functionality
- [x] Backup and restore

### Phase 5: Polish & PWA (Week 6)

- [x] Responsive mobile design
- [x] Service worker for offline
- [x] PWA installation
- [x] Accessibility improvements
- [x] Performance optimization
- [x] Dark mode
- [ ] User testing and bug fixes

### Phase 6: Birth Calendar — "Womb Whispers" (2026-08-21)

A second calendar living inside the same app: a daily biblical declaration and
prayer companion for pregnancy. Users choose which calendar opens by default.

- [x] Data model — 280-day / 40-week timeline, 9 months mapped to week ranges
      (`src/data/pregnancy/README.md` documents the shape)
- [x] Content: all nine months complete — 280 daily and 40 weekly declarations,
      each with Scripture and a closing prayer for the parents
- [x] Pure date maths in `src/services/pregnancyTimeline.js`, unit tested
- [x] Pinia store with local persistence (due date, favourites, journal, spoken)
- [x] Onboarding by due date OR current week; skip-to-browse
- [x] Today screen, month overview, weekly cards, saved/journal, settings
- [x] Standard ⇄ birth calendar switch + default-view preference
- [x] Text-to-speech, share, mark-as-spoken, streak, new-month particles
- [x] Accessibility: high contrast mode, text scaling, 44px targets, reduced motion
- [x] Biometric app lock (WebAuthn platform authenticator) + persistent storage
- [x] Months 4–9 declaration content (189 days, 27 weeks)
- [x] Printable keepsake export (`src/services/keepsake.js`, print stylesheet)
- [x] Daily reminder delivery (`src/services/birthReminders.js`)
- [x] Ambient audio — synthesised, not sampled (`src/services/ambientAudio.js`)
- [x] Share as an image card (`src/services/declarationImage.js`)
- [x] Accounts and cross-device sync against our own Postgres (`sync-server/`)

### Phase 7: Sync (2026-08-21)

Self-hosted, not Supabase or Firebase. `sync-server/` is a Node service with one
dependency (`pg`) in front of our own PostgreSQL, deployed on the VPS behind
Apache; the app points at it with `VITE_SYNC_URL` and hides the whole feature
when that is unset, so local-first stays the default rather than a fallback.

The server cannot read what it stores. The browser derives an AES-GCM key and an
auth secret from the password with PBKDF2 (310k, salted with the email so a new
device needs no salt round trip); only the auth secret is ever sent. The
consequence is stated in the UI and must not be softened: **a forgotten password
cannot be reset.**

Writes are compare-and-set on a revision number. The loser of a race gets a 409
carrying the current copy, merges locally and retries once. Merge rules are in
`src/services/mergeState.js` and are chosen by what hurts least when wrong:
journal entries are never dropped (later `updatedAt` wins; identical timestamps
keep both texts joined), favourites and spoken days are unioned keeping the
earliest, and settings/dueDate come from the newer blob as a set. Deletions can
resurrect in a true concurrent conflict — the alternative is tombstones, and
losing a journal entry is worse than an unwanted favourite coming back.

The biometric lock remains a *device* lock and is unrelated to the account.

#### Still open on sync

- Nothing is deployed yet: the service, its Postgres container and the DNS
  record for the API host are set up but not provisioned. `sync-server/README.md`
  has the exact steps.
- Password change re-encrypts everything under a new key; not implemented.
- One account = one blob. Sharing a pregnancy between two accounts (both
  parents, separate logins) would need a second concept and is not designed.

### Phase 9: Family Whispers — many children, many stages (2026-08-24)

The app grows from one pregnancy to a family. A profile per child, each in a
life stage, each owning their own favourites, journal and spoken days. **The
womb track is untouched** — same content, same date maths, same screens — and a
household with one child never sees a switcher, a stage or anything else that
implies a concept they did not ask for.

Two content tracks, because the addressing genuinely differs:

| Track  | Address                                  | Repeats |
| ------ | ---------------------------------------- | ------- |
| `womb` | day of pregnancy 1..280, 9 uneven months | never   |
| `year` | calendar month 1..12 + day of month      | yearly  |

The twelve evergreen themes belong to the seven post-birth stages. Pregnancy
keeps its nine months: re-cutting 280 written declarations onto a structure the
timeline does not use would break the validator, the tests and what current
users see, to no one's benefit.

#### Done

- [x] `src/data/family/stages.js` — the seven stages, their age ranges and the
      auto-derivation from a birth date. Ranges are half-open, so the birthday
      belongs to the older stage and no child is ever in two at once.
- [x] `src/services/familyState.js` — the version 2 blob, and `migrateState`,
      which takes an absent, version 1 or version 2 blob and is idempotent.
- [x] Profile-scoped store: `profiles`, `activeProfile`, `activeStage`,
      `activeTrack`, `activeData`, and CRUD. The public surface the Birth
      components use (`isFavourite`, `journalFor`, `toggleSpoken`, `babyName`)
      kept its signatures, so they did not churn.
- [x] `mergeState.js` merges per profile, and profiles union by id.
- [x] `BirthProfileSwitcher.vue` (hidden below two children) and
      `BirthChildren.vue` in Settings — add, rename, birthday, stage, notes,
      remove with confirmation.
- [x] `BirthStagePlaceholder.vue` — an honest "being written" screen for a
      stage with no content yet, instead of a pregnancy screen with nothing
      behind it.
- [x] 34 new unit tests (184 total) and an e2e covering onboard → add child →
      switch → restart.

#### The version 1 mirror, and why it exists

Sync is live and `VITE_SYNC_URL` is set on Vercel, so this migration runs
against **real accounts**, not just local storage. This app's own history says
installs lag: a device holding an old service worker can run version 1 code for
days. A version 2 blob with no top-level `journal` would look, to that device,
like a user who had cleared it — and it would push that back.

So a version 2 blob carries a *mirror* of the primary womb child in the version
1 fields, and `reconcileLegacyMirror` folds anything an old client wrote back
into the profile on load. Two rules make it safe:

- The migrated profile id is **fixed** (`womb-1`), not random. Two devices
  migrating the same account offline would otherwise mint two ids and the union
  would hand the user duplicate children.
- **A merge never clears a field to empty.** A version 1 blob migrated for
  merging is blank everywhere version 1 cannot reach and stamped with the moment
  it synced, so it always looks newest; whole-record "newest wins" would let a
  stale device erase the notes, photo and stage of a child it cannot see. Caught
  by a test, not by inspection.

Remove the mirror only once no version 1 client can plausibly still be out
there.

#### Decisions taken with the user

- Womb keeps its nine months; the twelve themes are for the born stages.
- Rebrand is **display name only** — the origin, the TWA package id and the
  icons stay, so nobody loses their IndexedDB or their installed app.
- Content for School Years and Teen Years is written one theme first, for the
  voice to be corrected before the other 22 month-files are produced.

#### The `year` track, and the first theme (same day)

The born-stage track is built and readable in the app.

- [x] `src/services/stageTimeline.js` — calendar month + day-of-month, four
      weekly cards with the tail of the month absorbed into week 4 rather than a
      fifth card most months would not fill.
- [x] `src/data/family/themes.js` — the twelve evergreen themes, one per
      calendar month, the same twelve for every stage.
- [x] `src/data/family/index.js` — loader and a validator that throws at module
      load on a file whose month, stage or slug disagree with where it sits.
- [x] **Theme 1, Identity & Belonging, written for School Years and Teen
      Years**: intro, key Scriptures, 4 weekly declarations with a parents'
      prayer, and 31 daily declarations each.
- [x] `BirthStageToday`, `BirthStageMonth`, `BirthStageWeeks`,
      `BirthStageSaved`, `StageDeclarationCard` — speak, mark-as-spoken,
      favourite, share as text or image, and a per-day journal.
- [x] `src/data/family/README.md` — the authoring guide for the remaining 22
      month-files.

Three decisions inside that are worth not re-litigating:

- **Born-stage content is written in the second person with no vocative.** The
  pregnancy content uses `Little one` as an address the app swaps for a chosen
  name; that is wrong over a fifteen-year-old and reads badly for the many users
  who never set a name. A test asserts no born-stage declaration contains it.
- **Favourites are filed by position** (`school:m01:d03`), so a declaration
  saved last January is still saved this January — the point of an evergreen
  theme. **Journal and spoken days are filed by real date**, because a note
  about your teenager belongs to the day it happened.
- **Month stepping exists because a theme is only "today" for one month a
  year.** Without it, January's content would be unreachable until January, and
  the e2e for it would only pass in January.

`StageDeclarationCard` is a sibling of `DeclarationCard`, not a generalisation
of it: that component addresses content by day of pregnancy and is the most-used
screen in the shipped app, and the point of this change is that the womb track
does not move.

#### Still open

- **22 month-files to write** — 11 more themes each for School and Teen, then
  the other four born stages. ~365 daily + 48 weekly per stage.
- Keepsake and printable export for born stages (`keepsake.js` is womb-shaped).
- Photos: `photoId` is in the model but there is no photo store yet. Photos must
  **not** sync — the server caps a body at 4MB and every push sends the whole
  blob.
- Reminders still follow the active child only. With several children this
  should become one digest at the chosen time, not one notification each.
- The app is still named "Birth Calendar" in the manifest; the agreed
  display-name-only rebrand to Family Whispers has not been done.

## Current Status

- **Date**: August 21, 2026
- **Phase**: Phase 7 — birth calendar complete; sync built, not yet deployed
- **Last Update**: Finished the birth calendar. Wrote the declarations for
  months 4–9 (189 daily, 27 weekly), then built the four features the month list
  still had open — daily reminder delivery, image sharing, the printable
  keepsake and ambient sound — and self-hosted sync against our own Postgres.
  126 unit tests in the app plus 22 in the sync server, all passing.

### Housekeeping pass (2026-08-21)

The pre-existing suite had 9 failing e2e tests (confirmed against a clean
checkout first — they were not caused by the birth calendar). All now pass:
**23 passed, 1 skipped, 0 failed**, lint clean, 0 npm vulnerabilities.

App bugs found and fixed:

- **Today dashboard stat cards showed nothing.** `.card-glass` is defined after
  `.bg-gradient-*` with equal specificity, so it overwrote the gradient with
  translucent white — white text on a white card. Gradient utilities now come
  after `.card-glass` in `style.css`, so an explicitly applied utility wins.
- **Duplicate `duration` key** in `NaturalLanguageInput`'s preview object: the
  second literal silently overwrote `isAllDay ? null : durationMin`, so all-day
  events displayed a duration they should not have.
- **Icon-only buttons had no accessible name** — the add-event FAB (just "+"),
  the mobile "More" toggle, `EventDetailsModal`'s close button, and the Today
  dashboard's edit/duplicate/delete buttons (which relied on `title` alone).
- **`EventDetailsModal` was not a dialog** — no `role="dialog"`, `aria-modal`
  or `aria-labelledby`. Same for the template-picker overlay in `App.vue`.
- **`npm audit`**: 19 vulnerabilities (14 high) → 0, via non-breaking lockfile
  updates only. `package.json` is unchanged, so no declared range moved.

Test bugs found and fixed — these were the actual cause of most failures:

- Six tests waited on `locator('button').getByText(/add|new|create/i)`, which
  matched the natural-language input's **disabled** "Add" button, so Playwright
  waited for it to become enabled until the test timed out. They now use the
  FAB's new accessible name and drive the real create flow (FAB → template
  picker → form → save) instead of a `select[name="template"]` and `.modal`
  that never existed in this app.
- Strict-mode violations from `locator('header')` (two responsive headers) and
  `getByText('Day')` (also matches "Today").
- `.month-view` / `.calendar-week` assertions replaced with `.fc`, which is what
  FullCalendar actually renders.
- Deletion is confirmed with a native `confirm()`; Playwright dismisses native
  dialogs by default, silently cancelling the delete.
- `playwright.config.js` now ignores `tests/unit/**` — Vitest specs that
  Playwright was trying, and failing, to run.

Known and left alone: the Today dashboard exposes per-event edit/duplicate/
delete buttons rather than opening details on click. That is a deliberate
design, not a bug.

## Completed Tasks

- [x] Created agent.md progress tracker
- [x] Analyzed project requirements
- [x] Set up Vue.js 3 project with Vite
- [x] Installed dependencies (FullCalendar, Pinia, date-fns, localforage, etc.)
- [x] Configured Tailwind CSS
- [x] Created basic project structure (components, stores, services)
- [x] Implemented event data model and IndexedDB storage
- [x] Built calendar views (Month, Week, Day, List, Today)
- [x] Created icon-based quick add system with templates
- [x] Implemented CRUD operations for events
- [x] Added color-coded categories
- [x] Set up navigation and FAB
- [x] Configured ESLint and Prettier
- [x] Fixed linting issues
- [x] Configured path aliases in Vite
- [x] Successfully started dev server
- [x] Implemented mobile-first responsive design
- [x] Added mobile bottom navigation with icons
- [x] Updated all components to use Tailwind CSS
- [x] Made modals and overlays mobile-friendly
- [x] Optimized calendar views for mobile screens
- [x] Ensured touch-friendly interface elements
- [x] Restored and enhanced the original card/button layout for event templates
- [x] Implemented drag-and-drop event rescheduling in all calendar views
- [x] Initialized Git repository with proper commit history
- [x] Created comprehensive README with setup instructions and documentation
- [x] Implemented event conflict detection with visual warnings in all calendar views
- [x] Added conflict detection to QuickAddModal with suggestion functionality
- [x] Enhanced time slot suggestions with smart scheduling and user-friendly interface
- [x] Implemented comprehensive search and filter functionality with real-time updates
- [x] Added preferred time slots per category for intelligent scheduling
- [x] Enhanced List view with FullCalendar list plugin for better functionality
- [x] Updated event templates with preferredTimes for each category type
- [x] Implemented category-aware time slot prioritization in scheduling logic
- [x] Added browser notification system with permission management
- [x] Created NotificationSettings component for user control
- [x] Integrated notifications with event CRUD operations
- [x] Implemented multi-reminder system with customizable reminder times
- [x] Added reminder selection UI to QuickAddModal
- [x] Implemented recurring events with full calendar integration
- [x] Added event completion tracking with visual indicators
- [x] Created quick duplicate functionality for events
- [x] Implemented comprehensive event editing and deletion across all calendar views
- [x] Built AnalyticsDashboard component with key metrics and visualizations
- [x] Added analytics navigation to desktop and mobile interfaces
- [x] Enhanced events store with templates support for category color mapping
- [x] Created export service with iCal, CSV, and JSON export functionality
- [x] Built ExportImport component with comprehensive import and backup features
- [x] Added export/import navigation to application interface
- [x] Fixed compilation errors (store import naming, defineEmits import removal)
- [x] Implemented compact mobile navigation with 4 main buttons and bottom sheet menu
- [x] Improved touch targets and mobile layouts across all components
- [x] Enhanced IconTemplates with better mobile sizing and touch feedback
- [x] Optimized ExportImport component for mobile with larger buttons and better spacing
- [x] Created service worker for offline functionality with caching and background sync
- [x] Implemented PWA manifest with app icons and installation support
- [x] Added service worker registration and PWA meta tags to index.html
- [x] Implemented ARIA labels and roles for modals and forms
- [x] Added keyboard navigation support to desktop navigation
- [x] Improved form accessibility with proper labels and error descriptions
- [x] Enhanced screen reader support for event completion checkboxes
- [x] Converted template selection divs to accessible buttons
- [x] Implemented lazy loading and code splitting for calendar components
- [x] Added caching for expensive computed properties in AnalyticsDashboard
- [x] Optimized event list rendering with unique keys and limited upcoming events
- [x] Reduced bundle size through component chunking (Analytics: 9.3kB, Export: 11.3kB)
- [x] Implemented comprehensive dark mode theme system with CSS custom properties
- [x] Created theme toggle component with sun/moon icons and accessibility labels
- [x] Added theme store with localStorage persistence and system preference detection
- [x] Updated all components to use theme-aware CSS variables for consistent theming
- [x] Integrated theme toggle in both desktop header and mobile menu
- [x] Fixed critical template access bug in QuickAddModal preventing event scheduling
- [x] Added guards for undefined template properties in modal rendering and event creation
- [x] Enhanced conflicts detection with validation to prevent undefined event access
- [x] Strengthened modal visibility conditions to prevent rendering with invalid templates
- [x] Fixed Vue prop type error by ensuring boolean evaluation of show condition
- [x] Added missing errors reactive property and validation logic to QuickAddModal
- [x] Updated deprecated apple-mobile-web-app-capable meta tag to mobile-web-app-capable
- [x] Fixed missing favicon by using SVG icon instead of ICO
- [x] Created alert store (stores/alerts.js) for managing in-app notifications
- [x] Built AlertNotification component with mobile-responsive design (desktop: top-right, mobile: bottom-up above nav)
- [x] Updated notification service with periodic checking system (checks every 60 seconds for upcoming events)
- [x] Integrated in-app alert system with browser notifications (dual notification support)
- [x] Added alert initialization in App.vue with automatic cleanup on unmount
- [x] Fixed TODO in MonthView - date clicks now open QuickAddModal pre-filled with clicked date
- [x] Added initialDate prop to QuickAddModal for pre-selecting event dates
- [x] Implemented active reminder alerts that show based on event reminder times (±1 minute tolerance)
- [x] Alert system prevents duplicate notifications and auto-dismisses after duration
- [x] Notifications persist across page refreshes via periodic checking (not dependent on setTimeout)
- [x] Refactored date click flow: clicking dates now shows IconTemplates selector (like FAB button)
- [x] Added date-click event emitters to MonthView, WeekView, and DayView
- [x] Date click workflow: Calendar Date Click → Template Selector → QuickAddModal with date auto-prefilled
- [x] Improved UX by maintaining consistent flow between FAB button and date clicks
- [x] Fixed layout regression caused by Tailwind v4 update
- [x] Reverted three problematic dependency merges:
  - Merge #10 (Playwright test 1.58.1 update)
  - Merge #9 (autoprefixer 10.4.24 update)
  - Merge #2 (Tailwind CSS 4.1.18 update)
- [x] Removed @tailwindcss/postcss v4 plugin, restored v3 compatible setup
- [x] Restored postcss.config.js to use standard tailwindcss plugin
- [x] Regenerated package-lock.json for stability
- [x] Verified menu layout returned to normal state after rollbacks

## Mobile Responsiveness Features

- **Adaptive Navigation**: Desktop header navigation, mobile bottom tab bar with icons
- **Responsive Layouts**: All components use Tailwind's responsive breakpoints
- **Touch-Friendly**: Adequate touch targets (44px+), proper spacing
- **Mobile-First Modals**: Full-screen overlays optimized for mobile
- **Flexible Grids**: Icon templates adapt from 3 columns on mobile to 7 on large screens
- **Optimized Calendar**: Responsive height (70vh) with minimum height for usability
- **FAB Positioning**: Adjusted for mobile bottom navigation

## Next Steps

### Phase 5: Polish & PWA (Week 6) - Dark Mode Completed

- [x] Responsive mobile design
- [x] Service worker for offline
- [x] PWA installation
- [x] Accessibility improvements
- [x] Performance optimization
- [x] Dark mode
- [x] User testing and bug fixes (fixed critical template access errors in QuickAddModal preventing event scheduling, prop type issues, missing validation errors, deprecated meta tags, and missing favicon)
