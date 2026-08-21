import { describe, it, expect } from 'vitest'
import {
  wrapText,
  fitText,
  drawDeclarationCard,
  cardFileName,
  CARD_WIDTH,
  CARD_HEIGHT
} from '../../src/services/declarationImage.js'

/**
 * A stub 2D context. Character-width measurement is crude but monotonic, which
 * is all the wrapping and fitting logic actually depends on — and it keeps the
 * test off a real canvas, which happy-dom does not provide.
 */
function stubContext() {
  const calls = []
  return {
    calls,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: '',
    textBaseline: '',
    measureText(text) {
      const size = Number(/(\d+)px/.exec(this.font)?.[1] || 16)
      return { width: text.length * size * 0.5 }
    },
    fillText(text, x, y) {
      calls.push({ op: 'fillText', text, x, y, font: this.font })
    },
    fillRect: () => calls.push({ op: 'fillRect' }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} })
  }
}

function stubCanvas() {
  const ctx = stubContext()
  return { width: 0, height: 0, getContext: () => ctx, ctx }
}

describe('wrapText', () => {
  it('breaks on words, never mid-word', () => {
    const ctx = stubContext()
    ctx.font = '40px serif'
    const lines = wrapText(ctx, 'Little one, you are known and you are wanted here', 400)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(ctx.measureText(line).width).toBeLessThanOrEqual(400)
    }
    expect(lines.join(' ')).toBe('Little one, you are known and you are wanted here')
  })

  it('keeps a single over-long word on its own line rather than looping', () => {
    const ctx = stubContext()
    ctx.font = '40px serif'
    const lines = wrapText(ctx, 'antidisestablishmentarianism', 50)
    expect(lines).toEqual(['antidisestablishmentarianism'])
  })

  it('preserves explicit line breaks', () => {
    const ctx = stubContext()
    ctx.font = '20px serif'
    expect(wrapText(ctx, 'one\ntwo', 1000)).toEqual(['one', 'two'])
  })
})

describe('fitText', () => {
  const opts = {
    maxWidth: 800,
    sizes: [44, 40, 36, 32, 28],
    font: (s) => `${s}px serif`
  }

  it('uses the largest size for short text', () => {
    const ctx = stubContext()
    expect(fitText(ctx, 'Wanted', { ...opts, maxHeight: 600 }).size).toBe(44)
  })

  it('shrinks long text to fit the space it is given', () => {
    const ctx = stubContext()
    const long = 'Little one, you are known and wanted. '.repeat(12)
    const big = fitText(ctx, long, { ...opts, maxHeight: 600 })
    const cramped = fitText(ctx, long, { ...opts, maxHeight: 120 })
    expect(cramped.size).toBeLessThan(big.size)
  })

  it('falls back to the smallest size rather than failing', () => {
    const ctx = stubContext()
    const huge = 'word '.repeat(500)
    const fitted = fitText(ctx, huge, { ...opts, maxHeight: 40 })
    expect(fitted.size).toBe(28)
    expect(fitted.lines.length).toBeGreaterThan(0)
  })
})

describe('drawDeclarationCard', () => {
  const content = {
    title: 'Known Before Time',
    body: 'Little one, before you were formed, you were known.',
    scripture: { ref: 'Jeremiah 1:5', text: 'Before I formed you in the womb I knew you.' }
  }

  it('sizes the canvas and draws every part of the card', () => {
    const canvas = stubCanvas()
    drawDeclarationCard(canvas, content, {
      dayLabel: 'Day 1',
      weekLabel: 'Week 1',
      palette: { from: '#FDF2F4', to: '#FCE7E9', accent: '#C9788A', ink: '#5C3742' },
      babyName: 'Ada'
    })

    expect(canvas.width).toBe(CARD_WIDTH)
    expect(canvas.height).toBe(CARD_HEIGHT)

    const drawn = canvas.ctx.calls.filter((c) => c.op === 'fillText').map((c) => c.text)
    expect(drawn).toContain('DAY 1  ·  WEEK 1')
    expect(drawn).toContain('Known Before Time')
    expect(drawn).toContain('Jeremiah 1:5')
    expect(drawn).toContain('Womb Whispers · for Ada')
    expect(drawn.join(' ')).toContain('before you were formed')
  })

  it('keeps every line inside the card', () => {
    const canvas = stubCanvas()
    drawDeclarationCard(canvas, { ...content, body: 'Little one, you are loved. '.repeat(20) }, {})
    for (const call of canvas.ctx.calls.filter((c) => c.op === 'fillText')) {
      expect(call.y).toBeGreaterThanOrEqual(0)
      expect(call.y).toBeLessThan(CARD_HEIGHT)
    }
  })

  it('drops the name from the footer when there is not one', () => {
    const canvas = stubCanvas()
    drawDeclarationCard(canvas, content, {})
    const drawn = canvas.ctx.calls.filter((c) => c.op === 'fillText').map((c) => c.text)
    expect(drawn).toContain('Womb Whispers')
  })

  it('survives a day with no scripture', () => {
    const canvas = stubCanvas()
    expect(() => drawDeclarationCard(canvas, { title: 'A day', body: 'Words.' }, {})).not.toThrow()
  })
})

describe('cardFileName', () => {
  it('slugs the label into a safe png name', () => {
    expect(cardFileName('day-143')).toBe('womb-whispers-day-143.png')
    expect(cardFileName('Day 143 · Week 21')).toBe('womb-whispers-day-143-week-21.png')
    expect(cardFileName('')).toBe('womb-whispers-declaration.png')
  })
})
