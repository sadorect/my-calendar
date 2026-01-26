<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
      <span class="text-2xl mr-2">🔔</span>
      Notification Settings
    </h3>

    <div class="space-y-4">
      <!-- Notification Status -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">Browser Notifications</p>
          <p class="text-xs text-gray-500">
            {{ getStatusText() }}
          </p>
        </div>
        <div class="flex items-center">
          <span :class="getStatusColor()" class="inline-block w-3 h-3 rounded-full mr-2"></span>
          <span class="text-sm text-gray-600">{{ notificationStatus.permission }}</span>
        </div>
      </div>

      <!-- Enable/Disable Button -->
      <div v-if="notificationStatus.supported">
        <button
          v-if="notificationStatus.permission === 'default'"
          @click="requestPermission"
          :disabled="requesting"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {{ requesting ? 'Requesting...' : 'Enable Notifications' }}
        </button>

        <button
          v-else-if="notificationStatus.permission === 'granted'"
          @click="testNotification"
          class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
        >
          Test Notification
        </button>

        <p v-else class="text-sm text-gray-500 text-center py-2">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>

      <div v-else class="text-sm text-gray-500 text-center py-2">
        Notifications are not supported in this browser.
      </div>

      <!-- Scheduled Notifications Count -->
      <div v-if="notificationStatus.scheduledCount > 0" class="border-t pt-4">
        <p class="text-sm text-gray-600">
          📅 {{ notificationStatus.scheduledCount }} notification{{
            notificationStatus.scheduledCount === 1 ? '' : 's'
          }}
          scheduled
        </p>
      </div>

      <!-- Notification Info -->
      <div class="border-t pt-4">
        <p class="text-xs text-gray-500">
          Notifications will be sent 15 minutes before upcoming events. Make sure your browser
          allows notifications for this site.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEventStore } from '@/stores/events'

const eventStore = useEventStore()
const requesting = ref(false)

const notificationStatus = computed(() => {
  return eventStore.getNotificationStatus()
})

onMounted(() => {
  // Status is reactive through the computed property
})

function getStatusText() {
  if (!notificationStatus.value.supported) {
    return 'Not supported in this browser'
  }

  switch (notificationStatus.value.permission) {
    case 'granted':
      return 'Enabled - You will receive reminders'
    case 'denied':
      return 'Blocked - Please enable in browser settings'
    case 'default':
      return 'Not requested - Click to enable'
    default:
      return 'Unknown status'
  }
}

function getStatusColor() {
  switch (notificationStatus.value.permission) {
    case 'granted':
      return 'bg-green-500'
    case 'denied':
      return 'bg-red-500'
    case 'default':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-500'
  }
}

async function requestPermission() {
  requesting.value = true
  try {
    await eventStore.requestNotificationPermission()
  } catch (error) {
    console.error('Error requesting permission:', error)
  } finally {
    requesting.value = false
  }
}

function testNotification() {
  // Create a test event for demonstration
  const testEvent = {
    id: 'test-notification',
    title: 'Test Notification',
    startDateTime: new Date(Date.now() + 5000).toISOString(), // 5 seconds from now
    location: 'Test Location'
  }

  // Import the notification service directly for testing
  import('@/services/notifications').then(({ notificationService }) => {
    notificationService.scheduleNotification(testEvent, 0) // Immediate notification
  })
}
</script>

<style scoped>
/* Additional styles if needed */
</style>
