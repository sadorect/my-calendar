<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Export & Import Data</h2>

    <!-- Export Section -->
    <div class="mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Export Calendar Data</h3>
      <p class="text-sm text-gray-600 mb-4">
        Export your calendar events in various formats for backup or sharing.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          @click="exportJSON"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export JSON
        </button>

        <button
          @click="exportCSV"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>

        <button
          @click="exportICal"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Export iCal
        </button>
      </div>
    </div>

    <!-- Import Section -->
    <div class="mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Import Calendar Data</h3>
      <p class="text-sm text-gray-600 mb-4">
        Import events from JSON or CSV files. Existing events will not be affected.
      </p>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select File to Import
          </label>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelect"
            accept=".json,.csv"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div
          v-if="selectedFile"
          class="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
        >
          <div class="flex items-center">
            <svg
              class="w-5 h-5 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm text-blue-700">{{ selectedFile.name }}</span>
          </div>
          <button
            @click="importFile"
            :disabled="isImporting"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {{ isImporting ? 'Importing...' : 'Import Events' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backup Section -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">Backup & Restore</h3>
      <p class="text-sm text-gray-600 mb-4">
        Create backups of your entire calendar data or restore from a previous backup.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          @click="createBackup"
          class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          Create Backup
        </button>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2"> Restore from Backup </label>
          <input
            type="file"
            ref="backupInput"
            @change="handleBackupSelect"
            accept=".json"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>
      </div>

      <div
        v-if="selectedBackup"
        class="mt-4 flex items-center justify-between p-4 bg-green-50 rounded-lg"
      >
        <div class="flex items-center">
          <svg
            class="w-5 h-5 text-green-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm text-green-700">{{ selectedBackup.name }}</span>
        </div>
        <button
          @click="restoreBackup"
          :disabled="isRestoring"
          class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {{ isRestoring ? 'Restoring...' : 'Restore Backup' }}
        </button>
      </div>
    </div>

    <!-- Status Messages -->
    <div
      v-if="statusMessage"
      class="mt-6 p-4 rounded-lg"
      :class="statusType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEventStore } from '../stores/events'
import {
  exportToJSON,
  exportToCSV,
  exportToICal,
  importFromJSON,
  importFromCSV,
  createBackup as createBackupFile,
  restoreFromBackup
} from '../services/export'

const eventsStore = useEventStore()

const fileInput = ref(null)
const backupInput = ref(null)
const selectedFile = ref(null)
const selectedBackup = ref(null)
const isImporting = ref(false)
const isRestoring = ref(false)
const statusMessage = ref('')
const statusType = ref('')

const events = computed(() => eventsStore.events)

function exportJSON() {
  exportToJSON(events.value)
  showStatus('Events exported to JSON successfully!', 'success')
}

function exportCSV() {
  exportToCSV(events.value)
  showStatus('Events exported to CSV successfully!', 'success')
}

function exportICal() {
  exportToICal(events.value)
  showStatus('Events exported to iCal successfully!', 'success')
}

function handleFileSelect(event) {
  selectedFile.value = event.target.files[0]
}

function handleBackupSelect(event) {
  selectedBackup.value = event.target.files[0]
}

async function importFile() {
  if (!selectedFile.value) return

  isImporting.value = true
  statusMessage.value = ''

  try {
    let importedEvents = []

    if (selectedFile.value.name.endsWith('.json')) {
      importedEvents = await importFromJSON(selectedFile.value)
    } else if (selectedFile.value.name.endsWith('.csv')) {
      importedEvents = await importFromCSV(selectedFile.value)
    } else {
      throw new Error('Unsupported file format')
    }

    // Add imported events to the store
    importedEvents.forEach((event) => {
      eventsStore.addEvent(event)
    })

    showStatus(`Successfully imported ${importedEvents.length} events!`, 'success')
    selectedFile.value = null
    fileInput.value.value = ''
  } catch (error) {
    showStatus(`Import failed: ${error.message}`, 'error')
  } finally {
    isImporting.value = false
  }
}

function createBackup() {
  createBackupFile()
  showStatus('Backup created successfully!', 'success')
}

async function restoreBackup() {
  if (!selectedBackup.value) return

  isRestoring.value = true
  statusMessage.value = ''

  try {
    const backup = await restoreFromBackup(selectedBackup.value)

    // Restore events, templates, and settings
    if (backup.events) {
      eventsStore.events = backup.events
      eventsStore.saveEvents()
    }

    showStatus('Backup restored successfully!', 'success')
    selectedBackup.value = null
    backupInput.value.value = ''
  } catch (error) {
    showStatus(`Restore failed: ${error.message}`, 'error')
  } finally {
    isRestoring.value = false
  }
}

function showStatus(message, type) {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 5000)
}
</script>
