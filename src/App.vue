<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useEventStore } from './stores/events'
import IconTemplates from './components/Events/IconTemplates.vue'
import QuickAddModal from './components/Events/QuickAddModal.vue'
import SearchFilter from './components/SearchFilter.vue'
import ThemeToggle from './components/ThemeToggle.vue'

// Lazy load calendar components for better performance
const MonthView = defineAsyncComponent(() => import('./components/Calendar/MonthView.vue'))
const WeekView = defineAsyncComponent(() => import('./components/Calendar/WeekView.vue'))
const DayView = defineAsyncComponent(() => import('./components/Calendar/DayView.vue'))
const ListView = defineAsyncComponent(() => import('./components/Calendar/ListView.vue'))
const TodayDashboard = defineAsyncComponent(
  () => import('./components/Calendar/TodayDashboard.vue')
)
const AnalyticsDashboard = defineAsyncComponent(
  () => import(/* webpackChunkName: "analytics" */ './components/AnalyticsDashboard.vue')
)
const ExportImport = defineAsyncComponent(
  () => import(/* webpackChunkName: "export" */ './components/ExportImport.vue')
)

const eventStore = useEventStore()
const currentView = ref('today')
const showQuickAdd = ref(false)
const selectedTemplate = ref(null)
const showMobileMenu = ref(false)

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

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value
}

function selectView(view) {
  currentView.value = view
  showMobileMenu.value = false
}

function navButtonClasses(view) {
  return currentView.value === view ? 'bg-white/20' : ''
}

function mobileNavClasses(view) {
  return currentView.value === view
    ? 'text-theme-accent bg-theme-accent/10'
    : 'text-theme-secondary'
}

function handleKeyNavigation(event, view) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    currentView.value = view
  }
}
</script>

<template>
  <div class="app min-h-screen flex flex-col bg-theme-primary">
    <!-- Desktop Header -->
    <header
      class="hidden md:flex justify-between items-center p-4 bg-blue-600 text-white shadow-lg"
    >
      <h1 class="text-xl font-bold">Personal Calendar</h1>
      <div class="flex items-center gap-4">
        <ThemeToggle />
        <nav class="flex gap-2">
          <button
            @click="currentView = 'today'"
            @keydown="handleKeyNavigation($event, 'today')"
            :class="navButtonClasses('today')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Today
          </button>
          <button
            @click="currentView = 'month'"
            @keydown="handleKeyNavigation($event, 'month')"
            :class="navButtonClasses('month')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Month
          </button>
          <button
            @click="currentView = 'week'"
            @keydown="handleKeyNavigation($event, 'week')"
            :class="navButtonClasses('week')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Week
          </button>
          <button
            @click="currentView = 'day'"
            @keydown="handleKeyNavigation($event, 'day')"
            :class="navButtonClasses('day')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Day
          </button>
          <button
            @click="currentView = 'list'"
            @keydown="handleKeyNavigation($event, 'list')"
            :class="navButtonClasses('list')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            List
          </button>
          <button
            @click="currentView = 'analytics'"
            @keydown="handleKeyNavigation($event, 'analytics')"
            :class="navButtonClasses('analytics')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Analytics
          </button>
          <button
            @click="currentView = 'export'"
            @keydown="handleKeyNavigation($event, 'export')"
            :class="navButtonClasses('export')"
            class="px-3 py-2 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            tabindex="0"
          >
            Export/Import
          </button>
        </nav>
      </div>
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
      <AnalyticsDashboard v-else-if="currentView === 'analytics'" />
      <ExportImport v-else-if="currentView === 'export'" />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 bg-theme-nav border-t border-theme flex justify-around items-center py-2 px-4 shadow-theme"
    >
      <button
        @click="currentView = 'today'"
        :class="mobileNavClasses('today')"
        class="flex flex-col items-center p-3 rounded-lg transition-colors"
      >
        <span class="text-lg">📅</span>
        <span class="text-xs mt-1">Today</span>
      </button>
      <button
        @click="currentView = 'month'"
        :class="mobileNavClasses('month')"
        class="flex flex-col items-center p-3 rounded-lg transition-colors"
      >
        <span class="text-lg">📆</span>
        <span class="text-xs mt-1">Calendar</span>
      </button>
      <button
        @click="currentView = 'list'"
        :class="mobileNavClasses('list')"
        class="flex flex-col items-center p-3 rounded-lg transition-colors"
      >
        <span class="text-lg">📋</span>
        <span class="text-xs mt-1">List</span>
      </button>
      <button
        @click="toggleMobileMenu"
        class="flex flex-col items-center p-3 rounded-lg transition-colors text-theme-secondary"
      >
        <span class="text-lg">☰</span>
        <span class="text-xs mt-1">More</span>
      </button>
    </nav>

    <!-- Floating Action Button -->
    <button
      @click="addEvent"
      class="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl z-10 md:bottom-6 md:right-6"
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
        class="bg-theme-modal rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto shadow-theme"
        @click.stop
      >
        <IconTemplates @select-template="selectTemplate" />
      </div>
    </div>

    <!-- Quick Add Modal -->
    <QuickAddModal
      :show="!!(selectedTemplate && selectedTemplate.name && selectedTemplate.category)"
      :template="selectedTemplate"
      @close="closeModal"
    />

    <!-- Mobile Menu Overlay -->
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-4 z-30 md:hidden"
      @click="showMobileMenu = false"
    >
      <div
        class="bg-theme-modal rounded-t-2xl w-full max-w-sm max-h-[60vh] overflow-auto shadow-theme"
        @click.stop
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-theme-primary">More Options</h3>
            <button
              @click="showMobileMenu = false"
              class="text-theme-secondary hover:text-theme-primary"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-lg bg-theme-secondary">
              <span class="font-medium text-theme-primary">Theme</span>
              <ThemeToggle />
            </div>

            <button
              @click="selectView('week')"
              class="w-full flex items-center p-3 text-left rounded-lg hover:bg-theme-secondary transition-colors"
            >
              <span class="text-lg mr-3">📊</span>
              <div>
                <div class="font-medium text-theme-primary">Week View</div>
                <div class="text-sm text-theme-secondary">Weekly calendar layout</div>
              </div>
            </button>

            <button
              @click="selectView('day')"
              class="w-full flex items-center p-3 text-left rounded-lg hover:bg-theme-secondary transition-colors"
            >
              <span class="text-lg mr-3">🗓️</span>
              <div>
                <div class="font-medium text-theme-primary">Day View</div>
                <div class="text-sm text-theme-secondary">Daily schedule view</div>
              </div>
            </button>

            <button
              @click="selectView('analytics')"
              class="w-full flex items-center p-3 text-left rounded-lg hover:bg-theme-secondary transition-colors"
            >
              <span class="text-lg mr-3">📈</span>
              <div>
                <div class="font-medium text-theme-primary">Analytics</div>
                <div class="text-sm text-theme-secondary">Productivity insights</div>
              </div>
            </button>

            <button
              @click="selectView('export')"
              class="w-full flex items-center p-3 text-left rounded-lg hover:bg-theme-secondary transition-colors"
            >
              <span class="text-lg mr-3">💾</span>
              <div>
                <div class="font-medium text-theme-primary">Export & Import</div>
                <div class="text-sm text-theme-secondary">Backup and data transfer</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Custom styles for FullCalendar and other components */
</style>
