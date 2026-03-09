import { getClipEnd, TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'

const MIN_CLIP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MIN_NEW_CLIP_DURATION = 1

function sortClipsByStart(clips, excludedClipId) {
  return clips
    .filter((clip) => clip.id !== excludedClipId)
    .sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

function getClipPlacementIntervals(track, duration, excludedClipId) {
  const sortedClips = sortClipsByStart(track.clips, excludedClipId)
  const intervals = []
  let cursor = 0

  for (const clip of sortedClips) {
    const maxStart = clip.start - duration

    if (maxStart >= cursor) {
      intervals.push({
        minStart: cursor,
        maxStart
      })
    }

    cursor = Math.max(cursor, getClipEnd(clip))
  }

  intervals.push({
    minStart: cursor,
    maxStart: Number.POSITIVE_INFINITY
  })

  return intervals
}

function clampStartToInterval(start, interval) {
  return Math.max(interval.minStart, Math.min(start, interval.maxStart))
}

function getClipWithSiblings(track, clipId) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return null
  }

  return {
    clip,
    sortedClips: sortClipsByStart(track.clips, clipId)
  }
}

export function getClipMoveBounds(track, clipId) {
  const result = getClipWithSiblings(track, clipId)

  if (!result) {
    return {
      minStart: 0,
      maxStart: 0
    }
  }

  const { clip, sortedClips } = result
  let minStart = 0
  let maxStart = Number.POSITIVE_INFINITY

  for (const siblingClip of sortedClips) {
    if (getClipEnd(siblingClip) <= clip.start) {
      minStart = Math.max(minStart, getClipEnd(siblingClip))
      continue
    }

    if (siblingClip.start >= clip.start) {
      maxStart = siblingClip.start - clip.duration
      break
    }
  }

  return {
    minStart,
    maxStart
  }
}

export function getClipResizeStartBounds(track, clipId) {
  const result = getClipWithSiblings(track, clipId)

  if (!result) {
    return {
      minStart: 0,
      maxStart: 0
    }
  }

  const { clip, sortedClips } = result
  let minStart = 0

  for (const siblingClip of sortedClips) {
    if (getClipEnd(siblingClip) <= clip.start) {
      minStart = Math.max(minStart, getClipEnd(siblingClip))
    }
  }

  return {
    minStart,
    maxStart: getClipEnd(clip) - MIN_CLIP_DURATION
  }
}

export function getClipResizeEndBounds(track, clipId) {
  const result = getClipWithSiblings(track, clipId)

  if (!result) {
    return {
      minEnd: MIN_CLIP_DURATION,
      maxEnd: MIN_CLIP_DURATION
    }
  }

  const { clip, sortedClips } = result
  let maxEnd = Number.POSITIVE_INFINITY

  for (const siblingClip of sortedClips) {
    if (siblingClip.start >= clip.start) {
      maxEnd = siblingClip.start
      break
    }
  }

  return {
    minEnd: clip.start + MIN_CLIP_DURATION,
    maxEnd
  }
}

export function clampClipStart(track, clipId, nextStart) {
  const { minStart, maxStart } = getClipMoveBounds(track, clipId)
  return Math.max(minStart, Math.min(nextStart, maxStart))
}

export function clampClipPlacementStart(track, nextStart, duration, excludedClipId = null) {
  const intervals = getClipPlacementIntervals(track, duration, excludedClipId)

  if (!intervals.length) {
    return Math.max(0, nextStart)
  }

  let closestStart = clampStartToInterval(nextStart, intervals[0])
  let closestDistance = Math.abs(closestStart - nextStart)

  for (const interval of intervals.slice(1)) {
    const clampedStart = clampStartToInterval(nextStart, interval)
    const distance = Math.abs(clampedStart - nextStart)

    if (distance < closestDistance) {
      closestStart = clampedStart
      closestDistance = distance
    }
  }

  return Math.max(0, closestStart)
}

export function clampClipResizeStart(track, clipId, nextStart) {
  const { minStart, maxStart } = getClipResizeStartBounds(track, clipId)
  return Math.max(minStart, Math.min(nextStart, maxStart))
}

export function clampClipResizeEnd(track, clipId, nextEnd) {
  const { minEnd, maxEnd } = getClipResizeEndBounds(track, clipId)
  return Math.max(minEnd, Math.min(nextEnd, maxEnd))
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
