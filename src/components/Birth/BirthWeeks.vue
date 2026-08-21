<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()
const cards = computed(() => store.monthWeekCards)
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <header class="text-center mb-6">
      <p class="text-xs uppercase tracking-[0.2em] bc-muted">
        Month {{ store.activeMonth?.month }}
      </p>
      <h1 class="font-serif text-2xl">{{ store.activeMonth?.title }}</h1>
      <p class="text-sm bc-muted mt-1">Weekly declarations</p>
    </header>

    <div class="space-y-4">
      <article
        v-for="card in cards"
        :key="card.week"
        class="bc-card p-6 animate-gentle-rise"
        :style="
          card.week === store.activeWeek
            ? { borderColor: 'var(--bc-accent)', borderWidth: '2px' }
            : {}
        "
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1">
              Week {{ card.week }}
              <span v-if="card.week === store.activeWeek" class="bc-accent">· this week</span>
            </p>
            <h2 v-if="!card.placeholder" class="font-serif text-xl">{{ card.title }}</h2>
          </div>
          <button
            v-if="!card.placeholder"
            class="bc-tap shrink-0 flex items-center justify-center rounded-full transition hover:scale-110"
            :aria-label="
              store.isFavourite('week', card.week) ? 'Remove from favourites' : 'Save to favourites'
            "
            :aria-pressed="store.isFavourite('week', card.week)"
            @click="store.toggleFavourite('week', card.week)"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              :fill="store.isFavourite('week', card.week) ? 'var(--bc-accent)' : 'none'"
              :stroke="store.isFavourite('week', card.week) ? 'var(--bc-accent)' : 'currentColor'"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 21s-6.5-4.35-8.5-8A4.5 4.5 0 0112 7.5 4.5 4.5 0 0120.5 13c-2 3.65-8.5 8-8.5 8z"
              />
            </svg>
          </button>
        </div>

        <p v-if="card.placeholder" class="bc-muted italic text-sm">
          This week's declaration is still being written.
        </p>

        <template v-else>
          <p class="bc-scripture mb-5">{{ card.declaration }}</p>
          <div class="pt-4 border-t" :style="{ borderColor: 'var(--bc-hairline)' }">
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-2">A prayer for you</p>
            <p class="bc-scripture text-sm italic">{{ card.parentsPrayer }}</p>
          </div>
        </template>
      </article>
    </div>
  </div>
</template>
