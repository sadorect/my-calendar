<script setup>
import { computed } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'

const store = usePregnancyStore()

const name = computed(() => store.babyName?.trim() || 'them')
const stage = computed(() => store.activeStage)
</script>

<template>
  <div class="px-5 py-10 max-w-2xl mx-auto text-center">
    <p class="text-xs uppercase tracking-[0.2em] bc-muted mb-3">
      {{ stage?.label || 'Life stage' }}
    </p>
    <h1 class="text-2xl font-serif mb-3">Declarations for {{ name }} are being written</h1>
    <p class="text-sm bc-muted max-w-md mx-auto">
      Twelve monthly themes — identity, wisdom, courage, purpose and the rest — are on their way for
      this stage. Everything you save for {{ name }} is kept for them alone, and will be waiting
      here when the words arrive.
    </p>
    <p v-if="store.activeAgeMonths !== null" class="text-xs bc-muted mt-6">
      {{ Math.floor(store.activeAgeMonths / 12) }} years {{ store.activeAgeMonths % 12 }} months old
    </p>
  </div>
</template>
