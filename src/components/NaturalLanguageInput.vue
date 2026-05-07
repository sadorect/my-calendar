<template>
  <div class="relative">
    <form @submit.prevent="parse" class="flex gap-2 items-center">
      <div class="relative flex-1">
        <input
          v-model="input"
          type="text"
          :placeholder="placeholder"
          class="w-full pl-10 pr-4 py-2 border border-theme rounded-xl bg-theme-primary text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-accent placeholder-theme-muted"
          @keydown.escape="clear"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted text-base">✨</span>
      </div>
      <button
        type="submit"
        :disabled="!input.trim()"
        class="px-4 py-2 bg-theme-accent text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        Add
      </button>
    </form>

    <!-- Parse preview -->
    <div
      v-if="preview"
      class="mt-2 p-3 rounded-xl bg-theme-secondary border border-theme text-sm text-theme-primary space-y-1"
    >
      <p class="font-semibold">{{ preview.title }}</p>
      <p class="text-theme-muted text-xs">
        📅 {{ preview.dateLabel }}
        <span v-if="preview.timeLabel"> · ⏰ {{ preview.timeLabel }}</span>
        <span v-if="preview.duration"> · ⏱ {{ preview.duration }} min</span>
      </p>
      <p v-if="parseError" class="text-red-500 text-xs">{{ parseError }}</p>
    </div>

    <p v-if="parseError && !preview" class="mt-1 text-xs text-red-500">{{ parseError }}</p>

    <p class="mt-1 text-xs text-theme-muted">
      Try: "Dentist tomorrow at 3pm for 1 hour" · "Team meeting Friday 10am"
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as chrono from 'chrono-node'
import { format, addMinutes } from 'date-fns'

const emit = defineEmits(['parsed'])

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Describe an event in plain English…'
  }
})

const input = ref('')
const preview = ref(null)
const parseError = ref('')

const DURATION_RE = /\bfor\s+(\d+(?:\.\d+)?)\s*(hour|hr|h|minute|min|m)s?\b/i

function parseDuration(text) {
  const m = text.match(DURATION_RE)
  if (!m) return 60 // default 1 hour
  const value = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  if (unit.startsWith('h')) return Math.round(value * 60)
  return Math.round(value)
}

function stripDuration(text) {
  return text.replace(DURATION_RE, '').trim()
}

function parse() {
  parseError.value = ''
  preview.value = null

  const raw = input.value.trim()
  if (!raw) return

  const textWithoutDuration = stripDuration(raw)
  const results = chrono.parse(textWithoutDuration, new Date(), { forwardDate: true })

  if (!results.length) {
    parseError.value = 'Could not understand the date/time. Try "tomorrow at 3pm" or "Friday 10am".'
    return
  }

  const parsed = results[0]
  const startDate = parsed.start.date()
  const durationMin = parseDuration(raw)
  const endDate = addMinutes(startDate, durationMin)

  // Extract title: the text outside the date reference
  const beforeDate = textWithoutDuration.slice(0, parsed.index).trim()
  const afterDate = textWithoutDuration.slice(parsed.index + parsed.text.length).trim()
  const titleRaw = [beforeDate, afterDate].filter(Boolean).join(' ').trim()
  const title = titleRaw || 'New Event'

  const dateLabel = format(startDate, 'EEEE, MMM d, yyyy')
  const isAllDay = !parsed.start.isCertain('hour')
  const timeLabel = isAllDay ? null : format(startDate, 'h:mm a')

  preview.value = {
    title,
    dateLabel,
    timeLabel,
    duration: isAllDay ? null : durationMin,
    // Data for the modal
    date: format(startDate, 'yyyy-MM-dd'),
    startTime: isAllDay ? '09:00' : format(startDate, 'HH:mm'),
    endTime: format(endDate, 'HH:mm'),
    isAllDay,
    duration: durationMin
  }

  emit('parsed', {
    title,
    date: format(startDate, 'yyyy-MM-dd'),
    startTime: isAllDay ? '09:00' : format(startDate, 'HH:mm'),
    duration: durationMin,
    isAllDay
  })

  clear()
}

function clear() {
  input.value = ''
  preview.value = null
  parseError.value = ''
}
</script>
