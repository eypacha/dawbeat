import { getClipEnd } from '@/utils/timeUtils'

function sortClipsByStart(clips, excludedClipId) {
  return clips
    .filter((clip) => clip.id !== excludedClipId)
    .sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

export function getClipMoveBounds(track, clipId) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return {
      minStart: 0,
      maxStart: 0
    }
  }

  const sortedClips = sortClipsByStart(track.clips, clipId)
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

export function clampClipStart(track, clipId, nextStart) {
  const { minStart, maxStart } = getClipMoveBounds(track, clipId)
  return Math.max(minStart, Math.min(nextStart, maxStart))
}
