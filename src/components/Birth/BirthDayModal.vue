<script setup>
import { computed, ref, watch } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { dayContent } from '../../data/pregnancy/index.js'
import { gestationalAge } from '../../services/pregnancyTimeline.js'
import DeclarationCard from './DeclarationCard.vue'

const props = defineProps({ day: { type: Number, default: null } })
const emit = defineEmits(['close'])

const store = usePregnancyStore()
const journal = ref('')
const savedNote = ref(false)

const entry = computed(() => {
  if (!props.day) return null
  const raw = dayContent(props.day)
  if (!raw) return null
  return {
    ...raw,
    body: store.state.settings.voice === 'partner' && raw.partner ? raw.partner : raw.declaration
  }
})

const age = computed(() => (props.day ? gestationalAge(props.day) : null))
const date = computed(() =>
  props.day && store.isConfigured ? store.dueDate && new Date(store.activeDate) : null
)

// Reload the note whenever the modal opens on a different day, so an unsaved
// draft never leaks from one day onto another.
watch(
  () => props.day,
  (day) => {
    journal.value = day ? store.journalFor(day) : ''
    savedNote.value = false
  },
  { immediate: true }
)

async function saveJournal() {
  await store.saveJournal(props.day, journal.value)
  savedNote.value = true
  setTimeout(() => (savedNote.value = false), 1800)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="day"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="`Day ${day}`"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

        <div
          class="birth-scope relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-gentle-rise"
          :class="{ 'bc-contrast': store.state.settings.highContrast }"
          :style="{
            '--bc-from': store.palette.from,
            '--bc-to': store.palette.to,
            '--bc-accent': store.palette.accent
          }"
        >
          <header
            class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 backdrop-blur-md"
            :style="{ backgroundColor: 'var(--bc-surface)' }"
          >
            <div>
              <p class="text-xs uppercase tracking-[0.16em] bc-muted">
                Day {{ day }} · {{ age?.weeks }}w {{ age?.days }}d
              </p>
              <p v-if="date" class="text-sm">
                {{
                  date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })
                }}
              </p>
            </div>
            <button
              class="bc-tap rounded-full flex items-center justify-center hover:opacity-70 transition"
              aria-label="Close"
              @click="emit('close')"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="px-5 pb-8 pt-2 space-y-5">
            <DeclarationCard v-if="entry" :day="day" :content="entry" />

            <div v-else class="bc-card p-6 text-center">
              <p class="font-serif text-lg mb-1">Still being written</p>
              <p class="bc-muted text-sm">This day's declaration is not ready yet.</p>
            </div>

            <section class="bc-card p-5">
              <label
                :for="`bc-journal-${day}`"
                class="block text-xs uppercase tracking-[0.16em] bc-muted mb-3"
              >
                Your notes for this day
              </label>
              <textarea
                :id="`bc-journal-${day}`"
                v-model="journal"
                rows="5"
                placeholder="A prayer, a hope, something you noticed today…"
                class="w-full px-4 py-3 rounded-xl border bg-transparent resize-none bc-scripture text-sm"
                :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
              />
              <div class="flex items-center justify-between mt-3">
                <p class="text-xs bc-muted">Private, and stored only on this device.</p>
                <button
                  class="bc-tap px-4 py-2 rounded-xl text-sm text-white transition"
                  :style="{ backgroundColor: 'var(--bc-accent)' }"
                  @click="saveJournal"
                >
                  {{ savedNote ? 'Saved' : 'Save' }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
