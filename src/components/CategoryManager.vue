<template>
  <div class="bg-theme-card border border-theme rounded-lg p-4">
    <h3 class="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
      <span class="text-xl">🏷️</span>
      Custom Categories
    </h3>

    <!-- Add new category -->
    <form @submit.prevent="addCategory" class="flex gap-2 mb-4">
      <input
        v-model="newName"
        type="text"
        placeholder="Category name"
        maxlength="40"
        required
        class="flex-1 px-3 py-2 border border-theme rounded-md bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-accent text-sm"
      />
      <input
        v-model="newColor"
        type="color"
        title="Pick a color"
        class="h-10 w-12 cursor-pointer rounded border border-theme p-1"
      />
      <button
        type="submit"
        class="px-3 py-2 bg-theme-accent text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
      >
        Add
      </button>
    </form>

    <!-- Custom category list -->
    <ul class="space-y-2">
      <li
        v-for="cat in eventStore.customCategories"
        :key="cat.id"
        class="flex items-center gap-2 p-2 rounded-lg bg-theme-secondary"
      >
        <span
          class="w-4 h-4 rounded-full flex-shrink-0"
          :style="{ backgroundColor: cat.color || '#6B7280' }"
        ></span>

        <template v-if="editing === cat.id">
          <input
            v-model="editName"
            type="text"
            maxlength="40"
            class="flex-1 px-2 py-1 border border-theme rounded bg-theme-primary text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-theme-accent"
            @keydown.enter.prevent="saveEdit(cat)"
            @keydown.escape="editing = null"
          />
          <input
            v-model="editColor"
            type="color"
            class="h-8 w-10 cursor-pointer rounded border border-theme p-0.5"
          />
          <button
            @click="saveEdit(cat)"
            class="text-green-600 hover:text-green-700 text-sm font-medium px-2"
          >
            Save
          </button>
          <button
            @click="editing = null"
            class="text-theme-muted hover:text-theme-primary text-sm px-1"
          >
            ✕
          </button>
        </template>
        <template v-else>
          <span class="flex-1 text-sm text-theme-primary">{{ cat.name }}</span>
          <button
            @click="startEdit(cat)"
            class="text-theme-muted hover:text-theme-primary transition-colors px-1"
            title="Rename"
          >
            ✏️
          </button>
          <button
            @click="removeCategory(cat.id)"
            class="text-red-400 hover:text-red-600 transition-colors px-1"
            title="Delete"
          >
            🗑️
          </button>
        </template>
      </li>

      <li
        v-if="eventStore.customCategories.length === 0"
        class="text-sm text-theme-muted py-2 text-center"
      >
        No custom categories yet. Add one above.
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEventStore } from '@/stores/events'

const eventStore = useEventStore()

const newName = ref('')
const newColor = ref('#6366F1')

const editing = ref(null)
const editName = ref('')
const editColor = ref('')

async function addCategory() {
  if (!newName.value.trim()) return
  await eventStore.addCustomCategory({ name: newName.value.trim(), color: newColor.value })
  newName.value = ''
  newColor.value = '#6366F1'
}

function startEdit(cat) {
  editing.value = cat.id
  editName.value = cat.name
  editColor.value = cat.color || '#6B7280'
}

async function saveEdit(cat) {
  if (!editName.value.trim()) return
  await eventStore.updateCustomCategory(cat.id, {
    name: editName.value.trim(),
    color: editColor.value
  })
  editing.value = null
}

async function removeCategory(id) {
  await eventStore.deleteCustomCategory(id)
}
</script>
