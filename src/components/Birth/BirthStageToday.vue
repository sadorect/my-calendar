<script setup>
import { computed, ref, watch } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import StageDeclarationCard from './StageDeclarationCard.vue'
import BirthStagePlaceholder from './BirthStagePlaceholder.vue'

const store = usePregnancyStore()

const name = computed(() => store.babyName?.trim() || 'them')
const position = computed(() => store.activeStagePosition)
const dateKey = computed(() => store.dayKey(store.activeStageDate))

const dateLabel = computed(() =>
  store.activeStageDate.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
)

const RING = 2 * Math.PI * 54
const ringOffset = computed(() => RING * (1 - store.stageProgress))

// The journal is a draft until it is saved, so a half-typed thought is never
// written over the top of what is already there.
const draft = ref('')
const savedNote = ref('')
watch(
  dateKey,
  (key) => {
    draft.value = store.journalFor(key)
  },
  { immediate: true }
)

/**
 * A named handler, not an inline expression: Prettier reflows a multi-statement
 * inline Vue handler onto separate lines without semicolons, which Vue then
 * refuses to compile — a formatting pass must not be able to break the build.
 */
function focusJournal() {
  document.getElementById('bc-stage-journal')?.focus()
}

async function saveNote() {
  await store.saveJournal(dateKey.value, draft.value)
  savedNote.value = 'Saved'
  setTimeout(() => (savedNote.value = ''), 1800)
}
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <section class="text-center mb-8 animate-gentle-rise">
      <p class="text-xs uppercase tracking-[0.2em] bc-muted mb-2">
        {{ store.activeStage?.label }} · {{ dateLabel }}
      </p>
      <h1 class="text-2xl sm:text-3xl font-serif mb-1">{{ store.activeTheme?.title }}</h1>
      <p v-if="store.activeStageMonth" class="text-sm bc-muted max-w-md mx-auto mt-3">
        {{ store.activeStageMonth.intro }}
      </p>
    </section>

    <div v-if="store.activeStageDayContent" class="flex justify-center mb-8">
      <div class="relative w-32 h-32">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bc-hairline)" stroke-width="6" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="var(--bc-accent)"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="RING"
            :stroke-dashoffset="ringOffset"
            class="transition-all duration-700"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-3xl font-serif">{{ position.day }}</span>
          <span class="text-[0.65rem] uppercase tracking-widest bc-muted">Day</span>
        </div>
      </div>
    </div>

    <BirthStagePlaceholder v-if="!store.activeStageDayContent" />

    <template v-else>
      <StageDeclarationCard
        :date-key="dateKey"
        :day-of-month="position.day"
        :content="store.activeStageDayContent"
        prominent
        @open="focusJournal"
      />

      <p v-if="store.stageSpokenStreak > 1" class="text-xs bc-accent text-center mt-3">
        {{ store.stageSpokenStreak }} days spoken in a row
      </p>

      <button
        v-if="!store.isViewingStageToday"
        class="bc-tap block mx-auto mt-4 px-4 py-2 rounded-xl text-sm border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        @click="store.goToStageToday()"
      >
        Back to today
      </button>

      <section v-if="store.activeStageWeekContent" class="mt-8">
        <h2 class="text-xs uppercase tracking-[0.16em] bc-muted mb-3">This week</h2>
        <article class="bc-card p-5">
          <h3 class="font-serif text-lg mb-2">{{ store.activeStageWeekContent.title }}</h3>
          <p class="bc-scripture text-sm mb-4">
            {{ store.activeStageWeekContent.declaration }}
          </p>
          <p class="text-sm bc-muted italic">
            {{ store.activeStageWeekContent.parentsPrayer }}
          </p>
        </article>
      </section>

      <section class="mt-8">
        <h2 class="text-xs uppercase tracking-[0.16em] bc-muted mb-3">
          Your journal for {{ name }}
        </h2>
        <div class="bc-card p-5">
          <label class="sr-only" for="bc-stage-journal">Journal note for {{ dateLabel }}</label>
          <textarea
            id="bc-stage-journal"
            v-model="draft"
            rows="3"
            placeholder="What did you notice about them today?"
            class="bc-field bc-tap w-full px-4 py-3"
          />
          <div class="flex items-center gap-3 mt-3">
            <button
              class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition"
              :style="{ backgroundColor: 'var(--bc-accent)' }"
              @click="saveNote"
            >
              Save note
            </button>
            <span v-if="savedNote" class="text-sm bc-accent">{{ savedNote }}</span>
            <span class="text-xs bc-muted ml-auto">Private to this device unless you sync.</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
