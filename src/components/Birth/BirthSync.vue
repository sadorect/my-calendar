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
const revealed = ref({ password: false, confirm: false })

/**
 * Long, because it is the encryption key and not merely a login: it is stretched
 * into the key that protects the vault, and nobody can reset it. Stated on the
 * form rather than enforced silently — a disabled button that will not say why
 * is not a password policy, it is a puzzle.
 */
const MIN_PASSWORD = 10

onMounted(restore)

const busy = computed(() => status.value === 'syncing')

const passwordMismatch = computed(
  () =>
    mode.value === 'register' && form.value.confirm && form.value.password !== form.value.confirm
)

const canSubmit = computed(() => !blockedReason.value)

/**
 * Why the button is disabled, in the user's words. Only ever shown once they
 * have started filling the form in, so an untouched form is not scolded.
 */
const blockedReason = computed(() => {
  if (busy.value) return 'Please wait…'
  if (!form.value.email.trim()) return 'Enter your email address.'
  if (form.value.password.length < MIN_PASSWORD) {
    return `Your password needs at least ${MIN_PASSWORD} characters.`
  }
  if (mode.value === 'register') {
    if (passwordMismatch.value || !form.value.confirm) return 'Confirm your password.'
    if (!acknowledged.value) return 'Tick the box to confirm you understand.'
  }
  return ''
})

const showBlockedReason = computed(
  () => Boolean(blockedReason.value) && Boolean(form.value.email || form.value.password)
)

function toggleReveal(field) {
  revealed.value[field] = !revealed.value[field]
}

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
  if (ok) {
    form.value = { email: '', password: '', confirm: '' }
    revealed.value = { password: false, confirm: false }
  }
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

        <div>
          <!-- The reveal button sits outside the <label>: nested inside it, its
               text would become part of the field's accessible name. -->
          <label for="sync-password" class="text-sm block mb-1">Password</label>
          <div class="relative">
            <input
              id="sync-password"
              v-model="form.password"
              :type="revealed.password ? 'text' : 'password'"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              required
              :minlength="MIN_PASSWORD"
              aria-describedby="sync-password-hint"
              class="bc-tap w-full pl-4 pr-16 py-2.5 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-xs font-medium"
              :style="{ color: 'var(--bc-accent)' }"
              :aria-pressed="revealed.password"
              :aria-label="revealed.password ? 'Hide password' : 'Show password'"
              @click="toggleReveal('password')"
            >
              {{ revealed.password ? 'Hide' : 'Show' }}
            </button>
          </div>
          <p id="sync-password-hint" class="text-xs bc-muted mt-1">
            At least {{ MIN_PASSWORD }} characters.
            <template v-if="mode === 'register'">
              A phrase you will remember is better than a short, clever one — it is the key to your
              data, and it cannot be reset.
            </template>
          </p>
        </div>

        <div v-if="mode === 'register'">
          <label for="sync-confirm" class="text-sm block mb-1">Confirm password</label>
          <div class="relative">
            <input
              id="sync-confirm"
              v-model="form.confirm"
              :type="revealed.confirm ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="bc-tap w-full pl-4 pr-16 py-2.5 rounded-xl border bg-transparent"
              :style="{ borderColor: 'var(--bc-hairline)', color: 'var(--bc-ink)' }"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-xs font-medium"
              :style="{ color: 'var(--bc-accent)' }"
              :aria-pressed="revealed.confirm"
              :aria-label="revealed.confirm ? 'Hide confirmed password' : 'Show confirmed password'"
              @click="toggleReveal('confirm')"
            >
              {{ revealed.confirm ? 'Hide' : 'Show' }}
            </button>
          </div>
          <span v-if="passwordMismatch" class="text-xs mt-1 block" style="color: #b4413c">
            The passwords do not match.
          </span>
        </div>

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

        <!-- Says what is still missing rather than leaving a dead button. -->
        <p v-if="showBlockedReason" class="text-xs bc-muted text-center" aria-live="polite">
          {{ blockedReason }}
        </p>
      </form>
    </template>

    <p v-if="error" class="text-sm mt-3" style="color: #b4413c" role="alert">{{ error }}</p>
  </section>
</template>
