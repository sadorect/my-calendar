// Notification service for browser notifications and in-app alerts
class NotificationService {
  constructor() {
    this.permission = null
    this.scheduledNotifications = new Map()
    this.checkInterval = null
    this.alertStore = null
    this.notifiedEvents = new Set() // Track events we've already notified about
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return true
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied'
      return false
    }

    try {
      this.permission = await Notification.requestPermission()
      return this.permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // Check if notifications are supported and permitted
  canNotify() {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  // Schedule a notification for an event
  scheduleNotification(event, minutesBefore = 15) {
    if (!this.canNotify()) return

    const eventTime = new Date(event.startDateTime)
    const notificationTime = new Date(eventTime.getTime() - minutesBefore * 60 * 1000)

    // Don't schedule notifications for past events
    if (notificationTime <= new Date()) return

    const notificationId = `${event.id}_${minutesBefore}`

    // Clear any existing notification for this event
    this.cancelNotification(notificationId)

    const timeoutId = setTimeout(() => {
      this.showNotification(event, minutesBefore)
      this.scheduledNotifications.delete(notificationId)
    }, notificationTime - new Date())

    this.scheduledNotifications.set(notificationId, timeoutId)
  }

  // Schedule multiple notifications for an event based on reminders
  scheduleEventNotifications(event) {
    if (!this.canNotify() || !event.reminders) return

    event.reminders.forEach((minutesBefore) => {
      this.scheduleNotification(event, minutesBefore)
    })
  }

  // Cancel a scheduled notification
  cancelNotification(notificationId) {
    const timeoutId = this.scheduledNotifications.get(notificationId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.scheduledNotifications.delete(notificationId)
    }
  }

  // Show a notification for an event
  showNotification(event, minutesBefore) {
    if (!this.canNotify()) return

    const options = {
      body: `${minutesBefore} minutes until: ${event.title}${event.location ? `\n📍 ${event.location}` : ''}`,
      icon: '/vite.svg', // You can replace this with a calendar icon
      badge: '/vite.svg',
      tag: `event-${event.id}`, // Prevents duplicate notifications
      requireInteraction: false,
      silent: false,
      data: {
        eventId: event.id,
        url: window.location.href
      }
    }

    const notification = new Notification('📅 Calendar Reminder', options)

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close()
    }, 10000)

    // Handle click on notification
    notification.onclick = () => {
      window.focus()
      notification.close()
      // Could navigate to the event or calendar view
    }
  }

  // Schedule notifications for all upcoming events
  scheduleAllNotifications(events) {
    if (!this.canNotify()) return

    // Clear all existing notifications
    this.clearAllNotifications()

    const now = new Date()
    const futureEvents = events.filter((event) => new Date(event.startDateTime) > now)

    futureEvents.forEach((event) => {
      this.scheduleEventNotifications(event)
    })
  }

  // Clear all scheduled notifications
  clearAllNotifications() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.scheduledNotifications.clear()
  }

  // Get notification status
  getStatus() {
    return {
      supported: 'Notification' in window,
      permission: Notification.permission,
      scheduledCount: this.scheduledNotifications.size
    }
  }

  // Initialize alert store (called from main app)
  setAlertStore(alertStore) {
    this.alertStore = alertStore
  }

  // Show in-app alert notification
  showInAppAlert(event, minutesBefore) {
    if (!this.alertStore) return

    const alertKey = `${event.id}_${minutesBefore}`

    // Don't show duplicate alerts
    if (this.alertStore.hasAlertForEvent(event.id, minutesBefore)) {
      return
    }

    let message = `Starting in ${minutesBefore} minutes`
    if (minutesBefore === 0) {
      message = 'Starting now!'
    } else if (minutesBefore < 60) {
      message = `Starting in ${minutesBefore} minutes`
    } else {
      const hours = Math.floor(minutesBefore / 60)
      message = `Starting in ${hours} hour${hours > 1 ? 's' : ''}`
    }

    this.alertStore.addAlert({
      type: 'reminder',
      title: event.title,
      message: message,
      location: event.location || null,
      eventId: event.id,
      minutesBefore: minutesBefore,
      duration: 15000 // Show for 15 seconds
    })
  }

  // Start periodic checking for upcoming events
  startPeriodicCheck(getEventsCallback, intervalMs = 60000) {
    // Stop any existing interval
    this.stopPeriodicCheck()

    // Immediately check once
    this.checkUpcomingEvents(getEventsCallback)

    // Then check periodically (default every 60 seconds)
    this.checkInterval = setInterval(() => {
      this.checkUpcomingEvents(getEventsCallback)
    }, intervalMs)
  }

  // Stop periodic checking
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  // Check for upcoming events and show alerts
  checkUpcomingEvents(getEventsCallback) {
    const events = getEventsCallback()
    const now = new Date()

    events.forEach((event) => {
      // Skip completed events
      if (event.isCompleted) return

      const eventStart = new Date(event.startDateTime)

      // Only check future events within the next 24 hours
      const timeDiff = eventStart.getTime() - now.getTime()
      if (timeDiff < 0 || timeDiff > 24 * 60 * 60 * 1000) return

      const minutesUntilEvent = Math.floor(timeDiff / (60 * 1000))

      // Check if we should notify based on reminders
      if (event.reminders && event.reminders.length > 0) {
        event.reminders.forEach((reminderMinutes) => {
          // Check if we're within the reminder window (±1 minute tolerance)
          const diff = Math.abs(minutesUntilEvent - reminderMinutes)

          if (diff <= 1) {
            const notificationKey = `${event.id}_${reminderMinutes}`

            // Only notify once per event/reminder combination
            if (!this.notifiedEvents.has(notificationKey)) {
              this.notifiedEvents.add(notificationKey)

              // Show in-app alert
              this.showInAppAlert(event, minutesUntilEvent)

              // Also show browser notification if enabled
              if (this.canNotify()) {
                this.showNotification(event, reminderMinutes)
              }

              // Clean up old notifications after event has passed
              setTimeout(
                () => {
                  this.notifiedEvents.delete(notificationKey)
                },
                timeDiff + 60 * 60 * 1000
              ) // Clean up 1 hour after event
            }
          }
        })
      }
    })
  }
}

// Create and export a singleton instance
export const notificationService = new NotificationService()
