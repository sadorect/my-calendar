/**
 * Sharing the app itself, and installing it.
 *
 * Two related jobs: give someone a link so they can visit and install it, and
 * — for the person who has just arrived — offer the install prompt directly
 * rather than making them find "Add to Home Screen" in a browser menu.
 *
 * The `beforeinstallprompt` listener is registered at module scope, not in a
 * component. Chrome fires that event once, early, and often before any
 * component has mounted; a listener added on mount would simply miss it.
 */
import { ref, readonly } from 'vue'

const deferredPrompt = ref(null)
const installed = ref(false)
let listening = false

function noteInstalled() {
  installed.value = true
  deferredPrompt.value = null
}

/** Call once, as early as possible — main.js does this before mounting. */
export function listenForInstallPrompt() {
  if (listening || typeof window === 'undefined') return
  listening = true

  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome shows its own mini-infobar unless this is prevented; we want the
    // prompt to happen on our button instead.
    event.preventDefault()
    deferredPrompt.value = event
  })

  window.addEventListener('appinstalled', noteInstalled)

  // Already running as an installed app: nothing to offer.
  if (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone) {
    installed.value = true
  }
}

/** The canonical URL to hand someone else. */
export function appUrl() {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/`
}

export function useShareApp() {
  const note = ref('')
  const busy = ref(false)

  function flash(message) {
    note.value = message
    setTimeout(() => (note.value = ''), 2400)
  }

  /**
   * Native share sheet where there is one, clipboard everywhere else. Both end
   * with the recipient holding a URL, which is the whole point.
   */
  async function share({ title = 'Birth Calendar', text } = {}) {
    if (busy.value) return
    busy.value = true
    const url = appUrl()
    const payload = {
      title,
      text: text || 'A calendar you can install on your phone — it works offline.',
      url
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
      await navigator.clipboard.writeText(url)
      flash('Link copied')
    } catch (e) {
      // Dismissing the sheet throws AbortError; that is not a failure.
      if (e?.name !== 'AbortError') flash('Could not share — copy the address bar')
    } finally {
      busy.value = false
    }
  }

  /** Shows the browser's install prompt, if it gave us one to show. */
  async function install() {
    const event = deferredPrompt.value
    if (!event) return false
    deferredPrompt.value = null
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice?.outcome === 'accepted') noteInstalled()
      return choice?.outcome === 'accepted'
    } catch {
      return false
    }
  }

  return {
    share,
    install,
    note: readonly(note),
    busy: readonly(busy),
    canInstall: readonly(deferredPrompt),
    installed: readonly(installed),
    appUrl
  }
}
