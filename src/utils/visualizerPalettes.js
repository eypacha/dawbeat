const APP_BACKGROUND = '#0b0809'

export const VISUALIZER_PALETTES = [
  {
    id: 'ember',
    label: 'Ember',
    colors: {
      audio: [252, 211, 77],
      audioGlow: [245, 158, 11],
      background: APP_BACKGROUND,
      border: [245, 158, 11],
      divider: [255, 255, 255],
      formulaPrimary: [56, 189, 248],
      formulaSecondary: [125, 211, 252],
      grid: [245, 158, 11]
    }
  },
  {
    id: 'mint',
    label: 'Mint',
    colors: {
      audio: [74, 222, 128],
      audioGlow: [16, 185, 129],
      background: APP_BACKGROUND,
      border: [16, 185, 129],
      divider: [255, 255, 255],
      formulaPrimary: [34, 211, 238],
      formulaSecondary: [103, 232, 249],
      grid: [16, 185, 129]
    }
  },
  {
    id: 'sunset',
    label: 'Sunset',
    colors: {
      audio: [251, 146, 60],
      audioGlow: [244, 63, 94],
      background: APP_BACKGROUND,
      border: [244, 63, 94],
      divider: [255, 255, 255],
      formulaPrimary: [244, 114, 182],
      formulaSecondary: [249, 168, 212],
      grid: [244, 63, 94]
    }
  },
  {
    id: 'ice',
    label: 'Ice',
    colors: {
      audio: [96, 165, 250],
      audioGlow: [59, 130, 246],
      background: APP_BACKGROUND,
      border: [59, 130, 246],
      divider: [255, 255, 255],
      formulaPrimary: [45, 212, 191],
      formulaSecondary: [153, 246, 228],
      grid: [59, 130, 246]
    }
  }
]

export const DEFAULT_VISUALIZER_PALETTE_ID = VISUALIZER_PALETTES[0]?.id ?? 'ember'

const VISUALIZER_PALETTE_BY_ID = Object.fromEntries(
  VISUALIZER_PALETTES.map((palette) => [palette.id, palette])
)

export function getVisualizerPaletteById(id) {
  return VISUALIZER_PALETTE_BY_ID[id]
    ?? VISUALIZER_PALETTE_BY_ID[DEFAULT_VISUALIZER_PALETTE_ID]
    ?? VISUALIZER_PALETTES[0]
}

export function withAlpha(rgb, alpha) {
  const [red = 255, green = 255, blue = 255] = Array.isArray(rgb) ? rgb : []
  const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha) || 0))

  return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha.toFixed(3)})`
}
