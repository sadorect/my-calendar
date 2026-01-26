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
      class="hidden md:flex justify-between items-center p-6 bg-gradient-primary text-white shadow-theme-xl"
    >
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <span class="text-xl">📅</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Personal Calendar</h1>
      </div>
      <div class="flex items-center gap-6">
        <ThemeToggle />
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
    <header class="md:hidden flex items-center justify-center p-4 bg-gradient-primary text-white shadow-theme-xl">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <span class="text-lg">📅</span>
        </div>
        <h1 class="text-lg font-bold tracking-tight">Calendar</h1>
      </div>
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
/* Custom styles for FullCalendar and other components */
</style>
