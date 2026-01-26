// Notification service for browser notifications
class NotificationService {
  constructor() {
    this.permission = null
    this.scheduledNotifications = new Map()
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
}

// Create and export a singleton instance
export const notificationService = new NotificationService()
