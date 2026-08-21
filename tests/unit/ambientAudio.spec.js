import { describe, it, expect, vi } from 'vitest'
import {
  fillBrownNoise,
  fillPinkNoise,
  buildSoundscape,
  createAmbientPlayer,
  SOUNDSCAPES,
  FADE_SECONDS
} from '../../src/services/ambientAudio.js'

/** A recording stand-in for an AudioContext, good enough to assert graph shape. */
function stubContext() {
  const created = []
  const started = []
  const stopped = []

  function param(value = 0) {
    return {
      value,
      calls: [],
      setValueAtTime(v, t) {
        this.calls.push(['setValueAtTime', v, t])
        this.value = v
      },
      linearRampToValueAtTime(v, t) {
        this.calls.push(['linearRamp', v, t])
        this.value = v
      },
      exponentialRampToValueAtTime(v, t) {
        this.calls.push(['expRamp', v, t])
      },
      cancelScheduledValues() {
        this.calls.push(['cancel'])
      }
    }
  }

  function node(kind, extra = {}) {
    const n = {
      kind,
      connections: [],
      connect(target) {
        this.connections.push(target)
      },
      disconnect: vi.fn(),
      ...extra
    }
    created.push(n)
    return n
  }

  const ctx = {
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    destination: { id: 'destination' },
    created,
    started,
    stopped,
    resume: vi.fn(async () => {
      ctx.state = 'running'
    }),
    close: vi.fn(async () => {}),
    createGain: () => node('gain', { gain: param(1) }),
    createBiquadFilter: () => node('filter', { frequency: param(350), Q: param(1) }),
    createOscillator: () =>
      node('oscillator', {
        frequency: param(440),
        detune: param(0),
        start: (t) => started.push(['oscillator', t]),
        stop: (t) => stopped.push(['oscillator', t])
      }),
    createBufferSource: () =>
      node('bufferSource', {
        loop: false,
        buffer: null,
        start: (t) => started.push(['bufferSource', t]),
        stop: (t) => stopped.push(['bufferSource', t])
      }),
    createBuffer: (channels, length) => ({
      length,
      getChannelData: () => new Float32Array(length)
    })
  }
  return ctx
}

describe('noise generators', () => {
  it('keeps brown noise inside the audible range and off centre-less silence', () => {
    const data = fillBrownNoise(new Float32Array(4096))
    let peak = 0
    let energy = 0
    for (const sample of data) {
      peak = Math.max(peak, Math.abs(sample))
      energy += sample * sample
    }
    expect(peak).toBeGreaterThan(0)
    expect(peak).toBeLessThanOrEqual(1)
    expect(energy).toBeGreaterThan(0)
  })

  it('is deterministic for a given random source, so it can be reasoned about', () => {
    const seeded = () => {
      let n = 1
      return () => {
        n = (n * 16807) % 2147483647
        return n / 2147483647
      }
    }
    const a = fillBrownNoise(new Float32Array(256), seeded())
    const b = fillBrownNoise(new Float32Array(256), seeded())
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('makes pink noise brighter than brown', () => {
    // Mean absolute sample-to-sample change is a decent proxy for brightness.
    const wiggle = (data) => {
      let total = 0
      for (let i = 1; i < data.length; i++) total += Math.abs(data[i] - data[i - 1])
      return total / data.length
    }
    const brown = wiggle(fillBrownNoise(new Float32Array(8192)))
    const pink = wiggle(fillPinkNoise(new Float32Array(8192)))
    expect(pink).toBeGreaterThan(brown)
  })
})

describe('buildSoundscape', () => {
  it('gives the womb a noise bed, a filter and a heartbeat', () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const out = ctx.createGain()
    const teardown = buildSoundscape(ctx, out, 'womb')

    expect(ctx.created.some((n) => n.kind === 'bufferSource')).toBe(true)
    expect(ctx.created.some((n) => n.kind === 'filter')).toBe(true)
    // Heartbeat thumps are oscillators scheduled ahead on the audio clock.
    const scheduled = ctx.started.filter(([type]) => type === 'oscillator')
    expect(scheduled.length).toBeGreaterThan(2)

    teardown()
    vi.useRealTimers()
  })

  it('builds rain without a heartbeat', () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const teardown = buildSoundscape(ctx, ctx.createGain(), 'rain')
    // The only oscillator in the rain graph is the slow swell LFO.
    expect(ctx.started.filter(([t]) => t === 'oscillator')).toHaveLength(1)
    teardown()
    vi.useRealTimers()
  })

  it('builds the hum from several detuned voices', () => {
    const ctx = stubContext()
    const teardown = buildSoundscape(ctx, ctx.createGain(), 'hum')
    expect(ctx.created.filter((n) => n.kind === 'oscillator').length).toBeGreaterThanOrEqual(8)
    expect(ctx.created.some((n) => n.kind === 'bufferSource')).toBe(false)
    teardown()
  })

  it('falls back to the womb for an unknown soundscape', () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const teardown = buildSoundscape(ctx, ctx.createGain(), 'not-a-sound')
    expect(ctx.created.some((n) => n.kind === 'bufferSource')).toBe(true)
    teardown()
    vi.useRealTimers()
  })

  it('tears everything down without throwing, even twice', () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const teardown = buildSoundscape(ctx, ctx.createGain(), 'womb')
    expect(() => {
      teardown()
      teardown()
    }).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('covers every soundscape offered in the UI', () => {
    vi.useFakeTimers()
    for (const sound of SOUNDSCAPES) {
      const ctx = stubContext()
      const teardown = buildSoundscape(ctx, ctx.createGain(), sound.id)
      expect(ctx.created.length, sound.id).toBeGreaterThan(0)
      teardown()
    }
    vi.useRealTimers()
  })
})

describe('createAmbientPlayer', () => {
  it('fades in rather than starting at full volume', async () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const player = createAmbientPlayer({ createContext: () => ctx })
    await player.play('womb', 0.6)

    const master = ctx.created.find((n) => n.kind === 'gain')
    const ramp = master.gain.calls.find(([kind]) => kind === 'linearRamp')
    expect(ramp).toEqual(['linearRamp', 0.6, FADE_SECONDS])
    expect(player.playing).toBe(true)
    vi.useRealTimers()
  })

  it('resumes a context suspended by autoplay policy', async () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    ctx.state = 'suspended'
    const player = createAmbientPlayer({ createContext: () => ctx })
    await player.play('rain', 0.4)
    expect(ctx.resume).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('reuses one context and rebuilds only when the soundscape changes', async () => {
    vi.useFakeTimers()
    let contexts = 0
    const ctx = stubContext()
    const player = createAmbientPlayer({
      createContext: () => {
        contexts++
        return ctx
      }
    })
    await player.play('rain', 0.5)
    const afterFirst = ctx.created.length
    await player.play('rain', 0.8)
    expect(ctx.created.length).toBe(afterFirst)
    await player.play('hum', 0.8)
    expect(ctx.created.length).toBeGreaterThan(afterFirst)
    expect(contexts).toBe(1)
    vi.useRealTimers()
  })

  it('fades out before tearing down, and reports it stopped', async () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const player = createAmbientPlayer({ createContext: () => ctx })
    await player.play('womb', 0.5)

    const stopping = player.stop()
    await vi.advanceTimersByTimeAsync(FADE_SECONDS * 1000 + 50)
    await stopping

    const master = ctx.created.find((n) => n.kind === 'gain')
    expect(master.gain.calls.some(([kind, value]) => kind === 'linearRamp' && value === 0)).toBe(
      true
    )
    expect(player.playing).toBe(false)
    vi.useRealTimers()
  })

  it('closes the audio hardware on dispose', async () => {
    vi.useFakeTimers()
    const ctx = stubContext()
    const player = createAmbientPlayer({ createContext: () => ctx })
    await player.play('hum', 0.5)
    await player.dispose()
    expect(ctx.close).toHaveBeenCalled()
    expect(player.playing).toBe(false)
    vi.useRealTimers()
  })
})
