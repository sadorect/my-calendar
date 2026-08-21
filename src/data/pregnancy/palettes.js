/**
 * One soft palette per month, so moving through the pregnancy feels like moving
 * through a day. Each is a pair of gradient stops plus an accent used for the
 * progress ring and active states.
 *
 * Values are plain CSS colours rather than Tailwind classes because they are
 * interpolated into gradients at runtime; Tailwind cannot see dynamic classes.
 */
export const PALETTES = {
  dawn: { from: '#FDF2F4', to: '#FCE7E9', accent: '#C9788A', ink: '#5C3742', darkFrom: '#2A1F24', darkTo: '#3A2A31' },
  blush: { from: '#FDF1F6', to: '#F8E4EF', accent: '#C2789F', ink: '#5A3549', darkFrom: '#2A1D26', darkTo: '#3B2A34' },
  meadow: { from: '#F1F7F1', to: '#E3F0E5', accent: '#6E9E77', ink: '#314635', darkFrom: '#1C241D', darkTo: '#2A362C' },
  amber: { from: '#FDF6EC', to: '#F9EAD5', accent: '#C08F44', ink: '#584327', darkFrom: '#282115', darkTo: '#372D1E' },
  ocean: { from: '#EFF5FA', to: '#DFEBF5', accent: '#5D8CAE', ink: '#2E4353', darkFrom: '#19222A', darkTo: '#25323D' },
  twilight: { from: '#F4F1FA', to: '#E8E2F5', accent: '#8073B0', ink: '#3D3557', darkFrom: '#1F1B2A', darkTo: '#2D273D' },
}

export const DEFAULT_PALETTE = PALETTES.dawn

export function paletteFor(name) {
  return PALETTES[name] || DEFAULT_PALETTE
}
