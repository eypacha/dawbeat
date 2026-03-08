import { getClipEnd, TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'

const MIN_CLIP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

function sortClipsByStart(clips, excludedClipId) {
  return clips
    .filter((clip) => clip.id !== excludedClipId)
    .sort((leftClip, rightClip) => leftClip.start - rightClip.start)
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

export function clampClipResizeStart(track, clipId, nextStart) {
  const { minStart, maxStart } = getClipResizeStartBounds(track, clipId)
  return Math.max(minStart, Math.min(nextStart, maxStart))
}

export function clampClipResizeEnd(track, clipId, nextEnd) {
  const { minEnd, maxEnd } = getClipResizeEndBounds(track, clipId)
  return Math.max(minEnd, Math.min(nextEnd, maxEnd))
}
