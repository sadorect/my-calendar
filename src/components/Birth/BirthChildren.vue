<script setup>
import { computed, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { BORN_STAGES, resolveStage } from '../../data/family/stages.js'

const store = usePregnancyStore()

const adding = ref(false)
const newName = ref('')
const newBirthDate = ref('')
const editing = ref(null)
const confirmingRemoval = ref(null)

const canAdd = computed(() => Boolean(newBirthDate.value))

/** An `<input type="date">` wants YYYY-MM-DD in local time, not an ISO instant. */
function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromDateInput(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}

async function add() {
  if (!canAdd.value) return
  await store.addProfile({
    kind: 'child',
    name: newName.value,
    birthDate: fromDateInput(newBirthDate.value)
  })
  newName.value = ''
  newBirthDate.value = ''
  adding.value = false
}

function stageLabel(profile) {
  if (profile.kind === 'womb') return 'In the Womb'
  const stage = resolveStage(profile, new Date())
  if (!stage) return 'Add a birth date'
  return profile.stage === 'auto' ? `${stage.label} · by age` : stage.label
}

async function remove(id) {
  await store.removeProfile(id)
  confirmingRemoval.value = null
}
</script>

<template>
  <section class="bc-card p-5">
    <h2 class="font-medium mb-1">Children</h2>
    <p class="text-sm bc-muted mb-4">
      Each child keeps their own declarations, favourites and journal. Nothing is shared between
      them.
    </p>

    <ul class="space-y-2">
      <li
        v-for="profile in store.profiles"
        :key="profile.id"
        class="rounded-2xl border"
        :style="{ borderColor: 'var(--bc-hairline)' }"
      >
        <div class="flex items-center gap-3 p-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ profile.name?.trim() || (profile.kind === 'womb' ? 'Little one' : 'Unnamed') }}
            </p>
            <p class="text-xs bc-muted">{{ stageLabel(profile) }}</p>
          </div>
          <button
            v-if="profile.id !== store.activeProfile?.id"
            class="bc-tap px-3 py-2 rounded-xl text-sm border transition hover:opacity-70"
            :style="{ borderColor: 'var(--bc-hairline)' }"
            @click="store.selectProfile(profile.id)"
          >
            Open
          </button>
          <button
            class="bc-tap px-3 py-2 rounded-xl text-sm transition hover:opacity-70"
            :style="{ color: 'var(--bc-accent)' }"
            :aria-expanded="editing === profile.id"
            @click="editing = editing === profile.id ? null : profile.id"
          >
            {{ editing === profile.id ? 'Done' : 'Edit' }}
          </button>
        </div>

        <div
          v-if="editing === profile.id"
          class="px-3 pb-3 space-y-3 border-t pt-3"
          :style="{ borderColor: 'var(--bc-hairline)' }"
        >
          <div>
            <label class="block text-sm font-medium mb-1" :for="`bc-name-${profile.id}`">
              Name
            </label>
            <input
              :id="`bc-name-${profile.id}`"
              :value="profile.name"
              type="text"
              maxlength="40"
              placeholder="Their name"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
              @change="store.updateProfile(profile.id, { name: $event.target.value })"
            />
          </div>

          <div v-if="profile.kind !== 'womb'">
            <label class="block text-sm font-medium mb-1" :for="`bc-dob-${profile.id}`">
              Birthday
            </label>
            <input
              :id="`bc-dob-${profile.id}`"
              :value="toDateInput(profile.birthDate)"
              type="date"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
              @change="
                store.updateProfile(profile.id, { birthDate: fromDateInput($event.target.value) })
              "
            />
          </div>

          <div v-if="profile.kind !== 'womb'">
            <label class="block text-sm font-medium mb-1" :for="`bc-stage-${profile.id}`">
              Life stage
            </label>
            <select
              :id="`bc-stage-${profile.id}`"
              :value="profile.stage"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
              @change="store.updateProfile(profile.id, { stage: $event.target.value })"
            >
              <option value="auto">Follow their age</option>
              <option v-for="stage in BORN_STAGES" :key="stage.id" :value="stage.id">
                {{ stage.label }}
              </option>
            </select>
            <p class="text-xs bc-muted mt-1">
              Left on their age, they move to the next stage on their birthday.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1" :for="`bc-notes-${profile.id}`">
              Notes
            </label>
            <textarea
              :id="`bc-notes-${profile.id}`"
              :value="profile.notes"
              rows="2"
              class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
              @change="store.updateProfile(profile.id, { notes: $event.target.value })"
            />
          </div>

          <div v-if="confirmingRemoval === profile.id" class="space-y-2">
            <p class="text-sm">
              Remove {{ profile.name?.trim() || 'this child' }}? Their journal, favourites and
              spoken days go with them, and this cannot be undone.
            </p>
            <div class="flex gap-2">
              <button
                class="bc-tap px-4 py-2.5 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 transition"
                @click="remove(profile.id)"
              >
                Remove them
              </button>
              <button
                class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
                :style="{ borderColor: 'var(--bc-hairline)' }"
                @click="confirmingRemoval = null"
              >
                Keep them
              </button>
            </div>
          </div>
          <button
            v-else
            class="bc-tap text-sm text-red-600 hover:opacity-70 transition"
            @click="confirmingRemoval = profile.id"
          >
            Remove this child
          </button>
        </div>
      </li>
    </ul>

    <div v-if="adding" class="mt-4 space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1" for="bc-new-name">Name</label>
        <input
          id="bc-new-name"
          v-model="newName"
          type="text"
          maxlength="40"
          placeholder="Their name"
          class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
          :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="bc-new-dob">Birthday</label>
        <input
          id="bc-new-dob"
          v-model="newBirthDate"
          type="date"
          class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
          :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
        />
        <p class="text-xs bc-muted mt-1">This is all we need — their stage follows from it.</p>
      </div>
      <div class="flex gap-2">
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          :disabled="!canAdd"
          @click="add"
        >
          Add them
        </button>
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
          :style="{ borderColor: 'var(--bc-hairline)' }"
          @click="adding = false"
        >
          Cancel
        </button>
      </div>
    </div>
    <button
      v-else
      class="bc-tap mt-4 px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
      :style="{ borderColor: 'var(--bc-hairline)' }"
      @click="adding = true"
    >
      Add a child
    </button>
  </section>
</template>
