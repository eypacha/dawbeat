export const BASE_PIXELS_PER_TICK = 48
export const MIN_ZOOM = 0.125
export const MAX_ZOOM = 4
export const TRACK_LABEL_WIDTH = 144
export const DEFAULT_TIMELINE_TICKS = 32
export const TIMELINE_SNAP_SUBDIVISIONS = 4
export const SNAP_SUBDIVISION_OPTIONS = [1, 2, 4, 8, 16]
export const BASE_TICK_SIZE = 1024
export const TICK_DURATION_MULTIPLIER = 4

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getSamplesPerTick(tickSize = BASE_TICK_SIZE) {
  return tickSize * TICK_DURATION_MULTIPLIER
}

export function ticksToPixels(ticks, pixelsPerTick = BASE_PIXELS_PER_TICK) {
  return ticks * pixelsPerTick
}

export function getVisibleTimelineTickStep(pixelsPerTick = BASE_PIXELS_PER_TICK, minSpacingPx = 28) {
  if (!Number.isFinite(pixelsPerTick) || pixelsPerTick <= 0) {
    return 1
  }

  let step = 1

  while (pixelsPerTick * step < minSpacingPx) {
    step *= 2
  }

  return step
}

export function pixelsToTicks(pixels, pixelsPerTick = BASE_PIXELS_PER_TICK) {
  return pixels / pixelsPerTick
}

export function normalizeSnapSubdivisions(value, fallback = TIMELINE_SNAP_SUBDIVISIONS) {
  const normalizedValue = Math.round(Number(value))
  return SNAP_SUBDIVISION_OPTIONS.includes(normalizedValue) ? normalizedValue : fallback
}

export function snapTicks(ticks, subdivisions = TIMELINE_SNAP_SUBDIVISIONS) {
  const normalizedSubdivisions = normalizeSnapSubdivisions(subdivisions)
  return Math.round(ticks * normalizedSubdivisions) / normalizedSubdivisions
}

export function maybeSnapTicks(
  ticks,
  shouldSnap = true,
  subdivisions = TIMELINE_SNAP_SUBDIVISIONS
) {
  return shouldSnap ? snapTicks(ticks, subdivisions) : ticks
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
