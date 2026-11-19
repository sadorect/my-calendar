import { ref } from 'vue'
import { watchById } from '../data/prayerWatches.js'

/**
 * A prayer watch asked for from outside the app — a tapped reminder, or a link
 * from the phone's calendar (`?watch=w3`). App.vue sets it and switches to the
 * birth calendar; BirthCalendar.vue opens the watch and clears it.
 */
export const pendingWatch = ref(null)

/** Reads `watch` from a URL (string or URL) and queues it. True if it did. */
export function queueWatchFromUrl(url) {
  try {
    const id = new URL(url, window.location.origin).searchParams.get('watch')
    if (!watchById(id)) return false
    pendingWatch.value = id
    return true
  } catch {
    return false
  }
}
