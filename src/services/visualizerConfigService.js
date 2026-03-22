import {
  DEFAULT_VISUALIZER_PALETTE_ID,
  VISUALIZER_PALETTES,
  getVisualizerPaletteById
} from '@/utils/visualizerPalettes'

export const VISUALIZER_MODES = ['linear', 'circular', 'waterfall', 'vectorscope']
export const DEFAULT_VISUALIZER_MODE = VISUALIZER_MODES[0]
export const VISUALIZER_MODE_LABELS = {
  circular: 'Circular',
  linear: 'Linear',
  vectorscope: 'Vectorscope',
  waterfall: 'Waterfall'
}

export const VIDEO_EXPORT_FORMAT = 'WEBM'
export const VIDEO_EXPORT_WIDTH = 1920
export const VIDEO_EXPORT_HEIGHT = 1080
export const VIDEO_EXPORT_FPS = 30
export const VIDEO_EXPORT_AUDIO_SAMPLE_RATE = 48000

export function normalizeVisualizerMode(mode, fallback = DEFAULT_VISUALIZER_MODE) {
  return VISUALIZER_MODES.includes(mode) ? mode : fallback
}

export function normalizeVisualizerPaletteId(paletteId, fallback = DEFAULT_VISUALIZER_PALETTE_ID) {
  return getVisualizerPaletteById(paletteId ?? fallback)?.id ?? fallback
}

export function getVisualizerModeLabel(mode) {
  return VISUALIZER_MODE_LABELS[normalizeVisualizerMode(mode)] ?? normalizeVisualizerMode(mode)
}

export function getVisualizerPaletteLabel(paletteId) {
  return getVisualizerPaletteById(paletteId)?.label
    ?? VISUALIZER_PALETTES[0]?.label
    ?? 'Palette'
}
