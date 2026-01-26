<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
      <p class="text-gray-600 mt-2">Insights into your productivity and time management</p>
    </div>

    <!-- Date Range Selector -->
    <div class="bg-white p-4 rounded-lg shadow-sm border">
      <div class="flex flex-col sm:flex-row gap-4 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            v-model="selectedPeriod"
            @change="updateDateRange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div v-if="selectedPeriod === 'custom'" class="flex gap-2">
          <input
            v-model="startDate"
            type="date"
            @change="updateCustomRange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-500 self-center">to</span>
          <input
            v-model="endDate"
            type="date"
            @change="updateCustomRange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <svg
              class="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Events</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalEvents }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <svg
              class="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Completed</p>
            <p class="text-2xl font-bold text-gray-900">{{ completedEvents }}</p>
            <p class="text-xs text-gray-500">{{ completionRate }}% rate</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <svg
              class="h-6 w-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Hours</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalHours }}</p>
            <p class="text-xs text-gray-500">Avg {{ avgHoursPerDay }}h/day</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <div class="flex items-center">
          <div class="p-2 bg-orange-100 rounded-lg">
            <svg
              class="h-6 w-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Recurring</p>
            <p class="text-2xl font-bold text-gray-900">{{ recurringEvents }}</p>
            <p class="text-xs text-gray-500">{{ recurringPercentage }}% of total</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Events by Category -->
      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Events by Category</h3>
        <div class="space-y-3">
          <div
            v-for="category in categoryStats"
            :key="category.name"
            class="flex items-center justify-between"
          >
            <div class="flex items-center">
              <div class="w-4 h-4 rounded mr-3" :style="{ backgroundColor: category.color }"></div>
              <span class="text-sm font-medium text-gray-700">{{ category.name }}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-bold text-gray-900">{{ category.count }}</span>
              <span class="text-xs text-gray-500 ml-1">({{ category.percentage }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Distribution -->
      <div class="bg-white p-6 rounded-lg shadow-sm border">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Time Distribution</h3>
        <div class="space-y-3">
          <div
            v-for="category in timeStats"
            :key="category.name"
            class="flex items-center justify-between"
          >
            <div class="flex items-center">
              <div class="w-4 h-4 rounded mr-3" :style="{ backgroundColor: category.color }"></div>
              <span class="text-sm font-medium text-gray-700">{{ category.name }}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-bold text-gray-900">{{ category.hours }}h</span>
              <span class="text-xs text-gray-500 ml-1">({{ category.percentage }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Weekly Activity -->
    <div class="bg-white p-6 rounded-lg shadow-sm border">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Weekly Activity</h3>
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="day in weeklyActivity"
          :key="day.day"
          class="text-center p-3 rounded-lg border"
          :class="day.count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'"
        >
          <div class="text-xs font-medium text-gray-600">{{ day.day }}</div>
          <div class="text-lg font-bold" :class="day.count > 0 ? 'text-blue-600' : 'text-gray-400'">
            {{ day.count }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEventStore } from '@/stores/events'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  isWithinInterval,
  parseISO
} from 'date-fns'

const eventStore = useEventStore()

// Date range state
const selectedPeriod = ref('month')
const startDate = ref('')
const endDate = ref('')

// Computed date range
const dateRange = computed(() => {
  const now = new Date()

  switch (selectedPeriod.value) {
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'custom':
      return {
        start: startDate.value ? parseISO(startDate.value) : startOfMonth(now),
        end: endDate.value ? parseISO(endDate.value) : endOfMonth(now)
      }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
})

// Filtered events for the selected date range
const filteredEvents = computed(() => {
  const cacheKey = `${selectedPeriod.value}-${startDate.value}-${endDate.value}`
  if (filteredEventsCache.value.key !== cacheKey) {
    filteredEventsCache.value.key = cacheKey
    filteredEventsCache.value = eventStore.events.filter((event) => {
      const eventDate = parseISO(event.startDateTime)
      return isWithinInterval(eventDate, dateRange.value)
    })
  }
  return filteredEventsCache.value
})

// Cache for filtered events to avoid recomputation
const filteredEventsCache = ref({ key: '', value: [] })

// Analytics computations
const totalEvents = computed(() => filteredEvents.value.length)

const completedEvents = computed(() => {
  return filteredEvents.value.filter((event) => event.isCompleted).length
})

const completionRate = computed(() => {
  if (totalEvents.value === 0) return 0
  return Math.round((completedEvents.value / totalEvents.value) * 100)
})

const totalHours = computed(() => {
  const hours = filteredEvents.value.reduce((sum, event) => {
    const start = new Date(event.startDateTime)
    const end = new Date(event.endDateTime)
    return sum + (end - start) / (1000 * 60 * 60)
  }, 0)
  return Math.round(hours * 10) / 10
})

const avgHoursPerDay = computed(() => {
  const days = Math.ceil((dateRange.value.end - dateRange.value.start) / (1000 * 60 * 60 * 24))
  if (days === 0) return 0
  return Math.round((totalHours.value / days) * 10) / 10
})

const recurringEvents = computed(() => {
  return filteredEvents.value.filter((event) => event.isRecurring).length
})

const recurringPercentage = computed(() => {
  if (totalEvents.value === 0) return 0
  return Math.round((recurringEvents.value / totalEvents.value) * 100)
})

// Category statistics
const categoryStats = computed(() => {
  const categories = {}
  const templates = eventStore.templates || []

  filteredEvents.value.forEach((event) => {
    if (!categories[event.category]) {
      const template = templates.find((t) => t.category === event.category)
      categories[event.category] = {
        name: event.category,
        count: 0,
        color: template?.color || '#6B7280'
      }
    }
    categories[event.category].count++
  })

  const total = totalEvents.value
  return Object.values(categories)
    .map((cat) => ({
      ...cat,
      percentage: total > 0 ? Math.round((cat.count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// Time distribution by category
const timeStats = computed(() => {
  const categories = {}
  const templates = eventStore.templates || []

  filteredEvents.value.forEach((event) => {
    if (!categories[event.category]) {
      const template = templates.find((t) => t.category === event.category)
      categories[event.category] = {
        name: event.category,
        hours: 0,
        color: template?.color || '#6B7280'
      }
    }

    const start = new Date(event.startDateTime)
    const end = new Date(event.endDateTime)
    const hours = (end - start) / (1000 * 60 * 60)
    categories[event.category].hours += hours
  })

  const total = totalHours.value
  return Object.values(categories)
    .map((cat) => ({
      ...cat,
      hours: Math.round(cat.hours * 10) / 10,
      percentage: total > 0 ? Math.round((cat.hours / total) * 100) : 0
    }))
    .sort((a, b) => b.hours - a.hours)
})

// Weekly activity
const weeklyActivity = computed(() => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const activity = days.map((day) => ({ day, count: 0 }))

  filteredEvents.value.forEach((event) => {
    const eventDate = new Date(event.startDateTime)
    const dayIndex = eventDate.getDay()
    activity[dayIndex].count++
  })

  return activity
})

function updateDateRange() {
  // Date range will be recalculated automatically via computed property
}

function updateCustomRange() {
  // Custom range will be used when selectedPeriod is 'custom'
}

onMounted(() => {
  // Initialize with current month
  const now = new Date()
  startDate.value = format(startOfMonth(now), 'yyyy-MM-dd')
  endDate.value = format(endOfMonth(now), 'yyyy-MM-dd')
})
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
