<script setup>
import { computed, onMounted, ref } from 'vue'
import { usePregnancyStore } from '../../stores/pregnancy.js'
import { contentCoverage } from '../../data/pregnancy/index.js'
import { storageIsPersisted, requestPersistentStorage } from '../../services/biometric.js'

const store = usePregnancyStore()
const coverage = contentCoverage()
const confirmingReset = ref(false)
const persisted = ref(false)
const lockBusy = ref(false)

onMounted(async () => {
  await store.detectBiometric()
  persisted.value = await storageIsPersisted()
})

async function toggleLock() {
  lockBusy.value = true
  if (store.lockEnabled) {
    await store.disableAppLock()
  } else {
    await store.enableAppLock(store.state.babyName || 'This device')
  }
  persisted.value = await storageIsPersisted()
  lockBusy.value = false
}

async function makePersistent() {
  persisted.value = await requestPersistentStorage()
}

const dueInput = computed({
  get: () => (store.dueDate ? store.dueDate.toISOString().slice(0, 10) : ''),
  set: (v) => v && store.setDueDate(v),
})

const settings = computed(() => store.state.settings)

async function set(key, value) {
  await store.updateSettings({ [key]: value })
}

async function doReset() {
  await store.reset()
  confirmingReset.value = false
}
</script>

<template>
  <div class="px-5 py-6 max-w-2xl mx-auto space-y-4">
    <h1 class="font-serif text-2xl mb-2">Settings</h1>

    <!-- Which calendar opens on launch -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Default view</h2>
      <p class="text-sm bc-muted mb-4">Which calendar opens when you launch the app.</p>
      <div class="flex gap-1 p-1 rounded-2xl" :style="{ backgroundColor: 'var(--bc-hairline)' }">
        <button
          v-for="opt in [
            { id: 'standard', label: 'Standard calendar' },
            { id: 'birth', label: 'Birth calendar' },
          ]"
          :key="opt.id"
          class="bc-tap flex-1 px-3 py-2 rounded-xl text-sm font-medium transition"
          :aria-pressed="settings.defaultMode === opt.id"
          :style="
            settings.defaultMode === opt.id
              ? { backgroundColor: 'var(--bc-surface-solid)', color: 'var(--bc-accent)' }
              : { color: 'var(--bc-muted)' }
          "
          @click="set('defaultMode', opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- Voice -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Voice</h2>
      <p class="text-sm bc-muted mb-4">
        Some declarations are written twice so they sit naturally with whoever is speaking them.
      </p>
      <div class="flex gap-1 p-1 rounded-2xl" :style="{ backgroundColor: 'var(--bc-hairline)' }">
        <button
          v-for="opt in [
            { id: 'parents', label: 'Together' },
            { id: 'partner', label: 'For partners' },
          ]"
          :key="opt.id"
          class="bc-tap flex-1 px-3 py-2 rounded-xl text-sm font-medium transition"
          :aria-pressed="settings.voice === opt.id"
          :style="
            settings.voice === opt.id
              ? { backgroundColor: 'var(--bc-surface-solid)', color: 'var(--bc-accent)' }
              : { color: 'var(--bc-muted)' }
          "
          @click="set('voice', opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <!-- Timeline -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Due date</h2>
      <p class="text-sm bc-muted mb-4">Everything else follows from this.</p>
      <input
        v-model="dueInput"
        type="date"
        class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
        :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
      />
      <label class="block text-sm font-medium mt-4 mb-2" for="bc-set-name">Baby's name</label>
      <input
        id="bc-set-name"
        :value="store.state.babyName"
        type="text"
        maxlength="40"
        placeholder="Little one"
        class="bc-tap w-full px-4 py-3 rounded-xl border bg-transparent"
        :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
        @change="store.setBabyName($event.target.value)"
      />
    </section>

    <!-- Reading -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-4">Reading</h2>

      <label class="flex items-center justify-between gap-4 mb-4">
        <span class="text-sm">Text size</span>
        <input
          type="range" min="0.9" max="1.4" step="0.1"
          :value="settings.fontScale"
          class="w-40"
          @input="set('fontScale', Number($event.target.value))"
        />
      </label>

      <label class="flex items-center justify-between gap-4">
        <span class="text-sm">
          High contrast
          <span class="block text-xs bc-muted">Removes gradients and translucency.</span>
        </span>
        <button
          class="bc-tap relative w-12 h-7 rounded-full transition shrink-0"
          role="switch"
          :aria-checked="settings.highContrast"
          :style="{ backgroundColor: settings.highContrast ? 'var(--bc-accent)' : 'var(--bc-hairline)' }"
          @click="set('highContrast', !settings.highContrast)"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
            :style="{ left: settings.highContrast ? '1.625rem' : '0.25rem' }"
          />
        </button>
      </label>
    </section>

    <!-- Reminders -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Daily reminder</h2>
      <p class="text-sm bc-muted mb-4">
        A gentle nudge with the day's declaration.
      </p>
      <label class="flex items-center justify-between gap-4 mb-4">
        <span class="text-sm">Enabled</span>
        <button
          class="bc-tap relative w-12 h-7 rounded-full transition shrink-0"
          role="switch"
          :aria-checked="settings.remindersEnabled"
          :style="{ backgroundColor: settings.remindersEnabled ? 'var(--bc-accent)' : 'var(--bc-hairline)' }"
          @click="set('remindersEnabled', !settings.remindersEnabled)"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
            :style="{ left: settings.remindersEnabled ? '1.625rem' : '0.25rem' }"
          />
        </button>
      </label>
      <label class="flex items-center justify-between gap-4">
        <span class="text-sm">Time</span>
        <input
          type="time"
          :value="settings.reminderTime"
          class="bc-tap px-4 py-2 rounded-xl border bg-transparent"
          :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          @change="set('reminderTime', $event.target.value)"
        />
      </label>
    </section>

    <!-- Privacy / biometric lock -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Lock with biometrics</h2>
      <p class="text-sm bc-muted mb-4">
        Require Face ID, Touch ID or your fingerprint before your notes and
        declarations are shown.
      </p>

      <p v-if="!store.biometricAvailable" class="text-sm bc-muted italic">
        This device does not offer a built-in biometric check, so the lock is unavailable here.
      </p>

      <template v-else>
        <label class="flex items-center justify-between gap-4">
          <span class="text-sm">Biometric lock</span>
          <button
            class="bc-tap relative w-12 h-7 rounded-full transition shrink-0 disabled:opacity-50"
            role="switch"
            :aria-checked="store.lockEnabled"
            :disabled="lockBusy"
            :style="{ backgroundColor: store.lockEnabled ? 'var(--bc-accent)' : 'var(--bc-hairline)' }"
            @click="toggleLock"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
              :style="{ left: store.lockEnabled ? '1.625rem' : '0.25rem' }"
            />
          </button>
        </label>

        <p v-if="store.lockError" class="text-sm mt-3" :style="{ color: 'var(--bc-accent)' }" role="alert">
          {{ store.lockError }}
        </p>

        <p class="text-xs bc-muted mt-4 leading-relaxed">
          This locks the screen, it does not encrypt your notes. It is as strong as
          your device's own screen lock — enough to stop someone picking up your
          phone and reading your journal.
        </p>
      </template>
    </section>

    <!-- Installed-app persistence -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Keep my data</h2>
      <p class="text-sm bc-muted mb-4">
        Browsers may clear storage when space runs low. Marking this app as
        persistent stops your due date, notes and favourites being cleared.
      </p>
      <p v-if="persisted" class="text-sm bc-accent">Storage is persistent on this device.</p>
      <button
        v-else
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        @click="makePersistent"
      >
        Make storage persistent
      </button>
    </section>

    <!-- Honest about what is written -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-2">About</h2>
      <p class="text-sm bc-muted leading-relaxed">
        {{ coverage.daysWritten }} of {{ coverage.daysTotal }} daily declarations are written
        (Months 1–{{ coverage.monthsWritten }}). The remaining months have their theme and
        Scripture in place and will show a gentle placeholder until their words are added.
      </p>
      <p class="text-sm bc-muted leading-relaxed mt-3">
        Everything you save — favourites, notes, progress — stays on this device.
      </p>
    </section>

    <!-- Reset -->
    <section class="bc-card p-5">
      <h2 class="font-medium mb-1">Reset</h2>
      <p class="text-sm bc-muted mb-4">
        Clears your due date, favourites, notes and progress. This cannot be undone.
      </p>
      <button
        v-if="!confirmingReset"
        class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
        :style="{ borderColor: 'var(--bc-hairline)' }"
        @click="confirmingReset = true"
      >
        Reset birth calendar
      </button>
      <div v-else class="flex gap-2">
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 transition"
          @click="doReset"
        >
          Yes, erase everything
        </button>
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
          :style="{ borderColor: 'var(--bc-hairline)' }"
          @click="confirmingReset = false"
        >
          Cancel
        </button>
      </div>
    </section>
  </div>
</template>
