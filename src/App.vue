<script setup>
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useEventStore } from './stores/events'
import { useAlertStore } from './stores/alerts'
import { useHistory } from './composables/useHistory'
import { notificationService } from './services/notifications'
import IconTemplates from './components/Events/IconTemplates.vue'
import QuickAddModal from './components/Events/QuickAddModal.vue'
import SearchFilter from './components/SearchFilter.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import AlertNotification from './components/AlertNotification.vue'
import MiniCalendar from './components/MiniCalendar.vue'
import NaturalLanguageInput from './components/NaturalLanguageInput.vue'

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
const alertStore = useAlertStore()
const { canUndo, canRedo, undo, redo } = useHistory()
const currentView = ref('today')
const showQuickAdd = ref(false)
const selectedTemplate = ref(null)
const selectedDate = ref(null)
const nlPrefilledData = ref(null)
const showMobileMenu = ref(false)

onMounted(() => {
  eventStore.fetchEvents()

  // Initialize alert system
  notificationService.setAlertStore(alertStore)

  // Start periodic checking for upcoming events (every 60 seconds)
  notificationService.startPeriodicCheck(() => eventStore.events, 60000)

  // Keyboard shortcuts for undo/redo
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  // Clean up periodic checking
  notificationService.stopPeriodicCheck()
  window.removeEventListener('keydown', handleGlobalKeydown)
})

function handleGlobalKeydown(e) {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const ctrl = isMac ? e.metaKey : e.ctrlKey
  if (!ctrl) return
  if (e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
    e.preventDefault()
    redo()
  }
}

function handleMiniCalendarDate(dateStr) {
  selectedDate.value = dateStr
  // Switch to day view when a date is clicked from the sidebar
  if (!['today', 'export', 'analytics'].includes(currentView.value)) {
    currentView.value = 'day'
  }
  handleDateClick(dateStr)
}

function addEvent() {
  showQuickAdd.value = true
  selectedDate.value = null // No pre-selected date for FAB button
}

function handleDateClick(dateStr) {
  selectedDate.value = dateStr // Store clicked date
  showQuickAdd.value = true // Show template selector
}

function selectTemplate(template) {
  selectedTemplate.value = template
  showQuickAdd.value = false
}

function closeModal() {
  showQuickAdd.value = false
  selectedTemplate.value = null
  selectedDate.value = null
  nlPrefilledData.value = null
}

function handleNLParsed(data) {
  // Use 'Other' template as a neutral base, override with parsed data
  nlPrefilledData.value = data
  selectedTemplate.value = {
    name: data.title,
    category: 'Other',
    color: '#6366F1',
    defaultDuration: data.duration,
    allDay: data.isAllDay,
    requiresLocation: false
  }
  selectedDate.value = data.date
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
  <div class="app min-h-screen flex flex-col bg-theme-primary overflow-x-hidden">
    <!-- Alert Notifications -->
    <AlertNotification />
    <!-- Desktop Header -->
    <header
      class="hidden md:flex justify-between items-center p-6 bg-gradient-primary text-white shadow-theme-xl"
    >
      <div class="flex items-center space-x-3">
        <div
          class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"
        >
          <span class="text-xl">📅</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Personal Calendar</h1>
      </div>
      <div class="flex items-center gap-6">
        <ThemeToggle />
        <!-- Undo / Redo -->
        <div class="flex gap-1">
          <button
            @click="undo"
            :disabled="!canUndo"
            title="Undo (Ctrl+Z)"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10H9"
              />
            </svg>
          </button>
          <button
            @click="redo"
            :disabled="!canRedo"
            title="Redo (Ctrl+Shift+Z)"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 14l5-5-5-5M19 9H8a5 5 0 000 10h6"
              />
            </svg>
          </button>
        </div>
        <nav class="flex gap-2 bg-white/10 rounded-2xl p-1 backdrop-blur-sm">
          <button
            @click="currentView = 'today'"
            @keydown="handleKeyNavigation($event, 'today')"
            :class="navButtonClasses('today')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Today
          </button>
          <button
            @click="currentView = 'month'"
            @keydown="handleKeyNavigation($event, 'month')"
            :class="navButtonClasses('month')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Month
          </button>
          <button
            @click="currentView = 'week'"
            @keydown="handleKeyNavigation($event, 'week')"
            :class="navButtonClasses('week')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Week
          </button>
          <button
            @click="currentView = 'day'"
            @keydown="handleKeyNavigation($event, 'day')"
            :class="navButtonClasses('day')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Day
          </button>
          <button
            @click="currentView = 'list'"
            @keydown="handleKeyNavigation($event, 'list')"
            :class="navButtonClasses('list')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            List
          </button>
          <button
            @click="currentView = 'analytics'"
            @keydown="handleKeyNavigation($event, 'analytics')"
            :class="navButtonClasses('analytics')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Analytics
          </button>
          <button
            @click="currentView = 'export'"
            @keydown="handleKeyNavigation($event, 'export')"
            :class="navButtonClasses('export')"
            class="px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
            tabindex="0"
          >
            Settings
          </button>
        </nav>
      </div>
    </header>

    <!-- Mobile Header -->
    <header
      class="md:hidden flex items-center justify-center p-4 bg-gradient-primary text-white shadow-theme-xl"
    >
      <div class="flex items-center space-x-3">
        <div
          class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm"
        >
          <span class="text-lg">📅</span>
        </div>
        <h1 class="text-lg font-bold tracking-tight">Calendar</h1>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Mini Calendar Sidebar (desktop only, hidden for settings/analytics) -->
      <MiniCalendar
        v-if="!['export', 'analytics'].includes(currentView)"
        @select-date="handleMiniCalendarDate"
      />

      <main class="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 pb-20 md:pb-4">
        <!-- Natural Language Input (desktop, calendar views) -->
        <div v-if="!['export', 'analytics'].includes(currentView)" class="hidden md:block mb-4">
          <NaturalLanguageInput @parsed="handleNLParsed" />
        </div>

        <!-- Search and Filter (shown for calendar views, not today dashboard) -->
        <SearchFilter v-if="currentView !== 'today'" />

        <TodayDashboard v-if="currentView === 'today'" />
        <MonthView v-else-if="currentView === 'month'" @date-click="handleDateClick" />
        <WeekView v-else-if="currentView === 'week'" @date-click="handleDateClick" />
        <DayView v-else-if="currentView === 'day'" @date-click="handleDateClick" />
        <ListView v-else-if="currentView === 'list'" />
        <AnalyticsDashboard v-else-if="currentView === 'analytics'" />
        <ExportImport v-else-if="currentView === 'export'" />
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 bg-theme-nav/95 backdrop-blur-xl border-t border-theme flex justify-around items-center py-3 px-4 shadow-theme-xl"
    >
      <button
        @click="currentView = 'today'"
        :class="mobileNavClasses('today')"
        class="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-105"
      >
        <span class="text-xl mb-1">🏠</span>
        <span class="text-xs font-medium">Today</span>
      </button>
      <button
        @click="currentView = 'month'"
        :class="mobileNavClasses('month')"
        class="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-105"
      >
        <span class="text-xl mb-1">📅</span>
        <span class="text-xs font-medium">Calendar</span>
      </button>
      <button
        @click="currentView = 'list'"
        :class="mobileNavClasses('list')"
        class="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-105"
      >
        <span class="text-xl mb-1">📋</span>
        <span class="text-xs font-medium">List</span>
      </button>
      <button
        @click="toggleMobileMenu"
        class="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-105 text-theme-secondary"
      >
        <span class="text-xl mb-1">⚙️</span>
        <span class="text-xs font-medium">More</span>
      </button>
    </nav>

    <!-- Floating Action Button -->
    <button
      @click="addEvent"
      class="fixed bottom-20 right-4 w-16 h-16 bg-gradient-accent hover:bg-gradient-accent text-white rounded-2xl shadow-theme-xl hover:shadow-theme-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl z-10 md:bottom-6 md:right-6 group"
    >
      <span class="group-hover:rotate-90 transition-transform duration-300">+</span>
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
      :initial-date="selectedDate"
      :initial-start-time="nlPrefilledData ? nlPrefilledData.startTime : null"
      @close="closeModal"
    />

    <!-- Mobile Menu Overlay -->
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 z-30 md:hidden"
      @click="showMobileMenu = false"
    >
      <div
        class="bg-theme-modal rounded-t-3xl w-full max-w-sm max-h-[70vh] overflow-hidden shadow-theme-xl border border-theme/20"
        @click.stop
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-theme-primary">More Options</h3>
            <button
              @click="showMobileMenu = false"
              class="w-8 h-8 rounded-full bg-theme-secondary hover:bg-theme-tertiary flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          <div class="space-y-3">
            <button
              @click="selectView('week')"
              class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
            >
              <span class="text-lg">📊</span>
              <span class="font-medium">Week View</span>
            </button>
            <button
              @click="selectView('day')"
              class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
            >
              <span class="text-lg">📅</span>
              <span class="font-medium">Day View</span>
            </button>
            <button
              @click="selectView('analytics')"
              class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
            >
              <span class="text-lg">📈</span>
              <span class="font-medium">Analytics</span>
            </button>
            <button
              @click="selectView('export')"
              class="w-full text-left p-4 rounded-2xl hover:bg-theme-secondary transition-colors flex items-center space-x-3"
            >
              <span class="text-lg">⚙️</span>
              <span class="font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Prevent FullCalendar from creating horizontal scroll on any view */
.fc {
  max-width: 100%;
}
.fc-view-harness {
  overflow-x: hidden !important;
}
.fc-scroller {
  overflow-x: hidden !important;
}
.fc-scroller-liquid-absolute {
  overflow-x: hidden !important;
}
/* Ensure header toolbar wraps on very small screens */
.fc-header-toolbar {
  flex-wrap: wrap;
  gap: 4px;
}
.fc-toolbar-chunk {
  display: flex;
  flex-wrap: wrap;
}
</style>
