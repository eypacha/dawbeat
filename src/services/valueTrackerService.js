import { TIMELINE_SNAP_SUBDIVISIONS, clamp } from '@/utils/timeUtils'

export const VALUE_TRACKER_MIN = 0
export const VALUE_TRACKER_MAX = 0xFFFF
export const DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION = TIMELINE_SNAP_SUBDIVISIONS
export const DEFAULT_VALUE_TRACKER_TRACK_NAME_PREFIX = 'Value Tracker'
export const DEFAULT_VALUE_TRACKER_LIBRARY_ITEM_NAME_PREFIX = 'Value Pattern'
export const VALUE_TRACKER_BINDING_TYPES = Object.freeze([
  'midiCc',
  'midiNote',
  'keyboard',
  'variable'
])

export function createValueTrackerLibraryItemId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `value-pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createDefaultValueTrackerBinding(binding = {}) {
  const type = VALUE_TRACKER_BINDING_TYPES.includes(binding?.type) ? binding.type : null
  const normalizedBinding = {
    type,
    deviceId: normalizeNullableString(binding?.deviceId),
    channel: normalizeNullableInteger(binding?.channel),
    controller: normalizeNullableInteger(binding?.controller),
    note: normalizeNullableInteger(binding?.note),
    variableName: normalizeNullableString(binding?.variableName)
  }

  if (type === 'midiCc') {
    return {
      ...normalizedBinding,
      note: null,
      variableName: null
    }
  }

  if (type === 'midiNote') {
    return {
      ...normalizedBinding,
      controller: null,
      variableName: null
    }
  }

  if (type === 'variable') {
    return {
      ...normalizedBinding,
      channel: null,
      controller: null,
      deviceId: null,
      note: null
    }
  }

  if (type === 'keyboard') {
    return {
      ...normalizedBinding,
      channel: null,
      controller: null,
      deviceId: null,
      note: null,
      variableName: null
    }
  }

  return {
    type: null,
    deviceId: null,
    channel: null,
    controller: null,
    note: null,
    variableName: null
  }
}

export function normalizeValueTrackerTrackName(value, fallback = DEFAULT_VALUE_TRACKER_TRACK_NAME_PREFIX) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return trimmedValue || fallback
}

export function getNextValueTrackerTrackName(valueTrackerTracks = []) {
  const usedNames = new Set(
    Array.isArray(valueTrackerTracks)
      ? valueTrackerTracks
          .map((valueTrackerTrack) => normalizeValueTrackerTrackName(valueTrackerTrack?.name, ''))
          .filter(Boolean)
      : []
  )

  let index = 1

  while (usedNames.has(`${DEFAULT_VALUE_TRACKER_TRACK_NAME_PREFIX} ${index}`)) {
    index += 1
  }

  return `${DEFAULT_VALUE_TRACKER_TRACK_NAME_PREFIX} ${index}`
}

export function normalizeValueTrackerLibraryItemName(
  value,
  fallback = DEFAULT_VALUE_TRACKER_LIBRARY_ITEM_NAME_PREFIX
) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return trimmedValue || fallback
}

export function getNextValueTrackerLibraryItemName(valueTrackerLibraryItems = []) {
  const usedNames = new Set(
    Array.isArray(valueTrackerLibraryItems)
      ? valueTrackerLibraryItems
          .map((item) => normalizeValueTrackerLibraryItemName(item?.name, ''))
          .filter(Boolean)
      : []
  )

  let index = 1

  while (usedNames.has(`${DEFAULT_VALUE_TRACKER_LIBRARY_ITEM_NAME_PREFIX} ${index}`)) {
    index += 1
  }

  return `${DEFAULT_VALUE_TRACKER_LIBRARY_ITEM_NAME_PREFIX} ${index}`
}

export function createValueTrackerLibraryItem(item = {}) {
  const duration = Number.isFinite(Number(item.duration)) ? Number(item.duration) : 4
  const stepSubdivision = normalizeValueTrackerStepSubdivision(item.stepSubdivision)

  return {
    id: item.id ?? createValueTrackerLibraryItemId(),
    name: normalizeValueTrackerLibraryItemName(item.name),
    duration,
    stepSubdivision,
    values: normalizeValueTrackerValues(item.values, duration, stepSubdivision)
  }
}

export function getValueTrackerLibraryItemById(valueTrackerLibraryItems = [], valueTrackerLibraryItemId) {
  if (typeof valueTrackerLibraryItemId !== 'string' || !valueTrackerLibraryItemId) {
    return null
  }

  return (Array.isArray(valueTrackerLibraryItems) ? valueTrackerLibraryItems : []).find(
    (item) => item?.id === valueTrackerLibraryItemId
  ) ?? null
}

export function resolveValueTrackerClipLibraryReference(clip, valueTrackerLibraryItems = []) {
  return getValueTrackerLibraryItemById(valueTrackerLibraryItems, clip?.valueTrackerLibraryItemId)
}

export function materializeValueTrackerClipLibraryReference(clip, valueTrackerLibraryItems = []) {
  const valueTrackerLibraryItem = resolveValueTrackerClipLibraryReference(clip, valueTrackerLibraryItems)

  if (!valueTrackerLibraryItem) {
    const duration = Number.isFinite(Number(clip?.duration)) ? Number(clip.duration) : 4
    const stepSubdivision = normalizeValueTrackerStepSubdivision(clip?.stepSubdivision)

    return {
      duration,
      stepSubdivision,
      values: normalizeValueTrackerValues(clip?.values, duration, stepSubdivision)
    }
  }

  return {
    duration: valueTrackerLibraryItem.duration,
    stepSubdivision: valueTrackerLibraryItem.stepSubdivision,
    values: [...valueTrackerLibraryItem.values]
  }
}

export function normalizeValueTrackerStepSubdivision(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
  }

  return Math.max(1, Math.round(numericValue))
}

export function normalizeValueTrackerValue(value, fallback = 0) {
  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) ? Math.round(numericValue) : fallback
  return clamp(normalizedValue, VALUE_TRACKER_MIN, VALUE_TRACKER_MAX)
}

export function normalizeValueTrackerEventValue(value) {
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

  return clamp(Math.round(numericValue), VALUE_TRACKER_MIN, VALUE_TRACKER_MAX)
}

export function isNumericValueTrackerInitializer(value) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return Boolean(trimmedValue) && Number.isFinite(Number(trimmedValue))
}

export function getValueTrackerStepCount(duration, stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION) {
  const normalizedDuration = Number(duration)

  if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
    return normalizeValueTrackerStepSubdivision(stepSubdivision)
  }

  return Math.max(
    1,
    Math.round(normalizedDuration * normalizeValueTrackerStepSubdivision(stepSubdivision))
  )
}

export function createEmptyValueTrackerValues(duration, stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION) {
  return Array.from({ length: getValueTrackerStepCount(duration, stepSubdivision) }, () => null)
}

export function createConstantValueTrackerValues(
  value,
  duration,
  stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
) {
  const stepCount = getValueTrackerStepCount(duration, stepSubdivision)
  const normalizedValue = normalizeValueTrackerValue(value)

  return Array.from(
    { length: stepCount },
    (_entry, index) => (index === 0 ? normalizedValue : null)
  )
}

export function normalizeValueTrackerValues(
  values,
  duration,
  stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION,
  options = {}
) {
  const stepCount = getValueTrackerStepCount(duration, stepSubdivision)
  const normalizedValues = Array.isArray(values) ? values : []

  if (options.mode === 'legacyDense') {
    return compressLegacyValueTrackerValues(normalizedValues, stepCount)
  }

  return Array.from({ length: stepCount }, (_entry, index) =>
    normalizeValueTrackerEventValue(normalizedValues[index])
  )
}

export function getValueTrackerResolvedValues(values, initialValue = null) {
  const normalizedValues = Array.isArray(values) ? values : []
  const resolvedValues = []
  let activeValue = normalizeValueTrackerEventValue(initialValue)

  for (const value of normalizedValues) {
    const eventValue = normalizeValueTrackerEventValue(value)

    if (eventValue !== null) {
      activeValue = eventValue
    }

    resolvedValues.push(activeValue)
  }

  return resolvedValues
}

export function getValueTrackerEventCount(values = []) {
  return (Array.isArray(values) ? values : []).reduce(
    (count, value) => count + (normalizeValueTrackerEventValue(value) === null ? 0 : 1),
    0
  )
}

export function resizeValueTrackerValues(
  values,
  {
    nextDuration,
    nextStart,
    previousDuration,
    previousStart,
    stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
  } = {}
) {
  const normalizedStepSubdivision = normalizeValueTrackerStepSubdivision(stepSubdivision)
  const nextStepCount = getValueTrackerStepCount(nextDuration, normalizedStepSubdivision)
  const normalizedValues = Array.isArray(values)
    ? values.map((value) => normalizeValueTrackerEventValue(value))
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

export function getValueTrackerValueAtTime(timeTicks, valueTrackerTrack, fallback = VALUE_TRACKER_MIN) {
  return getValueTrackerValueAtTimeWithLiveInput(timeTicks, valueTrackerTrack, fallback, null)
}

export function getValueTrackerValueAtTimeWithLiveInput(
  timeTicks,
  valueTrackerTrack,
  fallback = VALUE_TRACKER_MIN,
  liveInput = null
) {
  if (!Array.isArray(valueTrackerTrack?.clips) || !valueTrackerTrack.clips.length) {
    const normalizedLiveInput = normalizeValueTrackerLiveInput(liveInput)
    return normalizedLiveInput?.time <= timeTicks
      ? normalizedLiveInput.value
      : normalizeValueTrackerEventValue(fallback)
  }

  const timelineValue = getTimelineValueTrackerValueAtTime(timeTicks, valueTrackerTrack, fallback)
  const normalizedLiveInput = normalizeValueTrackerLiveInput(liveInput)

  if (!normalizedLiveInput || normalizedLiveInput.time > timeTicks) {
    return timelineValue
  }

  const nextEventTime = getNextValueTrackerEventTime(valueTrackerTrack, normalizedLiveInput.time)

  if (nextEventTime !== null && timeTicks >= nextEventTime) {
    return timelineValue
  }

  return normalizedLiveInput.value
}

export function getNextValueTrackerEventTime(valueTrackerTrack, afterTime) {
  const normalizedAfterTime = Number(afterTime)

  if (!Number.isFinite(normalizedAfterTime)) {
    return null
  }

  for (const clip of valueTrackerTrack?.clips ?? []) {
    const clipStart = Number(clip?.start)

    if (!Number.isFinite(clipStart)) {
      continue
    }

    const stepSubdivision = normalizeValueTrackerStepSubdivision(clip.stepSubdivision)
    const normalizedValues = normalizeValueTrackerValues(clip.values, clip.duration, stepSubdivision)

    for (let stepIndex = 0; stepIndex < normalizedValues.length; stepIndex += 1) {
      const eventValue = normalizeValueTrackerEventValue(normalizedValues[stepIndex])

      if (eventValue === null) {
        continue
      }

      const eventTime = clipStart + stepIndex / stepSubdivision

      if (eventTime > normalizedAfterTime) {
        return eventTime
      }
    }
  }

  return null
}

function getTimelineValueTrackerValueAtTime(timeTicks, valueTrackerTrack, fallback = VALUE_TRACKER_MIN) {
  let resolvedValue = normalizeValueTrackerEventValue(fallback)

  for (const clip of valueTrackerTrack.clips) {
    const clipStart = Number(clip?.start)

    if (!Number.isFinite(clipStart)) {
      continue
    }

    if (clipStart > timeTicks) {
      break
    }

    const stepSubdivision = normalizeValueTrackerStepSubdivision(clip.stepSubdivision)
    const maxStepIndex = clamp(
      Math.floor((timeTicks - clip.start) * stepSubdivision),
      0,
      getValueTrackerStepCount(clip.duration, stepSubdivision) - 1
    )

    for (let stepIndex = 0; stepIndex <= maxStepIndex; stepIndex += 1) {
      const eventValue = normalizeValueTrackerEventValue(clip.values?.[stepIndex])

      if (eventValue !== null) {
        resolvedValue = eventValue
      }
    }
  }

  return resolvedValue
}

export function getValueTrackerEventTicks(clip) {
  if (!clip) {
    return []
  }

  const stepSubdivision = normalizeValueTrackerStepSubdivision(clip.stepSubdivision)

  return normalizeValueTrackerValues(clip.values, clip.duration, stepSubdivision).flatMap((value, index) =>
    value === null ? [] : [Number(clip.start) + index / stepSubdivision]
  )
}

export function getValueTrackerRecordedStepIndex(timeTicks, startTick, stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION) {
  const normalizedTimeTicks = Number(timeTicks)
  const normalizedStartTick = Number(startTick)
  const normalizedStepSubdivision = normalizeValueTrackerStepSubdivision(stepSubdivision)

  if (!Number.isFinite(normalizedTimeTicks) || !Number.isFinite(normalizedStartTick)) {
    return -1
  }

  return Math.max(
    0,
    Math.floor((normalizedTimeTicks - normalizedStartTick) * normalizedStepSubdivision)
  )
}

export function createSparseRecordedValueTrackerValues(
  capturedSteps,
  {
    duration,
    initialValue = null,
    stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
  } = {}
) {
  const stepCount = getValueTrackerStepCount(duration, stepSubdivision)
  const nextValues = createEmptyValueTrackerValues(duration, stepSubdivision)
  const normalizedCapturedSteps = isRecord(capturedSteps) ? capturedSteps : {}
  let previousValue = normalizeValueTrackerEventValue(initialValue)

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    const capturedValue = normalizeValueTrackerEventValue(normalizedCapturedSteps[stepIndex])

    if (capturedValue === null) {
      continue
    }

    if (capturedValue !== previousValue) {
      nextValues[stepIndex] = capturedValue
    }

    previousValue = capturedValue
  }

  return nextValues
}

export function doesValueTrackerBindingMatchInput(binding, input = {}) {
  const normalizedBinding = createDefaultValueTrackerBinding(binding)
  const normalizedSource = normalizeNullableString(input?.source)

  if (!normalizedBinding.type || !normalizedSource || normalizedBinding.type !== normalizedSource) {
    return false
  }

  if (normalizedBinding.type === 'midiCc') {
    return doesMidiValueTrackerBindingMatch(normalizedBinding, input, 'controller')
  }

  if (normalizedBinding.type === 'midiNote') {
    return doesMidiValueTrackerBindingMatch(normalizedBinding, input, 'note')
  }

  if (normalizedBinding.type === 'keyboard') {
    return true
  }

  if (normalizedBinding.type === 'variable') {
    return normalizedBinding.variableName === normalizeNullableString(input?.variableName)
  }

  return false
}

export function getValueTrackerBindingSummary(binding, resolveDeviceName = null) {
  const normalizedBinding = createDefaultValueTrackerBinding(binding)

  if (normalizedBinding.type === 'keyboard') {
    return 'Keyboard target'
  }

  if (normalizedBinding.type === 'variable') {
    return normalizedBinding.variableName
      ? `Variable · ${normalizedBinding.variableName}`
      : 'Variable binding'
  }

  if (normalizedBinding.type === 'midiCc') {
    return [
      `MIDI CC ${normalizedBinding.controller ?? 'Any'}`,
      normalizedBinding.channel ? `Ch ${normalizedBinding.channel}` : 'Any ch',
      getValueTrackerBindingDeviceSummary(normalizedBinding.deviceId, resolveDeviceName)
    ].filter(Boolean).join(' · ')
  }

  if (normalizedBinding.type === 'midiNote') {
    return [
      `MIDI Note ${normalizedBinding.note ?? 'Any'}`,
      normalizedBinding.channel ? `Ch ${normalizedBinding.channel}` : 'Any ch',
      getValueTrackerBindingDeviceSummary(normalizedBinding.deviceId, resolveDeviceName)
    ].filter(Boolean).join(' · ')
  }

  return 'No binding'
}

export function getValueTrackerBoundVariableName(valueTrackerTrack) {
  if (valueTrackerTrack?.binding?.type !== 'variable') {
    return ''
  }

  return normalizeNullableString(valueTrackerTrack.binding.variableName) ?? ''
}

export function getBoundValueTrackerVariableNames(valueTrackerTracks = []) {
  return [...new Set(
    (Array.isArray(valueTrackerTracks) ? valueTrackerTracks : [])
      .map((valueTrackerTrack) => getValueTrackerBoundVariableName(valueTrackerTrack))
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

function doesMidiValueTrackerBindingMatch(binding, input, valueKey) {
  const inputDeviceId = normalizeNullableString(input?.deviceId)
  const inputChannel = normalizeNullableInteger(input?.channel)
  const inputValueKey = normalizeNullableInteger(input?.[valueKey])

  if (binding.deviceId && binding.deviceId !== inputDeviceId) {
    return false
  }

  if (binding.channel !== null && binding.channel !== inputChannel) {
    return false
  }

  if (binding[valueKey] !== null && binding[valueKey] !== inputValueKey) {
    return false
  }

  return true
}

function getValueTrackerBindingDeviceSummary(deviceId, resolveDeviceName) {
  if (!deviceId) {
    return 'Any device'
  }

  const resolvedDeviceName = typeof resolveDeviceName === 'function'
    ? normalizeNullableString(resolveDeviceName(deviceId))
    : null

  return resolvedDeviceName || 'Specific device'
}

function normalizeValueTrackerLiveInput(liveInput) {
  const time = Number(liveInput?.time)
  const value = normalizeValueTrackerEventValue(liveInput?.value)

  if (!Number.isFinite(time) || value === null) {
    return null
  }

  return {
    time: Math.max(0, time),
    value
  }
}

function compressLegacyValueTrackerValues(values, stepCount) {
  const denseValues = Array.from({ length: stepCount }, (_entry, index) =>
    normalizeValueTrackerValue(values[index], VALUE_TRACKER_MIN)
  )

  return denseValues.map((value, index) =>
    index === 0 || value !== denseValues[index - 1] ? value : null
  )
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
