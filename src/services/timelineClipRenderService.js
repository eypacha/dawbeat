import { ticksToPixels } from '@/utils/timeUtils'

export const MIN_TIMELINE_CLIP_RENDER_TICKS = 0.5

export function getRenderedTimelineClipDuration(duration) {
  const normalizedDuration = Number(duration)

  return Math.max(
    Number.isFinite(normalizedDuration) ? normalizedDuration : 0,
    MIN_TIMELINE_CLIP_RENDER_TICKS
  )
}

export function getRenderedTimelineClipEnd(clip) {
  return (Number(clip?.start) || 0) + getRenderedTimelineClipDuration(clip?.duration)
}

export function getRenderedTimelineClipWidth(duration, pixelsPerTick) {
  return Math.max(
    ticksToPixels(Number(duration) || 0, pixelsPerTick),
    ticksToPixels(MIN_TIMELINE_CLIP_RENDER_TICKS, pixelsPerTick)
  )
}
