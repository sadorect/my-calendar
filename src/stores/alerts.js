import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAlertStore = defineStore('alerts', () => {
  const alerts = ref([])
  let nextId = 1

  function addAlert(alert) {
    const id = nextId++
    const newAlert = {
      id,
      ...alert,
      timestamp: new Date().toISOString()
    }
    alerts.value.push(newAlert)

    // Auto-dismiss after duration (default 10 seconds)
    const duration = alert.duration || 10000
    setTimeout(() => {
      dismissAlert(id)
    }, duration)

    return id
  }

  function dismissAlert(id) {
    alerts.value = alerts.value.filter((a) => a.id !== id)
  }

  function clearAllAlerts() {
    alerts.value = []
  }

  function hasAlertForEvent(eventId, minutesBefore) {
    return alerts.value.some(
      (alert) => alert.eventId === eventId && alert.minutesBefore === minutesBefore
    )
  }

  return {
    alerts,
    addAlert,
    dismissAlert,
    clearAllAlerts,
    hasAlertForEvent
  }
})
