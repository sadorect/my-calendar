/**
 * Sync session and orchestration.
 *
 * Module-level state, like the ambient player: there is one account signed in
 * per browser, and two components showing contradictory sync status would be
 * worse than none.
 *
 * The push protocol is compare-and-set. A push names the revision it was based
 * on; if the server has moved on, it hands back its copy, we merge locally and
 * try once more. One retry, not a loop — a second conflict means something is
 * writing continuously and hammering it would make that worse.
 */
import { ref, computed } from 'vue'
import { getSetting, setSetting } from '../services/database.js'
import { usePregnancyStore } from '../stores/pregnancy.js'
import { mergeStates, statesDiffer } from '../services/mergeState.js'
import {
  isSyncConfigured,
  signIn as apiSignIn,
  fetchVault,
  pushVault,
  decryptConflict,
  deleteAccount as apiDeleteAccount
} from '../services/syncClient.js'

const SESSION_KEY = 'birthCalendarSync'

const session = ref(null) // { email, token, encKey }
const revision = ref(0)
const status = ref('idle') // idle | syncing | error
const lastSyncedAt = ref(null)
const error = ref('')
const restored = ref(false)

/** Coalesces bursts of edits into one push. */
let pushTimer = null

export function useSync() {
  const store = usePregnancyStore()

  const configured = isSyncConfigured()
  const signedIn = computed(() => Boolean(session.value?.token))
  const email = computed(() => session.value?.email || '')

  async function saveSession(value) {
    session.value = value
    // The CryptoKey is non-extractable and structured-cloneable, so IndexedDB
    // can hold it: staying signed in never means storing the password, and the
    // key itself cannot be read back out as bytes.
    await setSetting(SESSION_KEY, value ? { ...value, revision: revision.value } : null)
  }

  /** Restores a session from a previous visit. Safe to call more than once. */
  async function restore() {
    if (restored.value || !configured) return
    restored.value = true
    const saved = await getSetting(SESSION_KEY)
    if (saved?.token && saved?.encKey) {
      session.value = { email: saved.email, token: saved.token, encKey: saved.encKey }
      revision.value = saved.revision || 0
    }
  }

  function fail(e) {
    status.value = 'error'
    error.value = e?.message || 'Sync failed.'
    if (e?.code === 'unauthorised') {
      // The token is gone or expired; nothing works until they sign in again.
      session.value = null
      setSetting(SESSION_KEY, null)
    }
    return false
  }

  /**
   * Pull, merge, push. This is the only path that writes to the server, so
   * there is exactly one place where a conflict can be resolved.
   */
  async function syncNow({ silent = false } = {}) {
    if (!signedIn.value) return false
    if (status.value === 'syncing') return false
    status.value = 'syncing'
    if (!silent) error.value = ''

    try {
      const remote = await fetchVault(session.value)
      revision.value = remote.revision

      const local = JSON.parse(JSON.stringify(store.state))
      const merged = remote.state ? mergeStates(local, remote.state) : local

      // Apply the merge locally first. If the push then fails, the device still
      // has everything from both sides rather than only its own half.
      if (remote.state && statesDiffer(store.state, merged)) {
        await store.applyState(merged)
      }

      if (!remote.state || statesDiffer(remote.state, merged)) {
        try {
          const pushed = await pushVault({
            ...session.value,
            state: merged,
            baseRevision: revision.value
          })
          revision.value = pushed.revision
        } catch (e) {
          if (e?.code !== 'conflict') throw e
          // Another device wrote between our read and our write. Merge on top
          // of what it left and try once.
          const theirs = await decryptConflict(session.value.encKey, e.vault)
          const remerged = mergeStates(merged, theirs.state)
          await store.applyState(remerged)
          const pushed = await pushVault({
            ...session.value,
            state: remerged,
            baseRevision: theirs.revision
          })
          revision.value = pushed.revision
        }
      }

      lastSyncedAt.value = new Date().toISOString()
      status.value = 'idle'
      await saveSession(session.value)
      return true
    } catch (e) {
      return fail(e)
    }
  }

  /** Debounced push, for calling on every local change. */
  function scheduleSync(delay = 4000) {
    if (!signedIn.value) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => syncNow({ silent: true }), delay)
  }

  async function signIn({ email: address, password, register = false }) {
    status.value = 'syncing'
    error.value = ''
    try {
      const result = await apiSignIn({ email: address, password, register })
      revision.value = 0
      await saveSession({ email: result.email, token: result.token, encKey: result.encKey })
      status.value = 'idle'
      await syncNow()
      return true
    } catch (e) {
      return fail(e)
    }
  }

  /** Signs out of this device only. Local data is untouched. */
  async function signOut() {
    clearTimeout(pushTimer)
    revision.value = 0
    lastSyncedAt.value = null
    status.value = 'idle'
    error.value = ''
    await saveSession(null)
  }

  /** Deletes the account and everything stored on the server. Local data stays. */
  async function deleteRemote() {
    if (!signedIn.value) return false
    try {
      await apiDeleteAccount(session.value)
      await signOut()
      return true
    } catch (e) {
      return fail(e)
    }
  }

  return {
    configured,
    signedIn,
    email,
    status,
    error,
    lastSyncedAt,
    revision,
    restore,
    signIn,
    signOut,
    syncNow,
    scheduleSync,
    deleteRemote
  }
}
