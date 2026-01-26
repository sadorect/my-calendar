import { format, parseISO } from 'date-fns'

// Export functions for different formats

export function exportToJSON(events) {
  const dataStr = JSON.stringify(events, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  downloadBlob(dataBlob, 'calendar-events.json')
}

export function exportToCSV(events) {
  const headers = [
    'Title',
    'Category',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'All Day',
    'Location',
    'Notes',
    'Recurring',
    'Completed'
  ]

  const rows = events.map((event) => {
    const startDate = parseISO(event.startDateTime)
    const endDate = parseISO(event.endDateTime)

    return [
      event.title,
      event.category,
      format(startDate, 'yyyy-MM-dd'),
      event.isAllDay ? '' : format(startDate, 'HH:mm'),
      format(endDate, 'yyyy-MM-dd'),
      event.isAllDay ? '' : format(endDate, 'HH:mm'),
      event.isAllDay ? 'Yes' : 'No',
      event.location || '',
      event.notes || '',
      event.isRecurring ? 'Yes' : 'No',
      event.isCompleted ? 'Yes' : 'No'
    ]
  })

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n')

  const dataBlob = new Blob([csvContent], { type: 'text/csv' })
  downloadBlob(dataBlob, 'calendar-events.csv')
}

export function exportToICal(events) {
  let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Personal Calendar//EN
CALSCALE:GREGORIAN
`

  events.forEach((event) => {
    const startDate = parseISO(event.startDateTime)
    const endDate = parseISO(event.endDateTime)

    icalContent += `BEGIN:VEVENT
UID:${event.id}@personal-calendar
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART:${event.isAllDay ? format(startDate, 'yyyyMMdd') : format(startDate, "yyyyMMdd'T'HHmmss'Z'")}
DTEND:${event.isAllDay ? format(endDate, 'yyyyMMdd') : format(endDate, "yyyyMMdd'T'HHmmss'Z'")}
SUMMARY:${escapeICalText(event.title)}
CATEGORIES:${event.category}
`

    if (event.location) {
      icalContent += `LOCATION:${escapeICalText(event.location)}\n`
    }

    if (event.notes) {
      icalContent += `DESCRIPTION:${escapeICalText(event.notes)}\n`
    }

    if (event.isAllDay) {
      icalContent += `X-MICROSOFT-CDO-ALLDAYEVENT:TRUE\n`
    }

    if (event.isRecurring && event.recurrence) {
      const recurrence = event.recurrence
      let rrule = 'RRULE:'

      switch (recurrence.frequency) {
        case 'daily':
          rrule += `FREQ=DAILY;INTERVAL=${recurrence.interval}`
          break
        case 'weekly':
          rrule += `FREQ=WEEKLY;INTERVAL=${recurrence.interval}`
          break
        case 'monthly':
          rrule += `FREQ=MONTHLY;INTERVAL=${recurrence.interval}`
          break
        case 'yearly':
          rrule += `FREQ=YEARLY;INTERVAL=${recurrence.interval}`
          break
      }

      if (recurrence.endDate) {
        const endDate = parseISO(recurrence.endDate)
        rrule += `;UNTIL=${format(endDate, "yyyyMMdd'T'HHmmss'Z'")}`
      }

      icalContent += `${rrule}\n`
    }

    icalContent += `END:VEVENT\n`
  })

  icalContent += `END:VCALENDAR`

  const dataBlob = new Blob([icalContent], { type: 'text/calendar' })
  downloadBlob(dataBlob, 'calendar-events.ics')
}

function escapeICalText(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Import functions

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const events = JSON.parse(e.target.result)
        resolve(events)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function importFromCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target.result
        const lines = csv.split('\n')
        const headers = lines[0].split(',').map((h) => h.replace(/"/g, ''))

        const events = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.replace(/"/g, ''))
          const event = {}

          headers.forEach((header, index) => {
            const value = values[index]
            switch (header) {
              case 'Title':
                event.title = value
                break
              case 'Category':
                event.category = value
                break
              case 'Start Date':
                event.startDate = value
                break
              case 'Start Time':
                event.startTime = value
                break
              case 'End Date':
                event.endDate = value
                break
              case 'End Time':
                event.endTime = value
                break
              case 'All Day':
                event.isAllDay = value === 'Yes'
                break
              case 'Location':
                event.location = value
                break
              case 'Notes':
                event.notes = value
                break
              case 'Recurring':
                event.isRecurring = value === 'Yes'
                break
              case 'Completed':
                event.isCompleted = value === 'Yes'
                break
            }
          })

          // Construct datetime strings
          if (event.isAllDay) {
            event.startDateTime = `${event.startDate}T00:00:00`
            event.endDateTime = `${event.endDate}T23:59:59`
          } else {
            event.startDateTime = `${event.startDate}T${event.startTime}:00`
            event.endDateTime = `${event.endDate}T${event.endTime}:00`
          }

          // Clean up temporary fields
          delete event.startDate
          delete event.startTime
          delete event.endDate
          delete event.endTime

          return event
        })

        resolve(events)
      } catch (error) {
        reject(new Error('Invalid CSV file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Backup and restore functions

export async function createBackup() {
  // This would be implemented to backup all data
  const backup = {
    events: [], // Would get from store
    templates: [], // Would get from store
    settings: {}, // Would get from store
    timestamp: new Date().toISOString()
  }

  const dataStr = JSON.stringify(backup, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  downloadBlob(dataBlob, `calendar-backup-${format(new Date(), 'yyyy-MM-dd')}.json`)
}

export function restoreFromBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result)
        resolve(backup)
      } catch (error) {
        reject(new Error('Invalid backup file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
