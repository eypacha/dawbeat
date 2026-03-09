export const TRACK_COLOR_PALETTE = [
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7'
]

export const DEFAULT_TRACK_COLOR = TRACK_COLOR_PALETTE[0]

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    return DEFAULT_TRACK_COLOR
  }

  const normalized = hex.trim().replace('#', '')

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`
  }

  return DEFAULT_TRACK_COLOR
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex)

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`
}

function mixHex(hex, target, amount) {
  const { r, g, b } = hexToRgb(hex)
  const mixAmount = amount / 100

  return rgbToHex({
    r: r + (target.r - r) * mixAmount,
    g: g + (target.g - g) * mixAmount,
    b: b + (target.b - b) * mixAmount
  })
}

export function lightenHex(hex, amount = 15) {
  return mixHex(hex, { r: 255, g: 255, b: 255 }, amount)
}

export function darkenHex(hex, amount = 15) {
  return mixHex(hex, { r: 0, g: 0, b: 0 }, amount)
}

export function getTrackColor(color) {
  const normalized = normalizeHex(color)
  return TRACK_COLOR_PALETTE.includes(normalized) ? normalized : DEFAULT_TRACK_COLOR
}
