import { getClipEnd, TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'

const MIN_CLIP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MIN_NEW_CLIP_DURATION = 1
export const DEFAULT_FORMULA_DROP_DURATION = 4

function normalizeTrackStart(value) {
  const normalizedValue = Number(value)
  return Number.isFinite(normalizedValue) ? Math.max(0, normalizedValue) : 0
}

function normalizeClipDuration(value) {
  const normalizedValue = Number(value)
  return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : MIN_CLIP_DURATION
}

function normalizeClipIdSet(clipIds) {
  return new Set(Array.isArray(clipIds) ? clipIds.filter(Boolean) : [])
}

function getTrackIntervals(track, excludedClipIds = null) {
  const excludedIds = excludedClipIds instanceof Set ? excludedClipIds : normalizeClipIdSet(excludedClipIds)

  return (Array.isArray(track?.clips) ? track.clips : [])
    .filter((clip) => !excludedIds.has(clip?.id))
    .map((clip) => {
      const start = normalizeTrackStart(clip?.start)
      return {
        end: Math.max(start, getClipEnd({
          ...clip,
          duration: normalizeClipDuration(clip?.duration),
          start
        })),
        start
      }
    })
    .sort((leftInterval, rightInterval) => leftInterval.start - rightInterval.start)
}

function getClipGroupEntries(track, clipIds) {
  const normalizedClipIds = normalizeClipIdSet(clipIds)

  if (!normalizedClipIds.size) {
    return []
  }

  return (Array.isArray(track?.clips) ? track.clips : [])
    .filter((clip) => normalizedClipIds.has(clip?.id))
    .map((clip) => {
      const start = normalizeTrackStart(clip?.start)
      const duration = normalizeClipDuration(clip?.duration)

      return {
        clip,
        end: Math.max(start, getClipEnd({
          ...clip,
          duration,
          start
        })),
        start
      }
    })
}

function subtractForbiddenOpenInterval(intervals, forbiddenStart, forbiddenEnd) {
  if (!Number.isFinite(forbiddenStart) || !Number.isFinite(forbiddenEnd) || forbiddenStart >= forbiddenEnd) {
    return intervals
  }

  return intervals.flatMap((interval) => {
    if (forbiddenEnd <= interval.min || forbiddenStart >= interval.max) {
      return [interval]
    }

    const nextIntervals = []

    if (forbiddenStart >= interval.min) {
      nextIntervals.push({
        min: interval.min,
        max: Math.min(interval.max, forbiddenStart)
      })
    }

    if (forbiddenEnd <= interval.max) {
      nextIntervals.push({
        min: Math.max(interval.min, forbiddenEnd),
        max: interval.max
      })
    }

    return nextIntervals.filter((nextInterval) => nextInterval.min <= nextInterval.max)
  })
}

function mergeOccupiedIntervals(intervals) {
  if (!intervals.length) {
    return []
  }

  const mergedIntervals = [intervals[0]]

  for (const interval of intervals.slice(1)) {
    const currentInterval = mergedIntervals[mergedIntervals.length - 1]

    if (interval.start <= currentInterval.end) {
      currentInterval.end = Math.max(currentInterval.end, interval.end)
      continue
    }

    mergedIntervals.push({ ...interval })
  }

  return mergedIntervals
}

export function getClipGroupMoveIntervals(track, clipIds) {
  const selectedEntries = getClipGroupEntries(track, clipIds)

  if (!selectedEntries.length) {
    return [{ min: 0, max: 0 }]
  }

  let allowedIntervals = [
    {
      min: Math.max(...selectedEntries.map((entry) => -entry.start)),
      max: Number.POSITIVE_INFINITY
    }
  ]

  const excludedClipIds = new Set(selectedEntries.map((entry) => entry.clip.id))
  const otherIntervals = getTrackIntervals(track, excludedClipIds)

  for (const selectedEntry of selectedEntries) {
    for (const otherInterval of otherIntervals) {
      const forbiddenStart = otherInterval.start - selectedEntry.end
      const forbiddenEnd = otherInterval.end - selectedEntry.start

      allowedIntervals = subtractForbiddenOpenInterval(
        allowedIntervals,
        forbiddenStart,
        forbiddenEnd
      )

      if (!allowedIntervals.length) {
        return []
      }
    }
  }

  return allowedIntervals
}

export function intersectClipMoveIntervals(leftIntervals, rightIntervals) {
  const intersections = []

  for (const leftInterval of leftIntervals) {
    for (const rightInterval of rightIntervals) {
      const min = Math.max(leftInterval.min, rightInterval.min)
      const max = Math.min(leftInterval.max, rightInterval.max)

      if (min <= max) {
        intersections.push({ min, max })
      }
    }
  }

  return intersections
}

export function clampDeltaToClipMoveIntervals(desiredDelta, intervals) {
  if (!Array.isArray(intervals) || !intervals.length) {
    return 0
  }

  for (const interval of intervals) {
    if (desiredDelta >= interval.min && desiredDelta <= interval.max) {
      return desiredDelta
    }
  }

  let bestDelta = intervals[0].min
  let bestDistance = Math.abs(desiredDelta - bestDelta)

  for (const interval of intervals) {
    const candidates = [interval.min]

    if (Number.isFinite(interval.max)) {
      candidates.push(interval.max)
    }

    for (const candidate of candidates) {
      const distance = Math.abs(desiredDelta - candidate)

      if (distance < bestDistance) {
        bestDelta = candidate
        bestDistance = distance
      }
    }
  }

  return bestDelta
}

export function getClipGroupMoveBounds(track, clipIds) {
  const intervals = getClipGroupMoveIntervals(track, clipIds)

  if (!intervals.length) {
    return {
      minDelta: 0,
      maxDelta: 0
    }
  }

  return {
    minDelta: intervals[0].min,
    maxDelta: intervals[intervals.length - 1].max
  }
}

export function getClipPlacement(track, nextStart, duration, excludedClipId = null) {
  const desiredStart = normalizeTrackStart(nextStart)
  const normalizedDuration = normalizeClipDuration(duration)
  const occupiedIntervals = mergeOccupiedIntervals(
    getTrackIntervals(track, excludedClipId === null ? null : [excludedClipId])
  )
  const gaps = []
  let cursor = 0

  for (const interval of occupiedIntervals) {
    if (interval.start > cursor) {
      gaps.push({
        end: interval.start,
        start: cursor
      })
    }

    cursor = Math.max(cursor, interval.end)
  }

  gaps.push({
    end: Number.POSITIVE_INFINITY,
    start: cursor
  })

  let bestPlacement = null

  for (const gap of gaps) {
    const gapHasFiniteEnd = Number.isFinite(gap.end)
    const maxStart = gapHasFiniteEnd ? gap.end - normalizedDuration : Number.POSITIVE_INFINITY

    if (gapHasFiniteEnd && maxStart < gap.start) {
      continue
    }

    const candidateStart = gapHasFiniteEnd
      ? Math.min(Math.max(desiredStart, gap.start), maxStart)
      : Math.max(desiredStart, gap.start)
    const distance = Math.abs(candidateStart - desiredStart)

    if (
      bestPlacement &&
      (distance > bestPlacement.distance ||
      (distance === bestPlacement.distance && candidateStart >= bestPlacement.start))
    ) {
      continue
    }

    bestPlacement = {
      distance,
      fitsAtStart:
        desiredStart >= gap.start &&
        (!gapHasFiniteEnd || desiredStart <= maxStart),
      gapEnd: gap.end,
      gapStart: gap.start,
      start: candidateStart
    }
  }

  return bestPlacement ?? {
    fitsAtStart: false,
    gapEnd: Number.POSITIVE_INFINITY,
    gapStart: 0,
    start: desiredStart
  }
}

export function canPlaceClipAtStart(track, nextStart, duration, excludedClipId = null) {
  return getClipPlacement(track, nextStart, duration, excludedClipId).fitsAtStart
}

export function clampClipStart(track, clipId, nextStart) {
  const clip = track?.clips?.find((entry) => entry.id === clipId)

  if (!clip) {
    return normalizeTrackStart(nextStart)
  }

  const desiredDelta = (Number(nextStart) || 0) - normalizeTrackStart(clip.start)
  const nextDelta = clampDeltaToClipMoveIntervals(
    desiredDelta,
    getClipGroupMoveIntervals(track, [clipId])
  )

  return normalizeTrackStart(clip.start) + nextDelta
}

export function clampClipPlacementStart(track, nextStart, duration, excludedClipId = null) {
  return getClipPlacement(track, nextStart, duration, excludedClipId).start
}

export function clampClipResizeStart(track, clipId, nextStart) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return normalizeTrackStart(nextStart)
  }

  const normalizedStart = normalizeTrackStart(clip.start)
  const minStart = normalizedStart + getClipGroupMoveBounds(track, [clipId]).minDelta
  const maxStart = getClipEnd({
    ...clip,
    start: normalizedStart
  }) - MIN_CLIP_DURATION
  return Math.max(minStart, Math.min(nextStart, maxStart))
}

export function clampClipResizeEnd(track, clipId, nextEnd) {
  const clip = track.clips.find((entry) => entry.id === clipId)

  if (!clip) {
    return Math.max(MIN_CLIP_DURATION, Number(nextEnd) || 0)
  }

  const normalizedStart = normalizeTrackStart(clip.start)
  const currentEnd = getClipEnd({
    ...clip,
    start: normalizedStart
  })
  const maxDelta = getClipGroupMoveBounds(track, [clipId]).maxDelta
  const maxEnd = Number.isFinite(maxDelta) ? currentEnd + maxDelta : Number.POSITIVE_INFINITY
  return Math.min(maxEnd, Math.max(normalizedStart + MIN_CLIP_DURATION, nextEnd))
}

export function getTrackCreateBounds(track, tick) {
  const normalizedTick = normalizeTrackStart(tick)
  const occupiedIntervals = mergeOccupiedIntervals(getTrackIntervals(track))
  let minStart = 0

  for (const interval of occupiedIntervals) {
    if (normalizedTick >= interval.start && normalizedTick < interval.end) {
      return null
    }

    if (interval.end <= normalizedTick) {
      minStart = Math.max(minStart, interval.end)
      continue
    }

    if (interval.start > normalizedTick) {
      return {
        minStart,
        maxEnd: interval.start
      }
    }
  }

  return {
    minStart,
    maxEnd: Number.POSITIVE_INFINITY
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
