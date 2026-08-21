<script setup>
import { computed, onMounted, ref } from 'vue'
import { useSync } from '../../composables/useSync.js'

const {
  configured,
  signedIn,
  email,
  status,
  error,
  lastSyncedAt,
  restore,
  signIn,
  signOut,
  syncNow,
  deleteRemote
} = useSync()

const mode = ref('signin') // 'signin' | 'register'
const form = ref({ email: '', password: '', confirm: '' })
const confirmingDelete = ref(false)
const acknowledged = ref(false)

onMounted(restore)

const busy = computed(() => status.value === 'syncing')

const passwordMismatch = computed(
  () =>
    mode.value === 'register' && form.value.confirm && form.value.password !== form.value.confirm
)

const canSubmit = computed(() => {
  if (busy.value) return false
  if (!form.value.email.trim() || form.value.password.length < 10) return false
  if (mode.value === 'register') return acknowledged.value && !passwordMismatch.value
  return true
})

const lastSyncedLabel = computed(() => {
  if (!lastSyncedAt.value) return 'Not synced yet'
  const when = new Date(lastSyncedAt.value)
  return `Last synced ${when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
})

async function submit() {
  if (!canSubmit.value) return
  const ok = await signIn({
    email: form.value.email,
    password: form.value.password,
    register: mode.value === 'register'
  })
  if (ok) form.value = { email: '', password: '', confirm: '' }
}

async function confirmDelete() {
  await deleteRemote()
  confirmingDelete.value = false
}
</script>

<template>
  <section v-if="configured" class="bc-card p-5">
    <h2 class="font-medium mb-1">Sync across devices</h2>

    <!-- Signed in -->
    <template v-if="signedIn">
      <p class="text-sm bc-muted mb-4">Signed in as {{ email }}. {{ lastSyncedLabel }}.</p>
      <div class="flex flex-wrap gap-2">
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          :disabled="busy"
          @click="syncNow()"
        >
          {{ busy ? 'Syncing…' : 'Sync now' }}
        </button>
        <button
          class="bc-tap px-4 py-2.5 rounded-xl text-sm border transition hover:opacity-70"
          :style="{ borderColor: 'var(--bc-hairline)' }"
          :disabled="busy"
          @click="signOut"
        >
          Sign out
        </button>
        <button
          v-if="!confirmingDelete"
          class="bc-tap px-4 py-2.5 rounded-xl text-sm transition hover:opacity-70 ml-auto"
          style="color: #b4413c"
          @click="confirmingDelete = true"
        >
          Delete from server
        </button>
        <template v-else>
          <button
            class="bc-tap px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style="background-color: #b4413c"
            @click="confirmDelete"
          >
            Yes, delete the copy on the server
          </button>
          <button
            class="bc-tap px-4 py-2.5 rounded-xl text-sm border"
            :style="{ borderColor: 'var(--bc-hairline)' }"
            @click="confirmingDelete = false"
          >
            Cancel
          </button>
        </template>
      </div>
      <p class="text-xs bc-muted mt-3">
        Everything is encrypted on this device before it is sent. The server stores what it cannot
        read.
      </p>
    </template>

    <!-- Signed out -->
    <template v-else>
      <p class="text-sm bc-muted mb-4">
        Optional. Keep your due date, notes and favourites on your own server so a second phone or a
        new device picks up where you left off.
      </p>

      <div
        class="flex gap-1 p-1 rounded-2xl mb-4"
        :style="{ backgroundColor: 'var(--bc-hairline)' }"
      >
        <button
          v-for="option in [
            { id: 'signin', label: 'Sign in' },
            { id: 'register', label: 'Create account' }
          ]"
          :key="option.id"
          class="bc-tap flex-1 rounded-xl text-sm transition"
          :style="{
            backgroundColor: mode === option.id ? 'var(--bc-surface-solid)' : 'transparent',
            fontWeight: mode === option.id ? 600 : 400
          }"
          @click="mode = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <label class="block">
          <span class="text-sm block mb-1">Email</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            class="bc-tap w-full px-4 py-2.5 rounded-xl border bg-transparent"
            :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          />
        </label>

        <label class="block">
          <span class="text-sm block mb-1">Password</span>
          <input
            v-model="form.password"
            type="password"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            required
            minlength="10"
            class="bc-tap w-full px-4 py-2.5 rounded-xl border bg-transparent"
            :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          />
        </label>

        <label v-if="mode === 'register'" class="block">
          <span class="text-sm block mb-1">Confirm password</span>
          <input
            v-model="form.confirm"
            type="password"
            autocomplete="new-password"
            required
            class="bc-tap w-full px-4 py-2.5 rounded-xl border bg-transparent"
            :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
          />
          <span v-if="passwordMismatch" class="text-xs mt-1 block" style="color: #b4413c">
            The passwords do not match.
          </span>
        </label>

        <!-- The one thing nobody can fix for them later. -->
        <label v-if="mode === 'register'" class="flex items-start gap-3 text-sm">
          <input v-model="acknowledged" type="checkbox" class="mt-1" />
          <span class="bc-muted leading-relaxed">
            I understand that my password is the key to my data. It is never sent to the server, so
            if I forget it, what is stored there cannot be recovered by anyone.
          </span>
        </label>

        <button
          type="submit"
          class="bc-tap w-full px-4 py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
          :style="{ backgroundColor: 'var(--bc-accent)' }"
          :disabled="!canSubmit"
        >
          {{ busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in' }}
        </button>
      </form>
    </template>

    <p v-if="error" class="text-sm mt-3" style="color: #b4413c" role="alert">{{ error }}</p>
  </section>
</template>
