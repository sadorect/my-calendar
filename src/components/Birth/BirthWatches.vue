<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import {
  PRAYER_WATCHES,
  WATCH_LENGTH_HOURS,
  defaultWatchTime,
  formatClock,
  minutesOf,
  timeInWatch,
  watchAt,
  watchWindowLabel
} from '../../data/prayerWatches.js'
import { skipCurrentOccurrence } from '../../services/prayerWatchReminders.js'
import { downloadWatchCalendar, selectedWatchLinks } from '../../services/prayerWatchCalendar.js'
import {
  notificationPermission,
  requestNotificationPermission
} from '../../services/birthReminders.js'

/**
 * The eight prayer watches: what each is for, a verse, a prompt to pray, and
 * a reminder switch. Family-wide like the prayer journal, so it is reached
 * from the journal and from Settings rather than being a per-child tab.
 */
const props = defineProps({
  /** A watch to open and scroll to, e.g. from a tapped reminder. */
  focusId: { type: String, default: null }
})
const emit = defineEmits(['close'])

const store = usePregnancyStore()
const now = ref(new Date())
const current = computed(() => watchAt(now.value))
const open = ref(new Set([props.focusId || current.value?.id].filter(Boolean)))
const permission = ref('default')
const timeError = ref({})
const showGoogleLinks = ref(false)

onMounted(async () => {
  permission.value = notificationPermission()
  if (props.focusId) {
    await nextTick()
    document.getElementById(`watch-${props.focusId}`)?.scrollIntoView({ block: 'start' })
  }
})

const selection = computed(() => store.watchSelection)
const selectedCount = computed(() => Object.keys(selection.value).length)
const googleLinks = computed(() => selectedWatchLinks(selection.value))

function toggleOpen(id) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}

function isPrayed(watch) {
  return Boolean(store.prayerForSource(`watch:${watch.id}`))
}

async function pray(watch) {
  await store.prayWatch(watch)
}

/**
 * Switching on saves the choice whatever the browser says about
 * notifications — the same choice drives the calendar file below, which
 * works without them.
 */
async function toggleReminder(watch) {
  if (selection.value[watch.id]) {
    await store.setWatchReminder(watch.id, null)
    return
  }
  const time = defaultWatchTime(watch)
  skipCurrentOccurrence(watch.id, time)
  await store.setWatchReminder(watch.id, time)
  if (permission.value === 'default') permission.value = await requestNotificationPermission()
}

/** "00:30" as the device would show it. */
function clockLabel(time) {
  return formatClock(minutesOf(time))
}

function lastMinute(watch) {
  return formatClock(watch.start * 60 + WATCH_LENGTH_HOURS * 60 - 1)
}

function inputMax(watch) {
  const minutes = watch.start * 60 + WATCH_LENGTH_HOURS * 60 - 1
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

async function changeTime(watch, event) {
  const value = event.target.value
  if (!timeInWatch(watch, value)) {
    event.target.value = selection.value[watch.id]
    timeError.value = {
      ...timeError.value,
      [watch.id]: `Choose a time between ${formatClock(watch.start * 60)} and ${lastMinute(watch)}.`
    }
    return
  }
  timeError.value = { ...timeError.value, [watch.id]: '' }
  skipCurrentOccurrence(watch.id, value)
  await store.setWatchReminder(watch.id, value)
}

function addToCalendar() {
  downloadWatchCalendar(selection.value)
}

const permissionNote = computed(() => {
  if (!selectedCount.value) return ''
  if (permission.value === 'unsupported') {
    return 'This browser cannot show notifications, so the app cannot remind you here. Add the watches to your phone’s calendar below instead.'
  }
  if (permission.value === 'denied') {
    return 'Notifications are blocked for this app, so reminders will not show on this device. Allow them in your phone’s settings, or add the watches to your phone’s calendar below.'
  }
  return ''
})
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto" data-testid="prayer-watches">
    <div class="flex items-start justify-between gap-3 mb-1">
      <h1 class="font-serif text-2xl">Prayer watches</h1>
      <button
        class="bc-tap text-sm bc-accent px-2 -mr-2"
        type="button"
        aria-label="Back"
        @click="emit('close')"
      >
        ← Back
      </button>
    </div>
    <p class="text-sm bc-muted mb-6 leading-relaxed">
      The day divided into eight watches of three hours, beginning at 6pm as the biblical day begins
      at evening. Each has its own focus for prayer. Switch on the ones you keep and you will be
      reminded when they open.
    </p>

    <ol class="space-y-3">
      <li v-for="watch in PRAYER_WATCHES" :key="watch.id">
        <article
          :id="`watch-${watch.id}`"
          class="bc-card p-5 scroll-mt-16"
          :style="current?.id === watch.id ? { boxShadow: '0 0 0 1.5px var(--bc-accent)' } : null"
          :data-watch-id="watch.id"
        >
          <button
            type="button"
            class="bc-tap w-full flex items-start gap-4 text-left"
            :aria-expanded="open.has(watch.id)"
            :aria-controls="`watch-body-${watch.id}`"
            @click="toggleOpen(watch.id)"
          >
            <span
              class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-serif text-lg"
              :style="{
                backgroundColor:
                  current?.id === watch.id ? 'var(--bc-accent)' : 'var(--bc-hairline)',
                color: current?.id === watch.id ? '#fff' : 'inherit'
              }"
              aria-hidden="true"
              >{{ watch.number }}</span
            >
            <span class="flex-1 min-w-0">
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span class="font-medium">{{ watch.name }}</span>
                <span class="text-sm bc-muted">{{ watchWindowLabel(watch) }}</span>
                <span
                  v-if="current?.id === watch.id"
                  class="text-xs uppercase tracking-[0.16em] bc-accent"
                  >Now</span
                >
                <span v-if="selection[watch.id]" class="text-xs bc-muted"
                  >· Reminder {{ clockLabel(selection[watch.id]) }}</span
                >
              </span>
              <span class="block text-sm bc-muted mt-0.5">{{ watch.focus }}</span>
            </span>
            <svg
              class="w-5 h-5 shrink-0 mt-1 transition-transform bc-muted"
              :class="open.has(watch.id) ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <div v-if="open.has(watch.id)" :id="`watch-body-${watch.id}`" class="mt-5 space-y-4">
            <blockquote class="font-serif text-lg leading-relaxed">
              “{{ watch.verse.text }}”
              <cite class="block not-italic text-sm bc-muted mt-1"
                >— {{ watch.verse.ref }} (KJV)</cite
              >
            </blockquote>

            <div>
              <h3 class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5">Pray</h3>
              <p class="leading-relaxed">{{ watch.prompt }}</p>
            </div>

            <p class="text-sm bc-muted">
              <span class="font-medium">Read also:</span> {{ watch.references.join(' · ') }}
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
                :style="{
                  borderColor: isPrayed(watch) ? 'var(--bc-accent)' : 'var(--bc-hairline)',
                  color: isPrayed(watch) ? 'var(--bc-accent)' : 'inherit'
                }"
                :aria-pressed="isPrayed(watch)"
                title="Keep this prayer in the prayer journal"
                @click="pray(watch)"
              >
                {{ isPrayed(watch) ? 'In your prayers' : 'Pray this' }}
              </button>
            </div>

            <div class="pt-4 border-t" :style="{ borderColor: 'var(--bc-hairline)' }">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm">Remind me</span>
                <button
                  type="button"
                  class="bc-tap relative w-12 h-7 rounded-full transition shrink-0"
                  role="switch"
                  :aria-checked="Boolean(selection[watch.id])"
                  :aria-label="`Remind me of the ${watch.name.toLowerCase()}`"
                  :style="{
                    backgroundColor: selection[watch.id] ? 'var(--bc-accent)' : 'var(--bc-hairline)'
                  }"
                  @click="toggleReminder(watch)"
                >
                  <span
                    class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                    :style="{ left: selection[watch.id] ? '1.625rem' : '0.25rem' }"
                  />
                </button>
              </div>
              <label
                v-if="selection[watch.id]"
                class="flex items-center justify-between gap-4 mt-3"
              >
                <span class="text-sm">At</span>
                <input
                  type="time"
                  :value="selection[watch.id]"
                  :min="defaultWatchTime(watch)"
                  :max="inputMax(watch)"
                  class="bc-field bc-tap px-4 py-2"
                  :aria-label="`Reminder time for the ${watch.name.toLowerCase()}`"
                  @change="changeTime(watch, $event)"
                />
              </label>
              <p v-if="timeError[watch.id]" class="text-sm mt-2 bc-accent" role="alert">
                {{ timeError[watch.id] }}
              </p>
            </div>
          </div>
        </article>
      </li>
    </ol>

    <p v-if="permissionNote" class="text-sm bc-accent leading-relaxed mt-6" role="alert">
      {{ permissionNote }}
    </p>

    <!-- The reliable path: the phone's own calendar rings even when the app
         is asleep. -->
    <section v-if="selectedCount" class="bc-card p-5 mt-6" data-testid="watch-calendar">
      <h2 class="font-medium mb-1">Add to your phone’s calendar</h2>
      <p class="text-sm bc-muted leading-relaxed mb-4">
        The app can only remind you while it is open or was recently used — overnight your phone
        will usually put it to sleep. Your phone’s calendar will ring even when the app is closed,
        so for the night watches especially, add them there too. If you change your watches later,
        add them again.
      </p>
      <button
        type="button"
        class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition"
        :style="{ backgroundColor: 'var(--bc-accent)' }"
        @click="addToCalendar"
      >
        Download calendar file ({{ selectedCount }} {{ selectedCount === 1 ? 'watch' : 'watches' }})
      </button>
      <p class="text-xs bc-muted mt-2 leading-relaxed">
        Opens in Apple Calendar, Samsung Calendar and Outlook.
      </p>

      <div class="mt-5 pt-4 border-t" :style="{ borderColor: 'var(--bc-hairline)' }">
        <button
          type="button"
          class="bc-tap text-sm bc-accent"
          :aria-expanded="showGoogleLinks"
          @click="showGoogleLinks = !showGoogleLinks"
        >
          Using Google Calendar? Add each watch {{ showGoogleLinks ? '▴' : '▾' }}
        </button>
        <ul v-if="showGoogleLinks" class="mt-3 space-y-2">
          <li v-for="link in googleLinks" :key="link.watch.id">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener"
              class="bc-tap flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm border hover:opacity-70"
              :style="{ borderColor: 'var(--bc-hairline)' }"
            >
              <span>{{ link.watch.name }} · {{ watchWindowLabel(link.watch) }}</span>
              <span class="bc-accent">Add →</span>
            </a>
          </li>
        </ul>
        <p v-if="showGoogleLinks" class="text-xs bc-muted mt-2 leading-relaxed">
          Each opens Google Calendar with the watch filled in, repeating daily. Check the
          notification is set before you save it.
        </p>
      </div>
    </section>

    <p v-if="selectedCount" class="text-xs bc-muted leading-relaxed mt-4">
      On iPhone, reminders from the app need it added to your Home Screen. A reminder missed while
      the app was asleep is shown if you open the app before that watch ends, and skipped after.
    </p>
  </div>
</template>
