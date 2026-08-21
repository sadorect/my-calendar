/**
 * Ambient sound for the birth calendar.
 *
 * Synthesised with the Web Audio API rather than shipped as audio files: no
 * licensing, no megabytes in the bundle, nothing to fetch when offline, and it
 * loops forever without a seam — which a short sample never quite does.
 *
 * The graph is built against whatever AudioContext-shaped object is handed in,
 * so the shape of each soundscape can be tested with a stub instead of real
 * audio hardware.
 */

export const SOUNDSCAPES = [
  {
    id: 'womb',
    label: 'Womb',
    description: 'The muffled rush and heartbeat your baby actually hears.'
  },
  { id: 'rain', label: 'Rain', description: 'Soft rain against a window.' },
  { id: 'hum', label: 'Lullaby hum', description: 'A slow, wordless chord.' }
]

export const DEFAULT_SOUNDSCAPE = 'womb'

/** Seconds of fade. Long enough that starting or stopping never startles. */
export const FADE_SECONDS = 1.5

/**
 * Brown noise: each sample is a small random step from the last, which rolls
 * off the high frequencies the way a body does. White noise sounds like static;
 * this sounds like the inside of something.
 */
export function fillBrownNoise(channel, random = Math.random) {
  let last = 0
  for (let i = 0; i < channel.length; i++) {
    const white = random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    channel[i] = last * 3.5
  }
  return channel
}

/** Pink-ish noise for rain: brighter than brown, softer than white. */
export function fillPinkNoise(channel, random = Math.random) {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < channel.length; i++) {
    const white = random() * 2 - 1
    b0 = 0.99765 * b0 + white * 0.099046
    b1 = 0.963 * b1 + white * 0.2965164
    b2 = 0.57555 * b2 + white * 1.0526913
    channel[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2
  }
  return channel
}

/** A four-second loop is long enough that the repeat is inaudible. */
function noiseBuffer(ctx, fill) {
  const length = Math.floor(ctx.sampleRate * 4)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  fill(buffer.getChannelData(0))
  return buffer
}

function connectNoise(ctx, output, { fill, cutoff, gain, lfo }) {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx, fill)
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff

  const level = ctx.createGain()
  level.gain.value = gain

  source.connect(filter)
  filter.connect(level)
  level.connect(output)
  source.start()

  const nodes = [source, filter, level]

  // A slow swell, like breathing. Without it the noise reads as machinery.
  if (lfo) {
    const osc = ctx.createOscillator()
    osc.frequency.value = lfo.rate
    const depth = ctx.createGain()
    depth.gain.value = lfo.depth
    osc.connect(depth)
    depth.connect(level.gain)
    osc.start()
    nodes.push(osc, depth)
  }

  return nodes
}

/**
 * The heartbeat: two soft thumps, lub-dub, repeating at a resting maternal
 * rate. Scheduled with an interval rather than a looping buffer so the rate can
 * be changed later without rebuilding the graph.
 */
function startHeartbeat(ctx, output, { bpm = 72, gain = 0.5 } = {}) {
  function thump(at, strength) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(64, at)
    osc.frequency.exponentialRampToValueAtTime(38, at + 0.16)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(gain * strength, at + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)

    osc.connect(env)
    env.connect(output)
    osc.start(at)
    osc.stop(at + 0.3)
  }

  const period = 60 / bpm
  let next = ctx.currentTime + 0.1

  function schedule() {
    // Schedule a little ahead of real time so timer jitter never lands a beat
    // late; anything the ear would notice happens on the audio clock, not here.
    const horizon = ctx.currentTime + 2
    while (next < horizon) {
      thump(next, 1)
      thump(next + period * 0.32, 0.62)
      next += period
    }
  }

  schedule()
  const timer = setInterval(schedule, 1000)
  return () => clearInterval(timer)
}

/** A slow, wordless chord that drifts between two voicings. */
function startHum(ctx, output) {
  const nodes = []
  const chord = [110, 164.81, 220, 329.63]
  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    // Slight detune keeps it from sounding synthetic.
    osc.detune.value = i % 2 ? 4 : -4

    const level = ctx.createGain()
    level.gain.value = 0.06 / (i + 1)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05 + i * 0.017
    const depth = ctx.createGain()
    depth.gain.value = 0.03 / (i + 1)
    lfo.connect(depth)
    depth.connect(level.gain)

    osc.connect(level)
    level.connect(output)
    osc.start()
    lfo.start()
    nodes.push(osc, level, lfo, depth)
  })
  return nodes
}

/** Builds one soundscape onto `output`. Returns a teardown function. */
export function buildSoundscape(ctx, output, id) {
  const nodes = []
  let stopBeat = null

  if (id === 'rain') {
    nodes.push(
      ...connectNoise(ctx, output, {
        fill: fillPinkNoise,
        cutoff: 4200,
        gain: 0.5,
        lfo: { rate: 0.07, depth: 0.12 }
      })
    )
  } else if (id === 'hum') {
    nodes.push(...startHum(ctx, output))
  } else {
    // womb, and the fallback for anything unrecognised
    nodes.push(
      ...connectNoise(ctx, output, {
        fill: fillBrownNoise,
        cutoff: 480,
        gain: 0.85,
        lfo: { rate: 0.12, depth: 0.22 }
      })
    )
    stopBeat = startHeartbeat(ctx, output, { bpm: 72, gain: 0.35 })
  }

  return () => {
    stopBeat?.()
    for (const node of nodes) {
      try {
        node.stop?.()
      } catch {
        // Already stopped; nothing to do.
      }
      try {
        node.disconnect?.()
      } catch {
        // Already disconnected.
      }
    }
  }
}

export function isAudioSupported() {
  return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext)
}

/**
 * The player. One AudioContext for the life of the page — creating a new one
 * per play leaks contexts, and browsers cap how many a page may have.
 *
 * `play()` must be called from a user gesture; the context is resumed there.
 */
export function createAmbientPlayer({ createContext } = {}) {
  let ctx = null
  let master = null
  let teardown = null
  let current = null

  function ensureContext() {
    if (ctx) return ctx
    // `createContext` is a factory (used by tests); the browser globals are
    // constructors. Keeping them distinct avoids guessing from typeof, which
    // cannot tell the two apart.
    if (createContext) {
      ctx = createContext()
    } else {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (!ctx) return null
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    return ctx
  }

  function rampTo(value, seconds = FADE_SECONDS) {
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(value, now + seconds)
  }

  async function play(id = DEFAULT_SOUNDSCAPE, volume = 0.5) {
    if (!ensureContext()) return false
    if (ctx.state === 'suspended') await ctx.resume?.()
    if (current !== id) {
      teardown?.()
      teardown = buildSoundscape(ctx, master, id)
      current = id
    }
    rampTo(volume)
    return true
  }

  function setVolume(volume) {
    // Short ramp: a volume slider should feel immediate but never click.
    rampTo(volume, 0.15)
  }

  async function stop() {
    if (!ctx) return
    rampTo(0)
    // Let the fade finish before tearing the graph down, or it cuts off.
    await new Promise((resolve) => setTimeout(resolve, FADE_SECONDS * 1000))
    teardown?.()
    teardown = null
    current = null
  }

  return {
    play,
    stop,
    setVolume,
    get playing() {
      return current !== null
    },
    get soundscape() {
      return current
    },
    /** Releases the audio hardware. Call on unmount. */
    async dispose() {
      teardown?.()
      teardown = null
      current = null
      await ctx?.close?.()
      ctx = null
      master = null
    }
  }
}
