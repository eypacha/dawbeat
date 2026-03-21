import { clamp } from '@/utils/timeUtils'

export const TRACK_LANE_MIN_HEIGHT = 44
export const TRACK_LANE_DEFAULT_HEIGHT = 80
export const TRACK_LANE_MAX_HEIGHT = 220

export const VARIABLE_TRACK_MIN_HEIGHT = 32
export const VARIABLE_TRACK_DEFAULT_HEIGHT = 44
export const VARIABLE_TRACK_MAX_HEIGHT = 140

export const VALUE_TRACKER_TRACK_MIN_HEIGHT = 52
export const VALUE_TRACKER_TRACK_DEFAULT_HEIGHT = 64
export const VALUE_TRACKER_TRACK_MAX_HEIGHT = 180

export const AUTOMATION_LANE_MIN_HEIGHT = 44
export const AUTOMATION_LANE_DEFAULT_HEIGHT = 52
export const AUTOMATION_LANE_MAX_HEIGHT = 180

export function normalizeTrackLaneHeight(value, fallback = TRACK_LANE_DEFAULT_HEIGHT) {
  return normalizeTimelineLaneHeight(value, {
    fallback,
    max: TRACK_LANE_MAX_HEIGHT,
    min: TRACK_LANE_MIN_HEIGHT
  })
}

export function normalizeVariableTrackHeight(value, fallback = VARIABLE_TRACK_DEFAULT_HEIGHT) {
  return normalizeTimelineLaneHeight(value, {
    fallback,
    max: VARIABLE_TRACK_MAX_HEIGHT,
    min: VARIABLE_TRACK_MIN_HEIGHT
  })
}

export function normalizeValueTrackerTrackHeight(value, fallback = VALUE_TRACKER_TRACK_DEFAULT_HEIGHT) {
  return normalizeTimelineLaneHeight(value, {
    fallback,
    max: VALUE_TRACKER_TRACK_MAX_HEIGHT,
    min: VALUE_TRACKER_TRACK_MIN_HEIGHT
  })
}

export function normalizeAutomationLaneHeight(value, fallback = AUTOMATION_LANE_DEFAULT_HEIGHT) {
  return normalizeTimelineLaneHeight(value, {
    fallback,
    max: AUTOMATION_LANE_MAX_HEIGHT,
    min: AUTOMATION_LANE_MIN_HEIGHT
  })
}

function normalizeTimelineLaneHeight(value, { fallback, max, min }) {
  const normalizedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : min
  const numericValue = Number(value)
  const nextValue = Number.isFinite(numericValue) ? Math.round(numericValue) : normalizedFallback
  return clamp(nextValue, min, max)
}
