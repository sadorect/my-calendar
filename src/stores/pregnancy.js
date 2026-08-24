import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getSetting, setSetting } from '../services/database.js'
import {
  isBiometricAvailable,
  enrolBiometric,
  verifyBiometric,
  requestPersistentStorage,
  shouldRelock
} from '../services/biometric.js'
import {
  TOTAL_DAYS,
  dayOfPregnancy,
  dateForDay,
  weekOfPregnancy,
  gestationalAge,
  trimesterForDay,
  daysRemaining,
  progressFraction,
  isValidDueDate,
  timelineStatus,
  dueDateFromCurrentProgress
} from '../services/pregnancyTimeline.js'
import {
  MONTHS,
  monthForDay,
  monthByNumber,
  dayContent,
  weekContent,
  weekContentForDay,
  monthPalette
} from '../data/pregnancy/index.js'
import {
  emptyState,
  emptyProfileData,
  makeProfile,
  migrateState,
  orderedProfiles,
  writeLegacyMirror,
  LEGACY_PROFILE_ID
} from '../services/familyState.js'
import { resolveStage, ageInMonths, isStageId } from '../data/family/stages.js'
import {
  stageDayContent,
  stageWeekContent,
  stageMonthContent,
  stagePalette,
  themesForStage,
  themeForMonth,
  loadStageContent,
  isStageLoaded,
  stageHasContent
} from '../data/family/index.js'
import {
  stagePosition,
  dateForPosition,
  daysInMonth,
  weekOfMonth,
  weekRange,
  monthProgress,
  dayKey,
  dateFromDayKey,
  dayFavouriteKey,
  weekFavouriteKey,
  WEEKS_PER_MONTH
} from '../services/stageTimeline.js'

const STORAGE_KEY = 'birthCalendar'

export const usePregnancyStore = defineStore('pregnancy', () => {
  const state = ref(emptyState())
  const loaded = ref(false)
  /** Day of pregnancy the user is browsing. Null means "follow today". */
  const selectedDay = ref(null)
  /**
   * Date the user is browsing on a born-stage track, as a `YYYY-MM-DD` key.
   * Null means "follow today". Kept separate from `selectedDay` because the two
   * tracks address content differently and sharing one ref would mean a day
   * number landing in a date slot.
   */
  const selectedStageKey = ref(null)
  /** Recomputed at load and on demand so the app rolls over at midnight. */
  const now = ref(new Date())

  // ------------------------------------------------------------- persistence

  async function load() {
    const saved = await getSetting(STORAGE_KEY)
    // `migrateState` handles absent, version 1 and version 2 blobs alike, and
    // fills in any field a saved blob predates — so gaining a setting must
    // never wipe somebody's journal.
    state.value = migrateState(saved)
    loaded.value = true
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.touch=true]  stamp `updatedAt` with now.
   *   Sync passes false: a merged blob already carries the timestamp the merge
   *   decided on, and overwriting it would make every pull look like a local
   *   edit and bounce another push straight back at the server.
   */
  async function persist({ touch = true } = {}) {
    if (touch) state.value.updatedAt = new Date().toISOString()
    // Republished on every write so a device still running version 1 keeps
    // reading the womb track correctly. See familyState.js.
    writeLegacyMirror(state.value)
    await setSetting(STORAGE_KEY, JSON.parse(JSON.stringify(state.value)))
  }

  /** Replaces local state with a merged blob from sync. */
  async function applyState(next) {
    state.value = migrateState(next)
    await persist({ touch: false })
  }

  /**
   * The active child in the shape version 1 code expects.
   *
   * The keepsake builder and anything else written against the flat blob reads
   * this rather than `state`, because `state`'s version 1 mirror always holds
   * the *womb* child — printing that while another child is selected would be
   * a quiet, convincing lie.
   */
  const activeAsLegacy = computed(() => ({
    babyName: activeProfile.value?.name || '',
    dueDate: activeProfile.value?.dueDate || null,
    favourites: activeData.value.favourites,
    journal: activeData.value.journal,
    spoken: activeData.value.spoken,
    settings: state.value.settings
  }))

  // ------------------------------------------------------------------ set-up

  // ---------------------------------------------------------------- profiles

  /** Every child on the account, oldest first — the order of the switcher. */
  const profiles = computed(() => orderedProfiles(state.value))

  const activeProfile = computed(() => state.value.profiles[state.value.activeProfileId] || null)

  const hasProfiles = computed(() => profiles.value.length > 0)

  /** Which content track the active child reads: 'womb', 'year', or none. */
  const activeStage = computed(() => resolveStage(activeProfile.value, now.value))
  const activeTrack = computed(() => activeStage.value?.track || null)

  const activeAgeMonths = computed(() =>
    activeProfile.value?.birthDate ? ageInMonths(activeProfile.value.birthDate, now.value) : null
  )

  /**
   * The active child's own favourites, journal and spoken days.
   *
   * Always returns an object so a caller never has to null-check; it is only
   * detached from the state when there is no active profile at all, in which
   * case nothing can be written anyway.
   */
  const activeData = computed(() => {
    const id = state.value.activeProfileId
    if (!id) return emptyProfileData()
    if (!state.value.data[id]) state.value.data[id] = emptyProfileData()
    return state.value.data[id]
  })

  // Content follows the child: switching to a stage nobody has opened yet
  // fetches it once, and switching back is instant.
  watch(() => activeStage.value?.id, ensureStageContent, { immediate: true })

  async function selectProfile(id) {
    if (!state.value.profiles[id]) return false
    state.value.activeProfileId = id
    selectedDay.value = null
    await persist()
    return true
  }

  /** Adds a child and switches to them, because that is always what was meant. */
  async function addProfile(attrs = {}) {
    const profile = makeProfile(attrs)
    state.value.profiles[profile.id] = profile
    state.value.data[profile.id] = emptyProfileData()
    state.value.activeProfileId = profile.id
    selectedDay.value = null
    await persist()
    return profile
  }

  async function updateProfile(id, patch = {}) {
    const profile = state.value.profiles[id]
    if (!profile) return null
    const next = { ...profile, ...patch, id }
    if (next.kind === 'womb') next.stage = 'womb'
    else if (!isStageId(next.stage) && next.stage !== 'auto') next.stage = 'auto'
    next.name = String(next.name || '').trim()
    next.updatedAt = new Date().toISOString()
    state.value.profiles[id] = next
    await persist()
    return next
  }

  /**
   * Removes a child and everything they own.
   *
   * Irreversible and the caller must confirm it: a journal written over years
   * is the most valuable thing in this app and there is no undo.
   */
  async function removeProfile(id) {
    if (!state.value.profiles[id]) return false
    delete state.value.profiles[id]
    delete state.value.data[id]
    if (state.value.activeProfileId === id) {
      state.value.activeProfileId = orderedProfiles(state.value)[0]?.id || null
      selectedDay.value = null
    }
    await persist()
    return true
  }

  // ------------------------------------------------------------------ set-up

  /**
   * Whether the active child is ready to show content. A womb profile needs a
   * due date; a born child needs a birth date.
   */
  const isConfigured = computed(() => {
    const profile = activeProfile.value
    if (!profile) return false
    if (profile.kind === 'womb') return isValidDueDate(profile.dueDate)
    return Boolean(profile.birthDate) && !Number.isNaN(Date.parse(profile.birthDate))
  })

  const dueDate = computed(() => {
    const raw = activeProfile.value?.dueDate
    return raw && isValidDueDate(raw) ? new Date(raw) : null
  })

  const babyName = computed(() => activeProfile.value?.name || '')

  /**
   * Sets the due date, creating the womb profile if this is a first run.
   *
   * Onboarding calls this before any profile exists, and the id it mints is the
   * fixed legacy one so that a user who later syncs with a device still holding
   * a version 1 blob lands on the same child rather than a duplicate.
   */
  async function setDueDate(value) {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid due date')
    d.setHours(0, 0, 0, 0)

    let profile = activeProfile.value
    if (!profile || profile.kind !== 'womb') {
      profile = profiles.value.find((p) => p.kind === 'womb') || null
    }
    if (!profile) {
      profile = makeProfile({ id: LEGACY_PROFILE_ID, kind: 'womb' })
      state.value.profiles[profile.id] = profile
      state.value.data[profile.id] = emptyProfileData()
    }
    state.value.activeProfileId = profile.id
    profile.dueDate = d.toISOString()
    profile.updatedAt = new Date().toISOString()
    await persist()
  }

  /** The other way people know where they are: "I am 24 weeks and 3 days". */
  async function setCurrentProgress(weeks, days = 0) {
    await setDueDate(dueDateFromCurrentProgress(weeks, days, now.value))
  }

  async function setBabyName(name) {
    if (!activeProfile.value) return
    activeProfile.value.name = String(name || '').trim()
    activeProfile.value.updatedAt = new Date().toISOString()
    await persist()
  }

  async function updateSettings(patch) {
    state.value.settings = { ...state.value.settings, ...patch }
    await persist()
  }

  /** Clears every child and everything attached to them. Used by Settings. */
  async function reset() {
    state.value = emptyState()
    selectedDay.value = null
    await persist()
  }

  // ---------------------------------------------------------------- timeline

  function refreshNow() {
    now.value = new Date()
  }

  const status = computed(() =>
    isConfigured.value ? timelineStatus(dueDate.value, now.value) : null
  )

  /** Today's day number, clamped into the timeline for display purposes. */
  const todayDay = computed(() => {
    if (!isConfigured.value) return null
    const day = dayOfPregnancy(dueDate.value, now.value)
    return Math.min(TOTAL_DAYS, Math.max(1, day))
  })

  /** The day being viewed — the selected one, or today. */
  const activeDay = computed(() => selectedDay.value ?? todayDay.value)

  function selectDay(day) {
    if (day == null) {
      selectedDay.value = null
      return
    }
    selectedDay.value = Math.min(TOTAL_DAYS, Math.max(1, day))
  }

  function goToToday() {
    selectedDay.value = null
  }

  const isViewingToday = computed(() => selectedDay.value === null)

  const activeDate = computed(() =>
    isConfigured.value && activeDay.value ? dateForDay(dueDate.value, activeDay.value) : null
  )

  const activeWeek = computed(() => (activeDay.value ? weekOfPregnancy(activeDay.value) : null))
  const activeMonth = computed(() => (activeDay.value ? monthForDay(activeDay.value) : null))
  const activeAge = computed(() => (activeDay.value ? gestationalAge(activeDay.value) : null))
  const trimester = computed(() => (activeDay.value ? trimesterForDay(activeDay.value) : null))
  const palette = computed(() =>
    activeStage.value?.track === 'year'
      ? stagePalette(activeStage.value.id, activeStagePosition.value.month)
      : monthPalette(activeMonth.value)
  )

  const remaining = computed(() =>
    isConfigured.value ? daysRemaining(dueDate.value, now.value) : null
  )
  const progress = computed(() => (todayDay.value ? progressFraction(todayDay.value) : 0))

  // -------------------------------------------------------------- born stages

  /**
   * Bumped when a stage's content finishes loading.
   *
   * The content cache lives outside Vue — it is a plain module-level object, so
   * that lookups can stay synchronous — which means nothing here would ever
   * recompute when a fetch lands. Reading this counter inside the content
   * computeds is what wires the two together.
   */
  const contentRevision = ref(0)

  /**
   * Registers the calling computed as depending on loaded content.
   *
   * Called for its dependency, not its value: reading the counter is what makes
   * a computed recompute when a stage's content lands after first render,
   * instead of staying blank until something else happens to change.
   */
  function tracksContentLoads() {
    return contentRevision.value
  }

  /**
   * Fetches the active child's stage content if it is not already here.
   *
   * Called from a watcher rather than from a computed: a computed that started
   * a fetch would fire again on the result and be very hard to reason about.
   */
  async function ensureStageContent() {
    const id = activeStage.value?.id
    if (!id || activeStage.value.track !== 'year') return
    if (isStageLoaded(id) || !stageHasContent(id)) return
    if (await loadStageContent(id)) contentRevision.value += 1
  }

  /** The date being read on a born-stage track — the selected one, or today. */
  const activeStageDate = computed(() => {
    if (selectedStageKey.value) return dateFromDayKey(selectedStageKey.value) || now.value
    return now.value
  })

  const activeStagePosition = computed(() => stagePosition(activeStageDate.value))

  const isViewingStageToday = computed(() => selectedStageKey.value === null)

  function selectStageDate(value) {
    selectedStageKey.value = value == null ? null : dayKey(value)
  }

  function goToStageToday() {
    selectedStageKey.value = null
  }

  /**
   * Moves the born-stage view by whole theme months.
   *
   * Needed because a theme is only "today" for one month of the year: without
   * this, content written for January would be unreachable until January. The
   * day-of-month is clamped, so stepping from the 31st into a short month lands
   * on its last day rather than spilling into the next one.
   */
  function stepStageMonth(delta) {
    const { year, month, day } = activeStagePosition.value
    const target = new Date(year, month - 1 + delta, 1)
    const clamped = Math.min(day, daysInMonth(target.getFullYear(), target.getMonth() + 1))
    target.setDate(clamped)
    selectedStageKey.value = dayKey(target)
  }

  /** The theme for the month being read — the same twelve for every stage. */
  const activeTheme = computed(() => themeForMonth(activeStagePosition.value.month))

  /**
   * Puts the child's name into a parents' prayer.
   *
   * Born-stage *declarations* are written in the second person with no vocative,
   * so they need no patching. The prayers are different: they are addressed to
   * God about the child, so they have to say "our child" when no name is set —
   * and should say the name when there is one. "Pray for Ada" is what a parent
   * actually says out loud.
   *
   * The possessive is replaced first, because "our child" is a prefix of
   * "our child's" and the plain rule would otherwise leave a stray apostrophe-s.
   */
  function personaliseStage(text) {
    const name = activeProfile.value?.name?.trim()
    if (!name || typeof text !== 'string') return text
    return text
      .replace(/\bour child['\u2019]s\b/g, `${name}'s`)
      .replace(/\bthis child\b/g, name)
      .replace(/\bour child\b/g, name)
  }

  /** A week entry with its prayer personalised. */
  function personaliseStageEntry(entry) {
    if (!entry) return entry
    return typeof entry.parentsPrayer === 'string'
      ? { ...entry, parentsPrayer: personaliseStage(entry.parentsPrayer) }
      : entry
  }

  const activeStageMonth = computed(() => {
    tracksContentLoads()
    return activeStage.value?.track === 'year'
      ? stageMonthContent(activeStage.value.id, activeStagePosition.value.month)
      : null
  })

  const activeStageDayContent = computed(() => {
    tracksContentLoads()
    if (activeStage.value?.track !== 'year') return null
    const { month, day } = activeStagePosition.value
    const entry = stageDayContent(activeStage.value.id, month, day)
    if (!entry) return null
    return { ...entry, body: entry.declaration }
  })

  const activeStageWeekContent = computed(() => {
    tracksContentLoads()
    if (activeStage.value?.track !== 'year') return null
    const { month, week } = activeStagePosition.value
    return personaliseStageEntry(stageWeekContent(activeStage.value.id, month, week))
  })

  /** The four weekly cards for the month being read, written or not. */
  const stageWeekCards = computed(() => {
    tracksContentLoads()
    if (activeStage.value?.track !== 'year') return []
    const { year, month } = activeStagePosition.value
    const cards = []
    for (let w = 1; w <= WEEKS_PER_MONTH; w++) {
      const entry = personaliseStageEntry(stageWeekContent(activeStage.value.id, month, w))
      cards.push({ week: w, ...weekRange(w, year, month), entry: entry || null })
    }
    return cards
  })

  /** Every day of the month being read, for the month grid. */
  const stageMonthDays = computed(() => {
    tracksContentLoads()
    if (activeStage.value?.track !== 'year') return []
    const { year, month, day: today } = activeStagePosition.value
    const total = daysInMonth(year, month)
    const days = []
    for (let d = 1; d <= total; d++) {
      const key = dayKey(dateForPosition({ year, month, day: d }))
      days.push({
        day: d,
        key,
        week: weekOfMonth(d),
        isToday: d === today,
        entry: stageDayContent(activeStage.value.id, month, d),
        spoken: Boolean(activeData.value.spoken[key])
      })
    }
    return days
  })

  const stageThemes = computed(() => {
    tracksContentLoads()
    return activeStage.value?.track === 'year' ? themesForStage(activeStage.value.id) : []
  })

  const stageProgress = computed(() => monthProgress(activeStagePosition.value))

  // Favourites on this track are filed by position rather than by date: saving
  // a declaration means "worth coming back to", and it comes back every year.

  function stageFavouriteKeyFor(kind, target) {
    const { month } = activeStagePosition.value
    const id = activeStage.value?.id
    if (!id) return null
    return kind === 'week'
      ? weekFavouriteKey(id, month, target)
      : dayFavouriteKey(id, month, target)
  }

  function isStageFavourite(kind, target) {
    const key = stageFavouriteKeyFor(kind, target)
    return key ? Boolean(activeData.value.favourites[key]) : false
  }

  async function toggleStageFavourite(kind, target) {
    const key = stageFavouriteKeyFor(kind, target)
    if (!key) return
    const map = activeData.value.favourites
    if (map[key]) delete map[key]
    else map[key] = new Date().toISOString()
    await persist()
  }

  /**
   * Saved declarations for the active child, resolved back to their content.
   *
   * Keys are positions (`school:m01:d03`), so a favourite saved last January is
   * still here this January — which is the point of an evergreen theme.
   */
  const stageFavourites = computed(() => {
    tracksContentLoads()
    if (activeStage.value?.track !== 'year') return []
    const prefix = `${activeStage.value.id}:`
    return Object.entries(activeData.value.favourites)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, savedAt]) => {
        const match = /^[^:]+:m(\d{2}):([dw])(\d+)$/.exec(key)
        if (!match) return null
        const month = Number(match[1])
        const kind = match[2] === 'w' ? 'week' : 'day'
        const target = Number(match[3])
        const entry =
          kind === 'week'
            ? personaliseStageEntry(stageWeekContent(activeStage.value.id, month, target))
            : stageDayContent(activeStage.value.id, month, target)
        if (!entry) return null
        return { key, kind, month, target, savedAt, entry, theme: themeForMonth(month) }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  })

  /**
   * Journal entries for the active child on a born-stage track, newest first.
   *
   * Keyed by real date rather than by a position, so they read as a diary. The
   * womb track's `journalEntries` keeps its day-number ordering.
   */
  const stageJournalEntries = computed(() =>
    Object.entries(activeData.value.journal)
      .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .map(([key, entry]) => ({ key, date: dateFromDayKey(key), ...entry }))
      .sort((a, b) => (a.key < b.key ? 1 : -1))
  )

  /**
   * Consecutive days spoken, counting back from today by real calendar days.
   *
   * The womb streak counts back through day numbers; here there is no numbered
   * line to walk, so it walks dates. Encouragement, not accounting.
   */
  const stageSpokenStreak = computed(() => {
    const spoken = activeData.value.spoken
    let streak = 0
    const cursor = new Date(now.value)
    cursor.setHours(0, 0, 0, 0)
    // A cap, so a corrupted map cannot spin this forever.
    for (let i = 0; i < 3650; i++) {
      if (!spoken[dayKey(cursor)]) break
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  })

  // ----------------------------------------------------------------- content

  /**
   * Content addresses the baby as "Little one"; a chosen name replaces that
   * address rather than being appended. Every surface reads its text through
   * here, so the name shows up on weeks and favourites and not just on today.
   */
  function personalise(text) {
    const name = activeProfile.value?.name?.trim()
    if (!name || typeof text !== 'string') return text
    return text.replace(/Little one/g, name)
  }

  /** The same substitution across every prose field of a content entry. */
  function personaliseEntry(entry) {
    if (!entry) return entry
    const out = { ...entry }
    for (const key of ['declaration', 'partner', 'parentsPrayer', 'body']) {
      if (typeof out[key] === 'string') out[key] = personalise(out[key])
    }
    return out
  }

  /**
   * The declaration for the active day, already resolved for the chosen voice.
   * Returns null when that day has not been written yet — the UI shows a gentle
   * placeholder rather than an error.
   */
  const activeDayContent = computed(() => {
    if (!activeDay.value) return null
    const raw = dayContent(activeDay.value)
    if (!raw) return null
    const entry = personaliseEntry(raw)
    return {
      ...entry,
      // `partner` is optional per day; most declarations read naturally in both
      // voices, so falling back is the norm rather than a gap.
      body:
        state.value.settings.voice === 'partner' && entry.partner
          ? entry.partner
          : entry.declaration,
      hasPartnerVoice: Boolean(entry.partner)
    }
  })

  const activeWeekContent = computed(() =>
    activeDay.value ? personaliseEntry(weekContentForDay(activeDay.value)) : null
  )

  /** All four or five week cards for the month being viewed. */
  const monthWeekCards = computed(() => {
    const month = activeMonth.value
    if (!month) return []
    const cards = []
    for (let w = month.startWeek; w <= month.endWeek; w++) {
      cards.push(personaliseEntry(weekContent(w)) || { week: w, placeholder: true })
    }
    return cards
  })

  const months = computed(() => MONTHS)

  function monthNumber(number) {
    return monthByNumber(number)
  }

  // --------------------------------------------------------------- favourites

  function favouriteKey(kind, id) {
    return `${kind}:${id}`
  }

  function isFavourite(kind, id) {
    return Boolean(activeData.value.favourites[favouriteKey(kind, id)])
  }

  async function toggleFavourite(kind, id) {
    const key = favouriteKey(kind, id)
    const map = activeData.value.favourites
    if (map[key]) {
      delete map[key]
    } else {
      map[key] = new Date().toISOString()
    }
    await persist()
  }

  /** Favourites resolved back to their content, newest first. */
  const favourites = computed(() =>
    Object.entries(activeData.value.favourites)
      .map(([key, savedAt]) => {
        const [kind, rawId] = key.split(':')
        const id = Number(rawId)
        const entry = personaliseEntry(kind === 'day' ? dayContent(id) : weekContent(id))
        return entry ? { key, kind, id, savedAt, entry } : null
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  )

  // ------------------------------------------------------------------ journal

  function journalFor(day) {
    return activeData.value.journal[day]?.text || ''
  }

  async function saveJournal(day, text) {
    const trimmed = String(text || '')
    const map = activeData.value.journal
    if (!trimmed.trim()) {
      delete map[day]
    } else {
      map[day] = { text: trimmed, updatedAt: new Date().toISOString() }
    }
    await persist()
  }

  /**
   * Womb-track journal entries, newest day first.
   *
   * Filtered to numeric keys: a born child's entries are filed under a real
   * date, and `Number('2026-08-20')` is NaN — which would sort to nowhere and
   * render as "Day NaN".
   */
  const journalEntries = computed(() =>
    Object.entries(activeData.value.journal)
      .filter(([key]) => /^\d+$/.test(key))
      .map(([day, entry]) => ({ day: Number(day), ...entry }))
      .sort((a, b) => b.day - a.day)
  )

  // -------------------------------------------------------- spoken / progress

  function isSpoken(day) {
    return Boolean(activeData.value.spoken[day])
  }

  async function toggleSpoken(day) {
    const map = activeData.value.spoken
    if (map[day]) {
      delete map[day]
    } else {
      map[day] = new Date().toISOString()
    }
    await persist()
  }

  const spokenCount = computed(() => Object.keys(activeData.value.spoken).length)

  /**
   * Consecutive days spoken, counting back from today. Encouragement, not
   * accounting — a missed day should not feel like a failure, so this is only
   * ever shown when it is greater than one.
   */
  const spokenStreak = computed(() => {
    if (!todayDay.value) return 0
    let streak = 0
    for (let day = todayDay.value; day >= 1; day--) {
      if (!activeData.value.spoken[day]) break
      streak++
    }
    return streak
  })

  // ---------------------------------------------------------------- reminders

  /** Stamps a day as delivered so the same reminder cannot fire twice. */
  async function markReminderFired(key) {
    if (activeData.value.lastReminderKey === key) return
    activeData.value.lastReminderKey = key
    await persist()
  }

  /** What the scheduler reads on every tick — always current, never captured. */
  const reminderConfig = computed(() => ({
    enabled: Boolean(state.value.settings.remindersEnabled),
    time: state.value.settings.reminderTime || '08:00',
    lastFiredKey: activeData.value.lastReminderKey
  }))

  /**
   * The notification body for today. Built from today's declaration rather than
   * the day being browsed, so a reminder that fires while the user is reading
   * month 2 still says what today actually is.
   */
  const reminderPayload = computed(() => {
    const day = todayDay.value
    if (!day) return null
    const entry = dayContent(day)
    if (!entry) return null
    const voiced =
      state.value.settings.voice === 'partner' && entry.partner ? entry.partner : entry.declaration
    const body = personalise(voiced)
    return {
      title: entry.title,
      body: body.length > 180 ? body.slice(0, 177).trimEnd() + '…' : body,
      tag: `birth-daily-${day}`
    }
  })

  // -------------------------------------------------------------- app lock

  const unlockedAt = ref(null)
  const hiddenSince = ref(null)
  const biometricAvailable = ref(false)
  const lockError = ref('')

  const lockEnabled = computed(() =>
    Boolean(state.value.settings.appLockEnabled && state.value.settings.credentialId)
  )

  /** True when the lock screen should be covering the content. */
  const isLocked = computed(() => {
    if (!lockEnabled.value) return false
    return shouldRelock({
      unlockedAt: unlockedAt.value,
      hiddenSince: hiddenSince.value,
      graceMs: (state.value.settings.lockGraceMinutes || 5) * 60 * 1000
    })
  })

  async function detectBiometric() {
    biometricAvailable.value = await isBiometricAvailable()
    return biometricAvailable.value
  }

  /**
   * Turns the lock on. Enrols FIRST and only persists the setting if the device
   * actually produced a credential, so a cancelled prompt leaves the app exactly
   * as it was rather than locked with no way in.
   */
  async function enableAppLock(label) {
    lockError.value = ''
    try {
      const credentialId = await enrolBiometric(label)
      await updateSettings({ appLockEnabled: true, credentialId })
      // An installed PWA that loses its IndexedDB loses the credential binding
      // too, so ask for durable storage at the same moment.
      await requestPersistentStorage()
      unlockedAt.value = Date.now()
      hiddenSince.value = null
      return true
    } catch (e) {
      lockError.value =
        e?.name === 'NotAllowedError'
          ? 'That was cancelled — the lock is still off.'
          : 'This device would not set up a biometric lock.'
      return false
    }
  }

  async function disableAppLock() {
    await updateSettings({ appLockEnabled: false, credentialId: null })
    unlockedAt.value = Date.now()
  }

  async function unlock() {
    lockError.value = ''
    const ok = await verifyBiometric(state.value.settings.credentialId)
    if (ok) {
      unlockedAt.value = Date.now()
      hiddenSince.value = null
      return true
    }
    lockError.value = 'Not recognised. Try again.'
    return false
  }

  function noteHidden() {
    hiddenSince.value = Date.now()
  }

  function noteVisible() {
    // Leave hiddenSince in place if the grace period has already lapsed, so the
    // computed lock stays true until an unlock actually happens.
    if (!isLocked.value) hiddenSince.value = null
  }

  return {
    // state
    state,
    loaded,
    selectedDay,
    // profiles
    profiles,
    activeProfile,
    hasProfiles,
    activeStage,
    activeTrack,
    activeAgeMonths,
    activeData,
    activeAsLegacy,
    selectProfile,
    addProfile,
    updateProfile,
    removeProfile,
    // setup
    isConfigured,
    dueDate,
    babyName,
    setDueDate,
    setCurrentProgress,
    setBabyName,
    updateSettings,
    reset,
    load,
    persist,
    applyState,
    refreshNow,
    // timeline
    status,
    todayDay,
    activeDay,
    activeDate,
    activeWeek,
    activeMonth,
    activeAge,
    trimester,
    palette,
    remaining,
    progress,
    isViewingToday,
    selectDay,
    goToToday,
    // born stages
    activeStageDate,
    activeStagePosition,
    isViewingStageToday,
    selectStageDate,
    goToStageToday,
    stepStageMonth,
    activeTheme,
    activeStageMonth,
    activeStageDayContent,
    activeStageWeekContent,
    stageWeekCards,
    stageMonthDays,
    stageThemes,
    stageProgress,
    isStageFavourite,
    toggleStageFavourite,
    stageSpokenStreak,
    stageFavourites,
    stageJournalEntries,
    ensureStageContent,
    personaliseStage,
    contentRevision,
    dayKey,
    // content
    personalise,
    activeDayContent,
    activeWeekContent,
    monthWeekCards,
    months,
    monthNumber,
    // favourites
    isFavourite,
    toggleFavourite,
    favourites,
    // journal
    journalFor,
    saveJournal,
    journalEntries,
    // spoken
    isSpoken,
    toggleSpoken,
    spokenCount,
    spokenStreak,
    // reminders
    markReminderFired,
    reminderConfig,
    reminderPayload,
    // app lock
    isLocked,
    lockEnabled,
    lockError,
    biometricAvailable,
    detectBiometric,
    enableAppLock,
    disableAppLock,
    unlock,
    noteHidden,
    noteVisible
  }
})
