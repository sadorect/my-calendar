/**
 * One ambient player for the whole app.
 *
 * Module-level rather than per-component: the control on the Today screen and
 * the one in Settings must drive the same sound, and a second AudioContext per
 * component would leak (browsers cap how many a page may hold).
 */
import { ref } from 'vue'
import {
  createAmbientPlayer,
  isAudioSupported,
  DEFAULT_SOUNDSCAPE
} from '../services/ambientAudio.js'

let player = null

const playing = ref(false)
const busy = ref(false)
const soundscape = ref(DEFAULT_SOUNDSCAPE)

export function useAmbient() {
  const supported = isAudioSupported()

  function ensure() {
    if (!player && supported) player = createAmbientPlayer()
    return player
  }

  async function play(id, volume) {
    const p = ensure()
    if (!p || busy.value) return false
    busy.value = true
    try {
      const ok = await p.play(id, volume)
      playing.value = ok
      soundscape.value = id
      return ok
    } finally {
      busy.value = false
    }
  }

  async function stop() {
    if (!player || busy.value) return
    busy.value = true
    // Flip the flag first: the fade takes over a second and the button must not
    // sit there still saying "Playing".
    playing.value = false
    try {
      await player.stop()
    } finally {
      busy.value = false
    }
  }

  async function toggle(id, volume) {
    if (playing.value) await stop()
    else await play(id, volume)
  }

  function setVolume(volume) {
    player?.setVolume(volume)
  }

  /** Switches sound without stopping, so the change is seamless. */
  async function change(id, volume) {
    soundscape.value = id
    if (playing.value) await play(id, volume)
  }

  return { supported, playing, busy, soundscape, play, stop, toggle, setVolume, change }
}
