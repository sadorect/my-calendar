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

export async function clearAllEvents() {
  await eventsStore.clear()
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

// Custom categories
const categoriesStore = localforage.createInstance({
  name: 'PersonalCalendarDB',
  storeName: 'categories'
})

export async function getAllCategories() {
  const cats = []
  await categoriesStore.iterate((value) => cats.push(value))
  return cats
}

export async function addCategory(category) {
  const newCat = { ...category, id: uuidv4(), isCustom: true }
  await categoriesStore.setItem(newCat.id, newCat)
  return newCat
}

export async function updateCategory(id, updates) {
  const existing = await categoriesStore.getItem(id)
  if (!existing) throw new Error('Category not found')
  const updated = { ...existing, ...updates }
  await categoriesStore.setItem(id, updated)
  return updated
}

export async function deleteCategory(id) {
  await categoriesStore.removeItem(id)
}
