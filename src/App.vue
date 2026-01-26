<script setup>
import { ref, onMounted } from 'vue'
import { useEventStore } from './stores/events'
import MonthView from './components/Calendar/MonthView.vue'
import WeekView from './components/Calendar/WeekView.vue'
import DayView from './components/Calendar/DayView.vue'
import ListView from './components/Calendar/ListView.vue'
import TodayDashboard from './components/Calendar/TodayDashboard.vue'
import IconTemplates from './components/Events/IconTemplates.vue'
import QuickAddModal from './components/Events/QuickAddModal.vue'
import SearchFilter from './components/SearchFilter.vue'

const eventStore = useEventStore()
const currentView = ref('today')
const showQuickAdd = ref(false)
const selectedTemplate = ref(null)

onMounted(() => {
  eventStore.fetchEvents()
})

function addEvent() {
  showQuickAdd.value = true
}

function selectTemplate(template) {
  selectedTemplate.value = template
}

function closeModal() {
  showQuickAdd.value = false
  selectedTemplate.value = null
}

function navButtonClasses(view) {
  return currentView.value === view ? 'bg-white/20' : ''
}

function mobileNavClasses(view) {
  return currentView.value === view ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
}
</script>

<template>
  <div class="app min-h-screen flex flex-col bg-gray-50">
    <!-- Desktop Header -->
    <header
      class="hidden md:flex justify-between items-center p-4 bg-blue-600 text-white shadow-lg"
    >
      <h1 class="text-xl font-bold">Personal Calendar</h1>
      <nav class="flex gap-2">
        <button
          @click="currentView = 'today'"
          :class="navButtonClasses('today')"
          class="px-3 py-2 rounded hover:bg-white/20 transition-colors"
        >
          Today
        </button>
        <button
          @click="currentView = 'month'"
          :class="navButtonClasses('month')"
          class="px-3 py-2 rounded hover:bg-white/20 transition-colors"
        >
          Month
        </button>
        <button
          @click="currentView = 'week'"
          :class="navButtonClasses('week')"
          class="px-3 py-2 rounded hover:bg-white/20 transition-colors"
        >
          Week
        </button>
        <button
          @click="currentView = 'day'"
          :class="navButtonClasses('day')"
          class="px-3 py-2 rounded hover:bg-white/20 transition-colors"
        >
          Day
        </button>
        <button
          @click="currentView = 'list'"
          :class="navButtonClasses('list')"
          class="px-3 py-2 rounded hover:bg-white/20 transition-colors"
        >
          List
        </button>
      </nav>
    </header>

    <!-- Mobile Header -->
    <header class="md:hidden flex items-center justify-center p-3 bg-blue-600 text-white shadow-lg">
      <h1 class="text-lg font-bold">Calendar</h1>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-2 md:p-4 pb-20 md:pb-4">
      <!-- Search and Filter (shown for calendar views, not today dashboard) -->
      <SearchFilter v-if="currentView !== 'today'" />

      <TodayDashboard v-if="currentView === 'today'" />
      <MonthView v-else-if="currentView === 'month'" />
      <WeekView v-else-if="currentView === 'week'" />
      <DayView v-else-if="currentView === 'day'" />
      <ListView v-else-if="currentView === 'list'" />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-4 shadow-lg"
    >
      <button
        @click="currentView = 'today'"
        :class="mobileNavClasses('today')"
        class="flex flex-col items-center p-2 rounded-lg transition-colors"
      >
        <span class="text-lg">📅</span>
        <span class="text-xs mt-1">Today</span>
      </button>
      <button
        @click="currentView = 'month'"
        :class="mobileNavClasses('month')"
        class="flex flex-col items-center p-2 rounded-lg transition-colors"
      >
        <span class="text-lg">📆</span>
        <span class="text-xs mt-1">Month</span>
      </button>
      <button
        @click="currentView = 'week'"
        :class="mobileNavClasses('week')"
        class="flex flex-col items-center p-2 rounded-lg transition-colors"
      >
        <span class="text-lg">📊</span>
        <span class="text-xs mt-1">Week</span>
      </button>
      <button
        @click="currentView = 'day'"
        :class="mobileNavClasses('day')"
        class="flex flex-col items-center p-2 rounded-lg transition-colors"
      >
        <span class="text-lg">🗓️</span>
        <span class="text-xs mt-1">Day</span>
      </button>
      <button
        @click="currentView = 'list'"
        :class="mobileNavClasses('list')"
        class="flex flex-col items-center p-2 rounded-lg transition-colors"
      >
        <span class="text-lg">📋</span>
        <span class="text-xs mt-1">List</span>
      </button>
    </nav>

    <!-- Floating Action Button -->
    <button
      @click="addEvent"
      class="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl z-10"
    >
      +
    </button>

    <!-- Quick Add Overlay -->
    <div
      v-if="showQuickAdd"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20"
      @click="closeModal"
    >
      <div
        class="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        @click.stop
      >
        <IconTemplates @select-template="selectTemplate" />
      </div>
    </div>

    <!-- Quick Add Modal -->
    <QuickAddModal :show="!!selectedTemplate" :template="selectedTemplate" @close="closeModal" />
  </div>
</template>

<style>
/* Custom styles for FullCalendar and other components */
</style>
