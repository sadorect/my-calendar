<template>
  <div class="bg-white border-b border-gray-200 px-4 py-3">
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Search Input -->
      <div class="flex-1">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              class="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search events..."
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Filter Dropdowns -->
      <div class="flex gap-2">
        <!-- Category Filter -->
        <select
          v-model="selectedCategory"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>

        <!-- Date Range Filter -->
        <select
          v-model="dateFilter"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <!-- Clear Filters Button -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mt-2 flex flex-wrap gap-2">
      <span class="text-sm text-gray-600">Active filters:</span>
      <span
        v-if="searchQuery"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
      >
        Search: "{{ searchQuery }}"
        <button @click="searchQuery = ''" class="ml-1 hover:bg-blue-200 rounded-full p-0.5">
          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </span>
      <span
        v-if="selectedCategory"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
      >
        Category: {{ selectedCategory }}
        <button @click="selectedCategory = ''" class="ml-1 hover:bg-green-200 rounded-full p-0.5">
          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </span>
      <span
        v-if="dateFilter !== 'all'"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
      >
        Date: {{ dateFilter }}
        <button @click="dateFilter = 'all'" class="ml-1 hover:bg-purple-200 rounded-full p-0.5">
          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useEventStore } from '@/stores/events'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const eventStore = useEventStore()

// Reactive state
const searchQuery = ref('')
const selectedCategory = ref('')
const dateFilter = ref('all')

// Computed properties
const categories = computed(() => {
  const uniqueCategories = [...new Set(eventStore.events.map((event) => event.category))]
  return uniqueCategories.sort()
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedCategory.value || dateFilter.value !== 'all'
})

// Watch for filter changes and emit events
watch(
  [searchQuery, selectedCategory, dateFilter],
  () => {
    updateFilters()
  },
  { immediate: true }
)

function updateFilters() {
  eventStore.setSearchQuery(searchQuery.value)
  eventStore.setCategoryFilter(selectedCategory.value)
  eventStore.setDateRangeFilter(getDateRange())
}

function getDateRange() {
  const now = new Date()

  switch (dateFilter.value) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      }
    case 'week':
      return {
        start: startOfWeek(now),
        end: endOfWeek(now)
      }
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      }
    default:
      return null
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  dateFilter.value = 'all'
  eventStore.clearFilters()
}

// Expose filters for parent components
defineExpose({
  searchQuery: computed(() => searchQuery.value),
  selectedCategory: computed(() => selectedCategory.value),
  dateFilter: computed(() => dateFilter.value),
  getDateRange
})
</script>

<style scoped>
/* Additional styles if needed */
</style>
