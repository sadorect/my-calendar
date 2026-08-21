/**
 * Renders a declaration as a shareable image card.
 *
 * Drawn on a canvas rather than rasterised from DOM: no dependency, no fonts to
 * fetch, and the output is identical on every device — which matters, because
 * these get sent to family and saved as keepsakes.
 *
 * The layout is deliberately typographic and vertically centred. Text length
 * varies a lot between days, so nothing is positioned absolutely; every block is
 * measured, then the whole column is centred as one.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
const MARGIN = 96

/**
 * Greedy word wrap. Pure apart from `ctx.measureText`, so it can be tested with
 * a stub context rather than a real canvas.
 */
export function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

/**
 * Picks the largest size in `sizes` whose wrapped text fits `maxHeight`, so a
 * long declaration shrinks to fit instead of overflowing the card.
 */
export function fitText(ctx, text, { maxWidth, maxHeight, sizes, font, lineHeightRatio = 1.45 }) {
  let chosen = { size: sizes[sizes.length - 1], lines: [], lineHeight: 0 }
  for (const size of sizes) {
    ctx.font = font(size)
    const lines = wrapText(ctx, text, maxWidth)
    const lineHeight = size * lineHeightRatio
    chosen = { size, lines, lineHeight }
    if (lines.length * lineHeight <= maxHeight) return chosen
  }
  return chosen
}

function serif(size, style = '') {
  return `${style} ${size}px Georgia, "Iowan Old Style", "Times New Roman", serif`.trim()
}

function sans(size, style = '') {
  return `${style} ${size}px "Helvetica Neue", Arial, sans-serif`.trim()
}

/** Semi-transparent version of a hex colour, for hairlines over a gradient. */
function withAlpha(hex, alpha) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!match) return `rgba(0,0,0,${alpha})`
  const n = parseInt(match[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/**
 * Draws the card. Returns the canvas so callers can choose blob, data URL or
 * direct display.
 *
 * @param {object} content  { title, body, scripture: { ref, text } }
 * @param {object} meta     { dayLabel, weekLabel, palette, babyName }
 */
export function drawDeclarationCard(canvas, content, meta = {}) {
  const palette = meta.palette || {}
  const accent = palette.accent || '#C9788A'
  const ink = palette.ink || '#4A3540'

  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH * 0.4, CARD_HEIGHT)
  bg.addColorStop(0, palette.from || '#FDF2F4')
  bg.addColorStop(1, palette.to || '#FCE7E9')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const maxWidth = CARD_WIDTH - MARGIN * 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Measure everything first, then centre the column as a whole.
  const title = fitText(ctx, content.title || '', {
    maxWidth,
    maxHeight: 200,
    sizes: [72, 64, 56, 48],
    font: (s) => serif(s),
    lineHeightRatio: 1.2
  })
  const body = fitText(ctx, content.body || '', {
    maxWidth,
    maxHeight: 620,
    sizes: [44, 40, 36, 32, 28],
    font: (s) => serif(s)
  })
  const scriptureText = content.scripture?.text ? `“${content.scripture.text}”` : ''
  const scripture = fitText(ctx, scriptureText, {
    maxWidth: maxWidth - 60,
    maxHeight: 300,
    sizes: [32, 28, 26, 24],
    font: (s) => serif(s, 'italic'),
    lineHeightRatio: 1.4
  })

  const GAP = 56
  const refHeight = content.scripture?.ref ? 34 : 0
  const totalHeight =
    title.lines.length * title.lineHeight +
    GAP +
    body.lines.length * body.lineHeight +
    GAP +
    scripture.lines.length * scripture.lineHeight +
    (refHeight ? 20 + refHeight : 0)

  let y = Math.max(MARGIN + 90, (CARD_HEIGHT - totalHeight) / 2)

  // Eyebrow: "Day 143 · Week 21"
  const eyebrow = [meta.dayLabel, meta.weekLabel].filter(Boolean).join('  ·  ')
  if (eyebrow) {
    ctx.font = sans(24)
    ctx.fillStyle = withAlpha(accent, 0.95)
    ctx.fillText(eyebrow.toUpperCase(), CARD_WIDTH / 2, y - 70)
  }

  ctx.fillStyle = ink
  ctx.font = serif(title.size)
  for (const line of title.lines) {
    ctx.fillText(line, CARD_WIDTH / 2, y)
    y += title.lineHeight
  }

  y += GAP
  ctx.font = serif(body.size)
  ctx.fillStyle = withAlpha(ink, 0.92)
  for (const line of body.lines) {
    ctx.fillText(line, CARD_WIDTH / 2, y)
    y += body.lineHeight
  }

  if (scripture.lines.length) {
    y += GAP
    // A short accent rule instead of a quotation block, which reads better at
    // thumbnail size in a chat app.
    ctx.strokeStyle = withAlpha(accent, 0.6)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CARD_WIDTH / 2 - 60, y - GAP / 2)
    ctx.lineTo(CARD_WIDTH / 2 + 60, y - GAP / 2)
    ctx.stroke()

    ctx.font = serif(scripture.size, 'italic')
    ctx.fillStyle = withAlpha(ink, 0.85)
    for (const line of scripture.lines) {
      ctx.fillText(line, CARD_WIDTH / 2, y)
      y += scripture.lineHeight
    }

    if (content.scripture?.ref) {
      y += 20
      ctx.font = sans(26)
      ctx.fillStyle = accent
      ctx.fillText(content.scripture.ref, CARD_WIDTH / 2, y)
    }
  }

  // Footer
  ctx.font = sans(24)
  ctx.fillStyle = withAlpha(ink, 0.55)
  const footer = meta.babyName ? `Womb Whispers · for ${meta.babyName}` : 'Womb Whispers'
  ctx.fillText(footer, CARD_WIDTH / 2, CARD_HEIGHT - MARGIN)

  return canvas
}

/** Renders to a PNG blob. Rejects if the browser cannot produce one. */
export function declarationCardBlob(content, meta) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    drawDeclarationCard(canvas, content, meta)
    if (!canvas.toBlob) {
      reject(new Error('Canvas export is not supported here'))
      return
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not render the card'))
    }, 'image/png')
  })
}

export function cardFileName(dayLabel) {
  const slug = String(dayLabel || 'declaration')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `womb-whispers-${slug || 'declaration'}.png`
}

/** True when this browser can put an image file into the native share sheet. */
export function canShareImage() {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    const probe = new File([new Blob([''], { type: 'image/png' })], 'probe.png', {
      type: 'image/png'
    })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}
