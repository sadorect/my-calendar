# Prayer Journal — plan

Branch: on top of `feat/family-profiles` (PR #40), or its own branch after #40
merges. Tracker: `agent.md`, Phase 10. Status lines below are the resumable
state — tick them as they land.

## What it is

A family-level list of prayers: things being prayed for, when they were
answered, and what the answer was. It is **not** the per-day journal that
already exists (`data[profileId].journal` — a note attached to one
declaration day). A prayer lives on its own timeline, may or may not concern a
particular child, and may be born from a declaration ("pray this one").

Surfaced by a **floating card** in the birth calendar — the same fixed,
blurred-pill idiom as the "← Calendar" button in `src/App.vue:178` that
launches the productivity calendar — which opens the journal as a
full-screen view. Not a sixth bottom tab: the tab bar is at five and the
journal spans children, while every tab is scoped to the active child.

## Decisions (made; don't relitigate)

- **Family-scoped, child-optional.** `prayers` is a top-level map in the
  state blob, not under `data[profileId]`. An entry carries an optional
  `profileId`. Removing a child leaves their prayers, with the link cleared.
- **Text only.** Every push sends the whole blob and the server caps a body
  at 4MB. No attachments.
- **Never lose an entry.** Same rule as the journal: merge is a union,
  latest `updatedAt` wins per entry, deletion is a tombstone (`deletedAt`),
  and a device that has never seen `prayers` cannot clear it.
- **No state version bump.** Adding a top-level key is additive; version 1
  clients neither read nor write it, and the mirror is untouched.

## Model

```js
// state.prayers: { [id]: PrayerEntry }
{
  id,              // newProfileId()-style random id, minted once
  text,            // the request itself
  profileId,       // null | a profile id; cleared if that child is removed
  source,          // null | { stage, key, title } — the declaration it came from
  status,          // 'praying' | 'answered'
  answer,          // '' | how it was answered
  createdAt, updatedAt, answeredAt, deletedAt   // ISO or null
}
```

`source.key` uses the existing content addressing (`day:47`, `week:12`,
`school:m03:d17`) so the entry can link back to its card.

## Phases

### Phase 1 — state and merge (no UI)

- [x] `familyState.js`: `emptyState().prayers = {}`; `normalise()` copies it
      via a `cleanPrayers()` that drops non-objects and fills defaults;
      `fromLegacy()` gives `{}`; `makePrayer({...})` factory.
      **`normalise` rebuilds from `emptyState()` and only copies known keys —
      without this step the field is silently dropped on every load.**
- [x] `mergeState.js`: `unionPrayers(local, remote)` — union by id, later
      `updatedAt` wins, a tombstone beats a live entry only if newer; wire it
      into `mergeStates()` (which currently spreads `dominant` and would
      otherwise take whichever side is newer wholesale). `statesDiffer`
      must see it.
- [x] Removing a profile clears `profileId` on its prayers rather than
      deleting them.
- [x] Tests in `tests/unit/prayers-state.spec.js`:
      migrate v1 → `{}`; v2 without the key → `{}`; round-trip; a stale
      device pushing no `prayers` does not erase the other side's; tombstone
      vs edit ordering; same-timestamp conflict keeps both texts (mirror the
      journal rule).

### Phase 2 — store

- [x] `stores/pregnancy.js`: `prayers` computed (live, not deleted, sorted
      open-first then newest); `openPrayerCount`; actions `addPrayer`,
      `updatePrayer`, `markAnswered(id, answer)`, `reopenPrayer`,
      `deletePrayer` (tombstone). All `await persist()`.
- [x] `prayersFor(profileId)` for the child-scoped views.
- [x] Store tests (`tests/unit/pregnancy-prayers.spec.js`).

### Phase 3 — the floating card and the view

- [x] `components/Birth/BirthPrayerCard.vue`: fixed top row, left of the
      "← Calendar" pill (`top-3; right: 7.25rem`) — the user chose the top
      row over bottom-right, where it would sit on content. Same
      `bg-black/25 backdrop-blur-md rounded-full` treatment as the pill, 44px
      min hit target. Shows a hands/candle glyph and the open
      count ("3 praying"). Hidden during onboarding and while locked
      (`BirthLock`). Click → `view = 'prayers'`.
- [x] `BirthCalendar.vue`: add `'prayers'` to the view switch (not to
      `TABS`); the tab bar shows no tab as current while in it; a back
      affordance returns to the previous tab.
- [x] `components/Birth/BirthPrayers.vue`: two sections, *Praying* and
      *Answered*; add form at the top (text, optional child chip from
      `orderedProfiles`); per-entry: edit, "Answered" → inline answer text,
      reopen, delete with confirm. Empty state written in the app's voice.
- [x] Dark mode via the existing `--bc-*` custom properties; the birth scope
      uses inline palette vars, not Tailwind's `dark:`.
- [x] e2e in `tests/birth-calendar.spec.js`: card visible on Today, opens
      the view, add → answered → survives reload (IndexedDB).

### Phase 4 — links from the declarations

- [ ] "Pray this" action on `DeclarationCard.vue` and `StageDeclarationCard.vue`
      (next to favourite/spoken): creates an entry with `source` and the
      active `profileId`, then shows the card count tick up.
- [ ] Entries with a `source` render the title as a link that jumps to that
      day/week.

### Phase 5 — keepsake and reminders (optional, after 1–4 ship)

- [ ] `keepsake.js`: an "Answered prayers" section on the printable keepsake
      when any exist for that child.
- [ ] Reminder digest: if the multi-child digest gets built, append the open
      prayer count. Not before.

## Sync note

Sync is live and registration is open, so Phase 1 runs against real vaults
the moment it deploys. Ship Phase 1 + 2 with tests before any UI, and check
`GET /v1/stats` still parses the blob (it only counts rows; it should be
indifferent).

## Out of scope

Sharing prayers between accounts; photos; reminders per prayer; export to
the productivity calendar.
