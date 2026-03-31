import { createClipId } from '@/services/dawStoreService'
import {
  normalizeValueTrackerStepSubdivision,
  normalizeValueTrackerValues
} from '@/services/valueTrackerService'
import { clamp, getClipEnd, TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'

const MIN_SPLIT_CLIP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

function getClipBounds(clip) {
  const start = Number(clip?.start)
  const duration = Number(clip?.duration)

  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) {
    return null
  }

  return {
    end: getClipEnd({ start, duration }),
    start
  }
}

function getMinSplitTime(clip) {
  const bounds = getClipBounds(clip)
  return bounds ? bounds.start + MIN_SPLIT_CLIP_DURATION : null
}

function getMaxSplitTime(clip) {
  const bounds = getClipBounds(clip)
  return bounds ? bounds.end - MIN_SPLIT_CLIP_DURATION : null
}

export function getClipTickFromClientX(clientX, element, clipStart, pixelsPerTick) {
  if (!(element instanceof Element)) {
    return null
  }

  const normalizedPixelsPerTick = Number(pixelsPerTick)

  if (!Number.isFinite(normalizedPixelsPerTick) || normalizedPixelsPerTick <= 0) {
    return null
  }

  const rect = element.getBoundingClientRect()

  if (!Number.isFinite(rect.width) || rect.width <= 0) {
    return null
  }

  const localX = clamp(clientX - rect.left, 0, rect.width)
  return (Number(clipStart) || 0) + localX / normalizedPixelsPerTick
}

export function getTimelineClipSplitTime(clip, desiredTime) {
  const normalizedTime = Number(desiredTime)
  const minSplitTime = getMinSplitTime(clip)
  const maxSplitTime = getMaxSplitTime(clip)

  if (
    !Number.isFinite(normalizedTime) ||
    !Number.isFinite(minSplitTime) ||
    !Number.isFinite(maxSplitTime)
  ) {
    return null
  }

  if (normalizedTime < minSplitTime || normalizedTime > maxSplitTime) {
    return null
  }

  return normalizedTime
}

export function getValueTrackerClipSplitTime(clip, desiredTime) {
  const bounds = getClipBounds(clip)
  const normalizedTime = Number(desiredTime)

  if (!bounds || !Number.isFinite(normalizedTime)) {
    return null
  }

  const stepSubdivision = normalizeValueTrackerStepSubdivision(clip?.stepSubdivision)
  const splitStepIndex = Math.round((normalizedTime - bounds.start) * stepSubdivision)
  const splitTime = bounds.start + splitStepIndex / stepSubdivision
  const minSplitTime = getMinSplitTime(clip)
  const maxSplitTime = getMaxSplitTime(clip)

  if (
    !Number.isFinite(minSplitTime) ||
    !Number.isFinite(maxSplitTime) ||
    splitTime < minSplitTime ||
    splitTime > maxSplitTime
  ) {
    return null
  }

  return splitTime
}

export function splitTimelineClip(clip, splitTime) {
  const normalizedSplitTime = getTimelineClipSplitTime(clip, splitTime)
  const bounds = getClipBounds(clip)

  if (!bounds || normalizedSplitTime === null) {
    return null
  }

  return {
    leftDuration: normalizedSplitTime - bounds.start,
    rightClip: {
      ...clip,
      duration: bounds.end - normalizedSplitTime,
      id: createClipId(),
      start: normalizedSplitTime
    }
  }
}

export function splitValueTrackerClip(clip, splitTime) {
  const normalizedSplitTime = getValueTrackerClipSplitTime(clip, splitTime)
  const bounds = getClipBounds(clip)

  if (!bounds || normalizedSplitTime === null) {
    return null
  }

  const stepSubdivision = normalizeValueTrackerStepSubdivision(clip?.stepSubdivision)
  const normalizedValues = normalizeValueTrackerValues(clip?.values, clip?.duration, stepSubdivision)
  const splitStepIndex = Math.round((normalizedSplitTime - bounds.start) * stepSubdivision)

  if (splitStepIndex <= 0 || splitStepIndex >= normalizedValues.length) {
    return null
  }

  return {
    leftDuration: normalizedSplitTime - bounds.start,
    leftValues: normalizedValues.slice(0, splitStepIndex),
    rightClip: {
      ...clip,
      duration: bounds.end - normalizedSplitTime,
      id: createClipId(),
      start: normalizedSplitTime,
      values: normalizedValues.slice(splitStepIndex)
    }
  }
}
