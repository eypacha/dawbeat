export const TIMELINE_SCALE = 72
export const TRACK_LABEL_WIDTH = 144
export const DEFAULT_TIMELINE_TICKS = 32
export const TIMELINE_SNAP_SUBDIVISIONS = 4
export const BASE_TICK_SIZE = 1024
export const TICK_DURATION_MULTIPLIER = 4

export function getSamplesPerTick(tickSize = BASE_TICK_SIZE) {
  return tickSize * TICK_DURATION_MULTIPLIER
}

export function ticksToPixels(ticks, scale = TIMELINE_SCALE) {
  return ticks * scale
}

export function snapTicks(ticks, subdivisions = TIMELINE_SNAP_SUBDIVISIONS) {
  return Math.round(ticks * subdivisions) / subdivisions
}

export function ticksToSamples(ticks, tickSize) {
  return ticks * getSamplesPerTick(tickSize)
}

export function samplesToTicks(samples, tickSize) {
  return samples / getSamplesPerTick(tickSize)
}

export function getClipEnd(clip) {
  return clip.start + clip.duration
}
