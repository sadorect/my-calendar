<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()

const monthLabel = computed(() =>
  store.activeStageDate.toLocaleDateString(undefined, { month: 'long' })
)
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <header class="text-center mb-6">
      <p class="text-xs uppercase tracking-[0.2em] bc-muted mb-1">{{ monthLabel }}</p>
      <h1 class="text-2xl font-serif">{{ store.activeTheme?.title }}</h1>
    </header>

    <ul class="space-y-4">
      <li v-for="card in store.stageWeekCards" :key="card.week">
        <article class="bc-card p-5">
          <header class="flex items-start justify-between gap-3 mb-3">
            <div>
              <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1">
                Week {{ card.week }} · {{ card.start }}–{{ card.end }}
              </p>
              <h2 class="font-serif text-lg">
                {{ card.entry ? card.entry.title : 'Being written' }}
              </h2>
            </div>
            <button
              v-if="card.entry"
              class="bc-tap shrink-0 flex items-center justify-center rounded-full transition hover:scale-110"
              :aria-label="
                store.isStageFavourite('week', card.week)
                  ? 'Remove from favourites'
                  : 'Save to favourites'
              "
              :aria-pressed="store.isStageFavourite('week', card.week)"
              @click="store.toggleStageFavourite('week', card.week)"
            >
              <svg
                class="w-6 h-6"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                :fill="store.isStageFavourite('week', card.week) ? 'var(--bc-accent)' : 'none'"
                :stroke="
                  store.isStageFavourite('week', card.week) ? 'var(--bc-accent)' : 'currentColor'
                "
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 21s-6.5-4.35-8.5-8A4.5 4.5 0 0112 7.5 4.5 4.5 0 0120.5 13c-2 3.65-8.5 8-8.5 8z"
                />
              </svg>
            </button>
          </header>

          <template v-if="card.entry">
            <p class="bc-scripture text-sm mb-4">{{ card.entry.declaration }}</p>
            <p class="text-sm bc-muted italic">{{ card.entry.parentsPrayer }}</p>
          </template>
          <p v-else class="text-sm bc-muted">This week’s words are on their way.</p>
        </article>
      </li>
    </ul>
  </div>
</template>
