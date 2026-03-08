export const TIMELINE_SCALE = 72
export const TRACK_LABEL_WIDTH = 144
export const DEFAULT_TIMELINE_TICKS = 32
export const BASE_TICK_SIZE = 256
export const TICK_DURATION_MULTIPLIER = 4

export function getSamplesPerTick(tickSize = BASE_TICK_SIZE) {
  return tickSize * TICK_DURATION_MULTIPLIER
}

export function ticksToPixels(ticks, scale = TIMELINE_SCALE) {
  return ticks * scale
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
