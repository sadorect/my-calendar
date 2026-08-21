<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { createDailyReminder } from '../../services/birthReminders.js'
import { useSync } from '../../composables/useSync.js'
import BirthOnboarding from './BirthOnboarding.vue'
import BirthToday from './BirthToday.vue'
import BirthMonth from './BirthMonth.vue'
import BirthWeeks from './BirthWeeks.vue'
import BirthFavourites from './BirthFavourites.vue'
import BirthSettings from './BirthSettings.vue'
import BirthDayModal from './BirthDayModal.vue'
import BirthLock from './BirthLock.vue'

const store = usePregnancyStore()

const view = ref('today')
const modalDay = ref(null)
/** Set when the user skips onboarding — browse without a due date. */
const browsing = ref(false)
const particles = ref([])

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'Month' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'saved', label: 'Saved' },
  { id: 'settings', label: 'Settings' }
]

const needsOnboarding = computed(() => !store.isConfigured && !browsing.value)

const scopeStyle = computed(() => ({
  '--bc-from': store.palette.from,
  '--bc-to': store.palette.to,
  '--bc-accent': store.palette.accent,
  '--bc-font-scale': store.state.settings.fontScale
}))

/**
 * Browsing without a due date. A named handler rather than two statements in
 * the template: Prettier reflows a multi-statement inline handler onto separate
 * lines without semicolons, which Vue's expression parser then refuses to
 * compile — a formatting pass should not be able to break the build.
 */
function startBrowsing() {
  browsing.value = true
  store.selectDay(1)
}

function openDay(day) {
  store.selectDay(day)
  modalDay.value = day
}

/**
 * A quiet celebration the first time a new month is reached. Fires on the month
 * CHANGING, not on the month being viewed, so browsing back and forth does not
 * set it off repeatedly.
 */
let lastMonth = null
watch(
  () => store.activeMonth?.month,
  (month) => {
    if (lastMonth !== null && month !== lastMonth && month > lastMonth) {
      celebrate()
    }
    lastMonth = month ?? null
  }
)

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  particles.value = Array.from({ length: 14 }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    left: 10 + Math.random() * 80,
    delay: Math.random() * 600,
    size: 4 + Math.random() * 6
  }))
  setTimeout(() => (particles.value = []), 4600)
}

// The day rolls over at midnight; without this the app would sit on yesterday
// until it was reloaded.
let midnightTimer = null
function scheduleMidnightRefresh() {
  const next = new Date()
  next.setHours(24, 0, 5, 0)
  midnightTimer = setTimeout(() => {
    store.refreshNow()
    scheduleMidnightRefresh()
  }, next - Date.now())
}

// The daily reminder. Config is read live on each tick, so changing the time in
// Settings needs no restart — but the enabled flag does decide whether the
// scheduler runs at all, hence the watch below.
const reminder = createDailyReminder({
  getConfig: () => store.reminderConfig,
  getPayload: () => store.reminderPayload,
  onFired: (key) => store.markReminderFired(key)
})

watch(
  () => store.reminderConfig,
  (config) => {
    if (config.enabled && !reminder.isRunning) reminder.start()
    else if (!config.enabled && reminder.isRunning) reminder.stop()
    else reminder.sync()
  },
  { deep: true }
)

// Sync: restore the session, pull on open and on returning to the tab, and push
// a short while after any local change. Everything here no-ops when no sync
// server is configured at build time.
const sync = useSync()

watch(
  () => store.state.updatedAt,
  () => sync.scheduleSync()
)

function handleVisibility() {
  if (document.hidden) {
    store.noteHidden()
    return
  }
  store.refreshNow()
  store.noteVisible()
  // Timers are throttled or killed in a backgrounded tab, so a reminder that
  // was owed while we were away is delivered on the way back in.
  reminder.sync()
  sync.syncNow({ silent: true })
}

onMounted(() => {
  scheduleMidnightRefresh()
  store.detectBiometric()
  document.addEventListener('visibilitychange', handleVisibility)
  if (store.reminderConfig.enabled) reminder.start()
  sync.restore().then(() => sync.syncNow({ silent: true }))
})

onBeforeUnmount(() => {
  clearTimeout(midnightTimer)
  document.removeEventListener('visibilitychange', handleVisibility)
  reminder.stop()
})
</script>

<template>
  <div
    class="birth-scope min-h-full relative"
    :class="{ 'bc-contrast': store.state.settings.highContrast }"
    :style="scopeStyle"
  >
    <!-- New-month particles -->
    <div
      v-if="particles.length"
      class="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      <span
        v-for="p in particles"
        :key="p.id"
        class="absolute bottom-24 rounded-full animate-drift"
        :style="{
          left: p.left + '%',
          width: p.size + 'px',
          height: p.size + 'px',
          backgroundColor: 'var(--bc-accent)',
          animationDelay: p.delay + 'ms'
        }"
      />
    </div>

    <BirthOnboarding
      v-if="needsOnboarding"
      class="pt-10"
      @done="view = 'today'"
      @browse="startBrowsing"
    />

    <template v-else>
      <!-- Browsing without a due date set -->
      <div v-if="!store.isConfigured" class="px-5 pt-14 max-w-2xl mx-auto">
        <div class="bc-card px-4 py-3 flex items-center justify-between gap-3">
          <p class="text-sm bc-muted">Browsing without a due date.</p>
          <button class="bc-tap text-sm bc-accent px-3" @click="browsing = false">Set it up</button>
        </div>
      </div>

      <!-- pt clears the fixed "back to calendar" control in the corner. -->
      <main class="pt-12 pb-24">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0"
        >
          <BirthToday v-if="view === 'today'" @open-day="openDay" @open-weeks="view = 'weeks'" />
          <BirthMonth v-else-if="view === 'month'" @open-day="openDay" />
          <BirthWeeks v-else-if="view === 'weeks'" />
          <BirthFavourites v-else-if="view === 'saved'" @open-day="openDay" />
          <BirthSettings v-else-if="view === 'settings'" />
        </Transition>
      </main>

      <!-- Bottom tabs -->
      <nav
        class="fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl"
        :style="{ backgroundColor: 'var(--bc-surface)', borderColor: 'var(--bc-hairline)' }"
        aria-label="Birth calendar sections"
      >
        <div class="max-w-2xl mx-auto flex">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="bc-tap flex-1 py-3 text-xs font-medium transition"
            :aria-current="view === tab.id ? 'page' : undefined"
            :style="{ color: view === tab.id ? 'var(--bc-accent)' : 'var(--bc-muted)' }"
            @click="view = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </nav>
    </template>

    <BirthDayModal :day="modalDay" @close="modalDay = null" />

    <!-- Covers everything, including the modal, whenever the lock is active. -->
    <BirthLock v-if="store.isLocked" />
  </div>
</template>
