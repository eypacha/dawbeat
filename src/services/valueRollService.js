import { TIMELINE_SNAP_SUBDIVISIONS, clamp } from '@/utils/timeUtils'

export const VALUE_ROLL_MIN = 0
export const VALUE_ROLL_MAX = 255
export const DEFAULT_VALUE_ROLL_STEP_SUBDIVISION = TIMELINE_SNAP_SUBDIVISIONS
export const DEFAULT_VALUE_ROLL_TRACK_NAME_PREFIX = 'Value Roll'
export const VALUE_ROLL_BINDING_TYPES = Object.freeze([
  'midiCc',
  'midiNote',
  'keyboard',
  'variable'
])

export function createDefaultValueRollBinding(binding = {}) {
  const type = VALUE_ROLL_BINDING_TYPES.includes(binding?.type) ? binding.type : null

  return {
    type,
    deviceId: normalizeNullableString(binding?.deviceId),
    channel: normalizeNullableInteger(binding?.channel),
    controller: normalizeNullableInteger(binding?.controller),
    note: normalizeNullableInteger(binding?.note),
    variableName: normalizeNullableString(binding?.variableName)
  }
}

export function normalizeValueRollTrackName(value, fallback = DEFAULT_VALUE_ROLL_TRACK_NAME_PREFIX) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return trimmedValue || fallback
}

export function getNextValueRollTrackName(valueRollTracks = []) {
  const usedNames = new Set(
    Array.isArray(valueRollTracks)
      ? valueRollTracks
          .map((valueRollTrack) => normalizeValueRollTrackName(valueRollTrack?.name, ''))
          .filter(Boolean)
      : []
  )

  let index = 1

  while (usedNames.has(`${DEFAULT_VALUE_ROLL_TRACK_NAME_PREFIX} ${index}`)) {
    index += 1
  }

  return `${DEFAULT_VALUE_ROLL_TRACK_NAME_PREFIX} ${index}`
}

export function normalizeValueRollStepSubdivision(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_VALUE_ROLL_STEP_SUBDIVISION
  }

  return Math.max(1, Math.round(numericValue))
}

export function normalizeValueRollValue(value, fallback = 0) {
  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) ? Math.round(numericValue) : fallback
  return clamp(normalizedValue, VALUE_ROLL_MIN, VALUE_ROLL_MAX)
}

export function normalizeValueRollEventValue(value) {
  if (value === null || typeof value === 'undefined') {
    return null
  }

  if (typeof value === 'string' && !value.trim()) {
    return null
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return clamp(Math.round(numericValue), VALUE_ROLL_MIN, VALUE_ROLL_MAX)
}

export function isNumericValueRollInitializer(value) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return Boolean(trimmedValue) && Number.isFinite(Number(trimmedValue))
}

export function getValueRollStepCount(duration, stepSubdivision = DEFAULT_VALUE_ROLL_STEP_SUBDIVISION) {
  const normalizedDuration = Number(duration)

  if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
    return normalizeValueRollStepSubdivision(stepSubdivision)
  }

  return Math.max(
    1,
    Math.round(normalizedDuration * normalizeValueRollStepSubdivision(stepSubdivision))
  )
}

export function createEmptyValueRollValues(duration, stepSubdivision = DEFAULT_VALUE_ROLL_STEP_SUBDIVISION) {
  return Array.from({ length: getValueRollStepCount(duration, stepSubdivision) }, () => null)
}

export function createConstantValueRollValues(
  value,
  duration,
  stepSubdivision = DEFAULT_VALUE_ROLL_STEP_SUBDIVISION
) {
  const stepCount = getValueRollStepCount(duration, stepSubdivision)
  const normalizedValue = normalizeValueRollValue(value)

  return Array.from(
    { length: stepCount },
    (_entry, index) => (index === 0 ? normalizedValue : null)
  )
}

export function normalizeValueRollValues(
  values,
  duration,
  stepSubdivision = DEFAULT_VALUE_ROLL_STEP_SUBDIVISION,
  options = {}
) {
  const stepCount = getValueRollStepCount(duration, stepSubdivision)
  const normalizedValues = Array.isArray(values) ? values : []

  if (options.mode === 'legacyDense') {
    return compressLegacyValueRollValues(normalizedValues, stepCount)
  }

  return Array.from({ length: stepCount }, (_entry, index) =>
    normalizeValueRollEventValue(normalizedValues[index])
  )
}

export function getValueRollResolvedValues(values, initialValue = null) {
  const normalizedValues = Array.isArray(values) ? values : []
  const resolvedValues = []
  let activeValue = normalizeValueRollEventValue(initialValue)

  for (const value of normalizedValues) {
    const eventValue = normalizeValueRollEventValue(value)

    if (eventValue !== null) {
      activeValue = eventValue
    }

    resolvedValues.push(activeValue)
  }

  return resolvedValues
}

export function getValueRollEventCount(values = []) {
  return (Array.isArray(values) ? values : []).reduce(
    (count, value) => count + (normalizeValueRollEventValue(value) === null ? 0 : 1),
    0
  )
}

export function resizeValueRollValues(
  values,
  {
    nextDuration,
    nextStart,
    previousDuration,
    previousStart,
    stepSubdivision = DEFAULT_VALUE_ROLL_STEP_SUBDIVISION
  } = {}
) {
  const normalizedStepSubdivision = normalizeValueRollStepSubdivision(stepSubdivision)
  const nextStepCount = getValueRollStepCount(nextDuration, normalizedStepSubdivision)
  const normalizedValues = Array.isArray(values)
    ? values.map((value) => normalizeValueRollEventValue(value))
    : []

  let nextValues = [...normalizedValues]
  const startStepDelta = Math.round((Number(previousStart) - Number(nextStart)) * normalizedStepSubdivision)

  if (startStepDelta > 0) {
    nextValues = [
      ...Array.from({ length: startStepDelta }, () => null),
      ...nextValues
    ]
  } else if (startStepDelta < 0) {
    nextValues = nextValues.slice(Math.abs(startStepDelta))
  }

  if (nextValues.length > nextStepCount) {
    return nextValues.slice(0, nextStepCount)
  }

  if (nextValues.length < nextStepCount) {
    return [
      ...nextValues,
      ...Array.from({ length: nextStepCount - nextValues.length }, () => null)
    ]
  }

  return nextValues
}

export function getValueRollValueAtTime(timeTicks, valueRollTrack, fallback = VALUE_ROLL_MIN) {
  if (!Array.isArray(valueRollTrack?.clips) || !valueRollTrack.clips.length) {
    return normalizeValueRollEventValue(fallback)
  }

  let resolvedValue = normalizeValueRollEventValue(fallback)

  for (const clip of valueRollTrack.clips) {
    const clipStart = Number(clip?.start)

    if (!Number.isFinite(clipStart)) {
      continue
    }

    if (clipStart > timeTicks) {
      break
    }

    const stepSubdivision = normalizeValueRollStepSubdivision(clip.stepSubdivision)
    const maxStepIndex = clamp(
      Math.floor((timeTicks - clip.start) * stepSubdivision),
      0,
      getValueRollStepCount(clip.duration, stepSubdivision) - 1
    )

    for (let stepIndex = 0; stepIndex <= maxStepIndex; stepIndex += 1) {
      const eventValue = normalizeValueRollEventValue(clip.values?.[stepIndex])

      if (eventValue !== null) {
        resolvedValue = eventValue
      }
    }
  }

  return resolvedValue
}

export function getValueRollEventTicks(clip) {
  if (!clip) {
    return []
  }

  const stepSubdivision = normalizeValueRollStepSubdivision(clip.stepSubdivision)

  return normalizeValueRollValues(clip.values, clip.duration, stepSubdivision).flatMap((value, index) =>
    value === null ? [] : [Number(clip.start) + index / stepSubdivision]
  )
}

export function getValueRollBoundVariableName(valueRollTrack) {
  if (valueRollTrack?.binding?.type !== 'variable') {
    return ''
  }

  return normalizeNullableString(valueRollTrack.binding.variableName) ?? ''
}

export function getBoundValueRollVariableNames(valueRollTracks = []) {
  return [...new Set(
    (Array.isArray(valueRollTracks) ? valueRollTracks : [])
      .map((valueRollTrack) => getValueRollBoundVariableName(valueRollTrack))
      .filter(Boolean)
  )]
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue || null
}

function normalizeNullableInteger(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) ? numericValue : null
}

function compressLegacyValueRollValues(values, stepCount) {
  const denseValues = Array.from({ length: stepCount }, (_entry, index) =>
    normalizeValueRollValue(values[index], VALUE_ROLL_MIN)
  )

  return denseValues.map((value, index) =>
    index === 0 || value !== denseValues[index - 1] ? value : null
  )
}
