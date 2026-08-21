<script setup>
import { usePregnancyStore } from '../../stores/pregnancy.js'
const store = usePregnancyStore()
const emit = defineEmits(['open-day'])
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto">
    <h1 class="font-serif text-2xl mb-1">Saved</h1>
    <p class="text-sm bc-muted mb-6">The words you wanted to come back to.</p>

    <p v-if="!store.favourites.length" class="bc-card p-8 text-center bc-muted text-sm">
      Nothing saved yet. Tap the heart on any declaration to keep it here.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="fav in store.favourites" :key="fav.key">
        <button
          class="bc-card w-full text-left p-5 transition hover:opacity-90"
          @click="fav.kind === 'day' ? emit('open-day', fav.id) : null"
        >
          <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5">
            {{ fav.kind === 'day' ? `Day ${fav.id}` : `Week ${fav.id}` }}
          </p>
          <p class="font-serif text-lg mb-2">{{ fav.entry.title }}</p>
          <p class="bc-scripture text-sm bc-muted line-clamp-3">
            {{ fav.entry.declaration }}
          </p>
        </button>
      </li>
    </ul>

    <section v-if="store.journalEntries.length" class="mt-10">
      <h2 class="font-serif text-xl mb-1">Journal</h2>
      <p class="text-sm bc-muted mb-4">{{ store.journalEntries.length }} entries.</p>
      <ul class="space-y-3">
        <li v-for="note in store.journalEntries" :key="note.day">
          <button
            class="bc-card w-full text-left p-5 transition hover:opacity-90"
            @click="emit('open-day', note.day)"
          >
            <p class="text-xs uppercase tracking-[0.16em] bc-muted mb-1.5">Day {{ note.day }}</p>
            <p class="bc-scripture text-sm line-clamp-3">{{ note.text }}</p>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
