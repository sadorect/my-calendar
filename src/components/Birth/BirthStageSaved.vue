<script setup>
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()

function noteDate(entry) {
  return entry.date
    ? entry.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : entry.key
}
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <h1 class="font-serif text-2xl mb-1">Saved</h1>
    <p class="text-sm bc-muted mb-6">
      The words you wanted to come back to — they return every year with the theme.
    </p>

    <p v-if="!store.stageFavourites.length" class="bc-card p-8 text-center bc-muted text-sm">
      Nothing saved yet. Tap the heart on any declaration to keep it here.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="fav in store.stageFavourites" :key="fav.key">
        <article class="bc-card p-5">
          <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5">
            {{ fav.theme?.title }} ·
            {{ fav.kind === 'day' ? `Day ${fav.target}` : `Week ${fav.target}` }}
          </p>
          <p class="font-serif text-lg mb-2">{{ fav.entry.title }}</p>
          <p class="bc-scripture text-sm bc-muted line-clamp-3">{{ fav.entry.declaration }}</p>
        </article>
      </li>
    </ul>

    <section v-if="store.stageJournalEntries.length" class="mt-10">
      <h2 class="font-serif text-xl mb-1">Journal</h2>
      <p class="text-sm bc-muted mb-4">{{ store.stageJournalEntries.length }} entries.</p>
      <ul class="space-y-3">
        <li v-for="note in store.stageJournalEntries" :key="note.key">
          <article class="bc-card p-5">
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5">{{ noteDate(note) }}</p>
            <p class="bc-scripture text-sm line-clamp-3">{{ note.text }}</p>
          </article>
        </li>
      </ul>
    </section>
  </div>
</template>
