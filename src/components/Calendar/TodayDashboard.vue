<template>
  <div class="space-y-8">
    <!-- Hero Section -->
    <div class="text-center py-6">
      <div
        class="inline-flex items-center space-x-3 bg-gradient-primary text-white px-6 py-3 rounded-2xl shadow-theme-xl mb-4"
      >
        <span class="text-2xl">🎯</span>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">
          Today - {{ formatDate(new Date()) }}
        </h1>
      </div>
      <p class="text-theme-secondary text-lg">Stay organized and productive</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 gap-6">
      <div
        class="card-glass p-6 text-center bg-gradient-accent text-white hover:scale-105 transition-transform duration-300"
      >
        <div
          class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
        >
          <span class="text-2xl">📅</span>
        </div>
        <div class="text-3xl font-bold mb-2">{{ todaysEvents.length }}</div>
        <div class="text-white/80 font-medium">Events Today</div>
      </div>
      <div
        class="card-glass p-6 text-center bg-gradient-success text-white hover:scale-105 transition-transform duration-300"
      >
        <div
          class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
        >
          <span class="text-2xl">✅</span>
        </div>
        <div class="text-3xl font-bold mb-2">{{ completedEventsCount }}</div>
        <div class="text-white/80 font-medium">Completed</div>
      </div>
    </div>

    <!-- Today's Events Section -->
    <div class="card p-6">
      <div class="flex items-center space-x-3 mb-6">
        <div
          class="w-10 h-10 bg-gradient-accent rounded-2xl flex items-center justify-center text-white"
        >
          <span class="text-lg">📋</span>
        </div>
        <h2 class="text-2xl font-bold text-theme-primary">Today's Events</h2>
      </div>

      <div v-if="todaysEvents.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 bg-theme-secondary rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <span class="text-3xl">🎉</span>
        </div>
        <div class="text-xl font-semibold text-theme-primary mb-2">All caught up!</div>
        <div class="text-theme-secondary">No events scheduled for today</div>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="event in todaysEvents"
          :key="'today-' + event.id"
          class="card p-5 hover:scale-[1.02] transition-all duration-200"
          :class="{ 'opacity-60': event.isCompleted }"
        >
          <div class="flex justify-between items-start">
            <div class="flex items-start space-x-4 flex-1">
              <input
                :id="'event-checkbox-' + event.id"
                type="checkbox"
                :checked="event.isCompleted"
                @change="toggleCompletion(event.id)"
                :aria-label="
                  'Mark ' + event.title + ' as ' + (event.isCompleted ? 'incomplete' : 'complete')
                "
                class="mt-1 h-5 w-5 text-theme-success focus:ring-theme-success border-theme rounded-lg"
              />
              <div class="flex-1">
                <div
                  class="font-semibold text-lg text-theme-primary mb-2"
                  :class="{ 'line-through text-theme-muted': event.isCompleted }"
                >
                  {{ event.title }}
                </div>
                <div class="flex items-center space-x-4 text-sm text-theme-secondary">
                  <div class="flex items-center space-x-1">
                    <span>🕐</span>
                    <span>{{ formatTime(event.startDateTime) }}</span>
                  </div>
                  <div v-if="event.location" class="flex items-center space-x-1">
                    <span>📍</span>
                    <span>{{ event.location }}</span>
                  </div>
                  <div v-if="event.isRecurring" class="flex items-center space-x-1">
                    <span>🔄</span>
                    <span>Recurring</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="editEvent(event)"
                class="p-2 text-theme-secondary hover:text-theme-accent hover:bg-theme-accent/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Edit event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="duplicateEvent(event.id)"
                class="p-2 text-theme-secondary hover:text-theme-accent hover:bg-theme-accent/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Duplicate event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(event)"
                class="p-2 text-theme-secondary hover:text-theme-error hover:bg-theme-error/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Delete event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <div
                class="px-3 py-1 rounded-full text-sm font-semibold text-white shadow-theme"
                :style="{ backgroundColor: event.color }"
              >
                {{ event.category }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Events Section -->
    <div class="card p-6">
      <div class="flex items-center space-x-3 mb-6">
        <div
          class="w-10 h-10 bg-gradient-warning rounded-2xl flex items-center justify-center text-white"
        >
          <span class="text-lg">🔮</span>
        </div>
        <h2 class="text-2xl font-bold text-theme-primary">Upcoming (Next 7 days)</h2>
      </div>

      <div v-if="upcomingEvents.length === 0" class="text-center py-12">
        <div
          class="w-16 h-16 bg-theme-secondary rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <span class="text-3xl">✨</span>
        </div>
        <div class="text-xl font-semibold text-theme-primary mb-2">Nothing planned</div>
        <div class="text-theme-secondary">No upcoming events in the next 7 days</div>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="event in upcomingEvents"
          :key="'upcoming-' + event.id"
          class="card p-5 hover:scale-[1.02] transition-all duration-200"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-semibold text-lg text-theme-primary mb-2">{{ event.title }}</div>
              <div class="flex items-center space-x-4 text-sm text-theme-secondary">
                <div class="flex items-center space-x-1">
                  <span>📅</span>
                  <span>{{ formatDate(new Date(event.startDateTime)) }}</span>
                </div>
                <div v-if="event.location" class="flex items-center space-x-1">
                  <span>📍</span>
                  <span>{{ event.location }}</span>
                </div>
                <div v-if="event.isRecurring" class="flex items-center space-x-1">
                  <span>🔄</span>
                  <span>Recurring</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="editEvent(event)"
                class="p-2 text-theme-secondary hover:text-theme-accent hover:bg-theme-accent/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Edit event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="duplicateEvent(event.id)"
                class="p-2 text-theme-secondary hover:text-theme-accent hover:bg-theme-accent/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Duplicate event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                @click="confirmDelete(event)"
                class="p-2 text-theme-secondary hover:text-theme-error hover:bg-theme-error/10 rounded-xl transition-all duration-200 hover:scale-110"
                title="Delete event"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <div
                class="px-3 py-1 rounded-full text-sm font-semibold text-white shadow-theme"
                :style="{ backgroundColor: event.color }"
              >
                {{ event.category }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Event Modal -->
  <QuickAddModal
    v-if="showEditModal"
    :show="showEditModal"
    :template="
      editingEvent
        ? { category: editingEvent.category, color: editingEvent.color, name: editingEvent.title }
        : null
    "
    :initial-event="editingEvent"
    @close="closeEditModal"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/events'
import { format, isToday } from 'date-fns'
import QuickAddModal from '@/components/Events/QuickAddModal.vue'

const eventStore = useEventStore()

// Edit modal state
const showEditModal = ref(false)
const editingEvent = ref(null)

const todaysEvents = computed(() => {
  return eventStore.events.filter((event) => isToday(new Date(event.startDateTime)))
})

const completedEventsCount = computed(() => {
  return todaysEvents.value.filter((event) => event.isCompleted).length
})

const upcomingEvents = computed(() => eventStore.upcomingEvents)

function formatDate(date) {
  return format(date, 'PPP')
}

function formatTime(dateTime) {
  return format(new Date(dateTime), 'p')
}

async function toggleCompletion(eventId) {
  await eventStore.toggleEventCompletion(eventId)
}

async function duplicateEvent(eventId) {
  await eventStore.duplicateEvent(eventId)
}

function editEvent(event) {
  editingEvent.value = event
  showEditModal.value = true
}

function confirmDelete(event) {
  if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
    deleteEvent(event.id)
  }
}

async function deleteEvent(eventId) {
  await eventStore.deleteEvent(eventId)
}

function closeEditModal() {
  showEditModal.value = false
  editingEvent.value = null
}
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
