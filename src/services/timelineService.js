import { getClipEnd, TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'

const MIN_CLIP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MIN_NEW_CLIP_DURATION = 1

export function getClipGroupMoveBounds(track, clipIds) {
  const normalizedClipIds = [...new Set(Array.isArray(clipIds) ? clipIds.filter(Boolean) : [])]

  if (!normalizedClipIds.length) {
    return {
      minDelta: 0,
      maxDelta: 0
    }
  }

  let earliestStart = Number.POSITIVE_INFINITY

  for (const clipId of normalizedClipIds) {
    const clip = track.clips.find((entry) => entry.id === clipId)

    if (!clip) {
      continue
    }

    earliestStart = Math.min(earliestStart, clip.start)
  }

  if (!Number.isFinite(earliestStart)) {
    return {
      minDelta: 0,
      maxDelta: 0
    }
  }

  return {
    minDelta: -earliestStart,
    maxDelta: Number.POSITIVE_INFINITY
  }
}

export function clampClipStart(_track, _clipId, nextStart) {
  return Math.max(0, nextStart)
}

export function clampClipPlacementStart(_track, nextStart, _duration, _excludedClipId = null) {
  return Math.max(0, nextStart)
}

export function clampClipResizeStart(track, clipId, nextStart) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return Math.max(0, nextStart)
  }

  const maxStart = getClipEnd(clip) - MIN_CLIP_DURATION
  return Math.max(0, Math.min(nextStart, maxStart))
}

export function clampClipResizeEnd(track, clipId, nextEnd) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return Math.max(MIN_CLIP_DURATION, nextEnd)
  }

  return Math.max(clip.start + MIN_CLIP_DURATION, nextEnd)
}

export function getTrackCreateBounds(track, tick) {
  const sortedClips = track.clips
    .slice()
    .sort((leftClip, rightClip) => leftClip.start - rightClip.start)

  let minStart = 0
  let maxEnd = Number.POSITIVE_INFINITY

  for (const clip of sortedClips) {
    if (tick >= clip.start && tick < getClipEnd(clip)) {
      return null
    }

    if (getClipEnd(clip) <= tick) {
      minStart = Math.max(minStart, getClipEnd(clip))
      continue
    }

    if (clip.start > tick) {
      maxEnd = clip.start
      break
    }
  }

  return {
    minStart,
    maxEnd
  }
}

export function buildCreatedClip(anchorTick, currentTick, bounds) {
  if (!bounds || bounds.maxEnd - bounds.minStart < MIN_NEW_CLIP_DURATION) {
    return null
  }

  let start = Math.max(bounds.minStart, Math.min(anchorTick, currentTick))
  let end = Math.min(bounds.maxEnd, Math.max(anchorTick, currentTick))

  if (end - start >= MIN_NEW_CLIP_DURATION) {
    return {
      start,
      duration: end - start
    }
  }

  if (currentTick >= anchorTick) {
    start = Math.min(Math.max(anchorTick, bounds.minStart), bounds.maxEnd - MIN_NEW_CLIP_DURATION)

    return {
      start,
      duration: MIN_NEW_CLIP_DURATION
    }
  }

  end = Math.max(Math.min(anchorTick, bounds.maxEnd), bounds.minStart + MIN_NEW_CLIP_DURATION)

  return {
    start: end - MIN_NEW_CLIP_DURATION,
    duration: MIN_NEW_CLIP_DURATION
  }
}
