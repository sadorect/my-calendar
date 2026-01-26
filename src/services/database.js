import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'

// Configure localforage
localforage.config({
  name: 'PersonalCalendarDB',
  storeName: 'events'
})

const eventsStore = localforage.createInstance({
  name: 'PersonalCalendarDB',
  storeName: 'events'
})

const settingsStore = localforage.createInstance({
  name: 'PersonalCalendarDB',
  storeName: 'settings'
})

const templatesStore = localforage.createInstance({
  name: 'PersonalCalendarDB',
  storeName: 'templates'
})

// Events
export async function getAllEvents() {
  const events = []
  await eventsStore.iterate((value) => {
    events.push(value)
  })
  return events
}

export async function getEvent(id) {
  return await eventsStore.getItem(id)
}

export async function addEvent(event) {
  const newEvent = {
    ...event,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await eventsStore.setItem(newEvent.id, newEvent)
  return newEvent
}

export async function updateEvent(id, updates) {
  const event = await getEvent(id)
  if (!event) throw new Error('Event not found')
  const updatedEvent = { ...event, ...updates, updatedAt: new Date().toISOString() }
  await eventsStore.setItem(id, updatedEvent)
  return updatedEvent
}

export async function deleteEvent(id) {
  await eventsStore.removeItem(id)
}

// Settings
export async function getSetting(key) {
  return await settingsStore.getItem(key)
}

export async function setSetting(key, value) {
  await settingsStore.setItem(key, value)
}

// Templates
export async function getAllTemplates() {
  const templates = []
  await templatesStore.iterate((value) => {
    templates.push(value)
  })
  return templates
}

export async function addTemplate(template) {
  const newTemplate = { ...template, id: uuidv4() }
  await templatesStore.setItem(newTemplate.id, newTemplate)
  return newTemplate
}
