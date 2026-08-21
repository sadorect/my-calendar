import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSetting, setSetting } from '../services/database.js'
import {
  isBiometricAvailable,
  enrolBiometric,
  verifyBiometric,
  requestPersistentStorage,
  shouldRelock,
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
  dueDateFromCurrentProgress,
} from '../services/pregnancyTimeline.js'
import {
  MONTHS,
  monthForDay,
  monthByNumber,
  dayContent,
  weekContent,
  weekContentForDay,
  monthPalette,
} from '../data/pregnancy/index.js'

const STORAGE_KEY = 'birthCalendar'

/**
 * Everything the user owns in the birth calendar, in one serialisable object.
 *
 * Deliberately a single blob rather than a table per concern: it is written and
 * read atomically, and when cloud sync arrives it is one document to push, one
 * `updatedAt` to compare, and no cross-store consistency to reason about.
 */
function emptyState() {
  return {
    version: 1,
    dueDate: null, // ISO date string, the single source of truth for the timeline
    babyName: '',
    favourites: {}, // "day:47" | "week:12" -> ISO timestamp
    journal: {}, // day number -> { text, updatedAt }
    spoken: {}, // day number -> ISO timestamp
    // Local day key ("2026-08-21") of the last delivered daily reminder. Kept
    // outside `settings` because it is delivery bookkeeping, not a preference.
    lastReminderKey: null,
    settings: {
      // Which calendar opens on launch. This is the toggle between the original
      // productivity calendar and the birth calendar.
      defaultMode: 'standard', // 'standard' | 'birth'
      voice: 'parents', // 'parents' | 'partner' — rephrases where content provides it
      reminderTime: '08:00',
      remindersEnabled: false,
      ambientSound: 'womb',
      ambientVolume: 0.5,
      fontScale: 1,
      highContrast: false,
      // Biometric app lock. `credentialId` is only ever set alongside a
      // successful enrolment — never enable one without the other or the user
      // is locked out of their own journal.
      appLockEnabled: false,
      credentialId: null,
      lockGraceMinutes: 5,
    },
    updatedAt: null,
  }
}

export const usePregnancyStore = defineStore('pregnancy', () => {
  const state = ref(emptyState())
  const loaded = ref(false)
  /** Day the user is browsing. Null means "follow today". */
  const selectedDay = ref(null)
  /** Recomputed at load and on demand so the app rolls over at midnight. */
  const now = ref(new Date())

  // ------------------------------------------------------------- persistence

  async function load() {
    const saved = await getSetting(STORAGE_KEY)
    if (saved) {
      // Merge rather than replace: a state shape gaining a field must not wipe
      // a user's journal because their saved blob predates it.
      state.value = {
        ...emptyState(),
        ...saved,
        settings: { ...emptyState().settings, ...(saved.settings || {}) },
      }
    }
    loaded.value = true
  }

  async function persist() {
    state.value.updatedAt = new Date().toISOString()
    await setSetting(STORAGE_KEY, JSON.parse(JSON.stringify(state.value)))
  }

  // ------------------------------------------------------------------ set-up

  const isConfigured = computed(() => isValidDueDate(state.value.dueDate))

  const dueDate = computed(() =>
    isConfigured.value ? new Date(state.value.dueDate) : null
  )

  async function setDueDate(value) {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid due date')
    d.setHours(0, 0, 0, 0)
    state.value.dueDate = d.toISOString()
    await persist()
  }

  /** The other way people know where they are: "I am 24 weeks and 3 days". */
  async function setCurrentProgress(weeks, days = 0) {
    await setDueDate(dueDateFromCurrentProgress(weeks, days, now.value))
  }

  async function setBabyName(name) {
    state.value.babyName = String(name || '').trim()
    await persist()
  }

  async function updateSettings(patch) {
    state.value.settings = { ...state.value.settings, ...patch }
    await persist()
  }

  /** Clears the timeline and everything attached to it. Used by Settings. */
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
  const palette = computed(() => monthPalette(activeMonth.value))

  const remaining = computed(() =>
    isConfigured.value ? daysRemaining(dueDate.value, now.value) : null
  )
  const progress = computed(() => (todayDay.value ? progressFraction(todayDay.value) : 0))

  // ----------------------------------------------------------------- content

  /**
   * The declaration for the active day, already resolved for the chosen voice.
   * Returns null when that day has not been written yet — the UI shows a gentle
   * placeholder rather than an error.
   */
  const activeDayContent = computed(() => {
    if (!activeDay.value) return null
    const entry = dayContent(activeDay.value)
    if (!entry) return null
    return {
      ...entry,
      // `partner` is optional per day; most declarations read naturally in both
      // voices, so falling back is the norm rather than a gap.
      body: state.value.settings.voice === 'partner' && entry.partner
        ? entry.partner
        : entry.declaration,
      hasPartnerVoice: Boolean(entry.partner),
    }
  })

  const activeWeekContent = computed(() =>
    activeDay.value ? weekContentForDay(activeDay.value) : null
  )

  /** All four or five week cards for the month being viewed. */
  const monthWeekCards = computed(() => {
    const month = activeMonth.value
    if (!month) return []
    const cards = []
    for (let w = month.startWeek; w <= month.endWeek; w++) {
      cards.push(weekContent(w) || { week: w, placeholder: true })
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
    return Boolean(state.value.favourites[favouriteKey(kind, id)])
  }

  async function toggleFavourite(kind, id) {
    const key = favouriteKey(kind, id)
    if (state.value.favourites[key]) {
      delete state.value.favourites[key]
    } else {
      state.value.favourites[key] = new Date().toISOString()
    }
    await persist()
  }

  /** Favourites resolved back to their content, newest first. */
  const favourites = computed(() =>
    Object.entries(state.value.favourites)
      .map(([key, savedAt]) => {
        const [kind, rawId] = key.split(':')
        const id = Number(rawId)
        const entry = kind === 'day' ? dayContent(id) : weekContent(id)
        return entry ? { key, kind, id, savedAt, entry } : null
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  )

  // ------------------------------------------------------------------ journal

  function journalFor(day) {
    return state.value.journal[day]?.text || ''
  }

  async function saveJournal(day, text) {
    const trimmed = String(text || '')
    if (!trimmed.trim()) {
      delete state.value.journal[day]
    } else {
      state.value.journal[day] = { text: trimmed, updatedAt: new Date().toISOString() }
    }
    await persist()
  }

  const journalEntries = computed(() =>
    Object.entries(state.value.journal)
      .map(([day, entry]) => ({ day: Number(day), ...entry }))
      .sort((a, b) => b.day - a.day)
  )

  // -------------------------------------------------------- spoken / progress

  function isSpoken(day) {
    return Boolean(state.value.spoken[day])
  }

  async function toggleSpoken(day) {
    if (state.value.spoken[day]) {
      delete state.value.spoken[day]
    } else {
      state.value.spoken[day] = new Date().toISOString()
    }
    await persist()
  }

  const spokenCount = computed(() => Object.keys(state.value.spoken).length)

  /**
   * Consecutive days spoken, counting back from today. Encouragement, not
   * accounting — a missed day should not feel like a failure, so this is only
   * ever shown when it is greater than one.
   */
  const spokenStreak = computed(() => {
    if (!todayDay.value) return 0
    let streak = 0
    for (let day = todayDay.value; day >= 1; day--) {
      if (!state.value.spoken[day]) break
      streak++
    }
    return streak
  })

  // ---------------------------------------------------------------- reminders

  /** Stamps a day as delivered so the same reminder cannot fire twice. */
  async function markReminderFired(key) {
    if (state.value.lastReminderKey === key) return
    state.value.lastReminderKey = key
    await persist()
  }

  /** What the scheduler reads on every tick — always current, never captured. */
  const reminderConfig = computed(() => ({
    enabled: Boolean(state.value.settings.remindersEnabled),
    time: state.value.settings.reminderTime || '08:00',
    lastFiredKey: state.value.lastReminderKey,
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
    const name = state.value.babyName?.trim()
    const voiced =
      state.value.settings.voice === 'partner' && entry.partner ? entry.partner : entry.declaration
    const body = name ? voiced.replace(/Little one/g, name) : voiced
    return {
      title: entry.title,
      body: body.length > 180 ? body.slice(0, 177).trimEnd() + '…' : body,
      tag: `birth-daily-${day}`,
    }
  })

  // -------------------------------------------------------------- app lock

  const unlockedAt = ref(null)
  const hiddenSince = ref(null)
  const biometricAvailable = ref(false)
  const lockError = ref('')

  const lockEnabled = computed(
    () => Boolean(state.value.settings.appLockEnabled && state.value.settings.credentialId)
  )

  /** True when the lock screen should be covering the content. */
  const isLocked = computed(() => {
    if (!lockEnabled.value) return false
    return shouldRelock({
      unlockedAt: unlockedAt.value,
      hiddenSince: hiddenSince.value,
      graceMs: (state.value.settings.lockGraceMinutes || 5) * 60 * 1000,
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
    // setup
    isConfigured,
    dueDate,
    setDueDate,
    setCurrentProgress,
    setBabyName,
    updateSettings,
    reset,
    load,
    persist,
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
    // content
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
    noteVisible,
  }
})
