<script setup>
import { computed, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { dueDateFromCurrentProgress, gestationalAge, dayOfPregnancy } from '../../services/pregnancyTimeline.js'

const store = usePregnancyStore()
const emit = defineEmits(['done', 'browse'])

// People know where they are in one of two ways, and forcing the wrong one is
// the fastest way to make someone abandon onboarding.
const mode = ref('due')
const dueInput = ref('')
const weeksInput = ref(12)
const daysInput = ref(0)
const babyName = ref(store.state.babyName || '')
const saving = ref(false)
const error = ref('')

const preview = computed(() => {
  try {
    const due =
      mode.value === 'due'
        ? dueInput.value && new Date(dueInput.value)
        : dueDateFromCurrentProgress(Number(weeksInput.value), Number(daysInput.value))
    if (!due || Number.isNaN(due.getTime())) return null
    const age = gestationalAge(dayOfPregnancy(due))
    return {
      due,
      label: `${age.weeks} weeks and ${age.days} ${age.days === 1 ? 'day' : 'days'}`,
    }
  } catch {
    return null
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (mode.value === 'due') {
      if (!dueInput.value) throw new Error('Please choose a due date.')
      await store.setDueDate(dueInput.value)
    } else {
      await store.setCurrentProgress(Number(weeksInput.value), Number(daysInput.value))
    }
    if (babyName.value.trim()) await store.setBabyName(babyName.value)
    emit('done')
  } catch (e) {
    error.value = e.message || 'That did not look like a valid date.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-full flex items-center justify-center px-5 py-12">
    <div class="w-full max-w-md animate-gentle-rise">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          aria-hidden="true"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 21s-6.5-4.35-8.5-8A4.5 4.5 0 0112 7.5 4.5 4.5 0 0120.5 13c-2 3.65-8.5 8-8.5 8z" />
          </svg>
        </div>
        <h1 class="font-serif text-3xl mb-3">Womb Whispers</h1>
        <p class="bc-muted leading-relaxed">
          A daily companion of Scripture, prayer and declaration for the little
          one you are carrying.
        </p>
      </div>

      <div class="bc-card p-6">
        <div class="flex gap-1 p-1 rounded-2xl mb-6" :style="{ backgroundColor: 'var(--bc-hairline)' }" role="tablist">
          <button
            v-for="option in [
              { id: 'due', label: 'I know my due date' },
              { id: 'weeks', label: 'I know my week' },
            ]"
            :key="option.id"
            role="tab"
            :aria-selected="mode === option.id"
            class="bc-tap flex-1 px-3 py-2 rounded-xl text-sm font-medium transition"
            :style="
              mode === option.id
                ? { backgroundColor: 'var(--bc-surface-solid)', color: 'var(--bc-accent)' }
                : { color: 'var(--bc-muted)' }
            "
            @click="mode = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="mode === 'due'">
          <label for="bc-due" class="block text-sm font-medium mb-2">Due date</label>
          <input
            id="bc-due"
            v-model="dueInput"
            type="date"
            class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
            :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          />
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div>
            <label for="bc-weeks" class="block text-sm font-medium mb-2">Weeks</label>
            <input
              id="bc-weeks" v-model.number="weeksInput" type="number" min="0" max="42"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
            />
          </div>
          <div>
            <label for="bc-days" class="block text-sm font-medium mb-2">Days</label>
            <input
              id="bc-days" v-model.number="daysInput" type="number" min="0" max="6"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
            />
          </div>
        </div>

        <div class="mt-5">
          <label for="bc-name" class="block text-sm font-medium mb-2">
            Baby's name <span class="bc-muted font-normal">— or a nickname, optional</span>
          </label>
          <input
            id="bc-name" v-model="babyName" type="text" maxlength="40" placeholder="Little one"
            class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
            :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          />
        </div>

        <p v-if="preview" class="mt-5 text-sm text-center bc-muted animate-soft-fade">
          That puts you at <strong :style="{ color: 'var(--bc-accent)' }">{{ preview.label }}</strong>,
          due {{ preview.due.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) }}.
        </p>

        <p v-if="error" class="mt-4 text-sm text-center text-red-600" role="alert">{{ error }}</p>

        <button
          class="bc-tap w-full mt-6 px-4 py-3 rounded-xl text-white font-medium transition disabled:opacity-50"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          :disabled="saving || !preview"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Begin' }}
        </button>

        <button
          class="bc-tap w-full mt-2 px-4 py-3 rounded-xl text-sm bc-muted hover:opacity-70 transition"
          @click="emit('browse')"
        >
          Skip — just let me browse
        </button>
      </div>

      <p class="text-xs text-center bc-muted mt-6 leading-relaxed">
        Everything stays on this device. Nothing is uploaded and no account is needed.
      </p>
    </div>
  </div>
</template>
