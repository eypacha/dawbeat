import { tokenizeFormulaWithOptions } from '@/utils/formulaTokenizer'
import {
  getBoundValueTrackerVariableNames,
  getValueTrackerEventTicks,
  getValueTrackerBoundVariableName,
  getValueTrackerValueAtTimeWithLiveInput
} from '@/services/valueTrackerService'

const VARIABLE_TRACK_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/
export const AUTO_VARIABLE_TRACK_NAMES = Object.freeze('abcdefghijklmnop'.split(''))
const AUTO_VARIABLE_TRACK_NAME_SET = new Set(AUTO_VARIABLE_TRACK_NAMES)

export const DEFAULT_VARIABLE_CLIP_FORMULA = '0'

export function isValidVariableTrackName(value) {
  return typeof value === 'string' && VARIABLE_TRACK_NAME_PATTERN.test(value.trim())
}

export function normalizeVariableTrackName(value, fallback = 'a') {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return isValidVariableTrackName(trimmedValue) ? trimmedValue : fallback
}

export function getNextVariableTrackName(variableTracks = []) {
  const usedNames = new Set(
    Array.isArray(variableTracks)
      ? variableTracks
          .map((variableTrack) => normalizeVariableTrackName(variableTrack?.name, ''))
          .filter(Boolean)
      : []
  )

  let index = 0

  while (usedNames.has(getVariableTrackNameFromIndex(index))) {
    index += 1
  }

  return getVariableTrackNameFromIndex(index)
}

export function getNextAvailableVariableTrackName(variableTracks = [], valueTrackerTracks = []) {
  const usedNames = new Set([
    ...(Array.isArray(variableTracks)
      ? variableTracks
          .map((variableTrack) => normalizeVariableTrackName(variableTrack?.name, ''))
          .filter(Boolean)
      : []),
    ...getBoundValueTrackerVariableNames(valueTrackerTracks)
  ])

  let index = 0

  while (usedNames.has(getVariableTrackNameFromIndex(index))) {
    index += 1
  }

  return getVariableTrackNameFromIndex(index)
}

export function getFormulaAllowedIdentifiers(variableTracks = [], valueTrackerTracks = []) {
  const existingNames = Array.isArray(variableTracks)
    ? variableTracks
        .map((variableTrack) => normalizeVariableTrackName(variableTrack?.name, ''))
        .filter(Boolean)
    : []
  const valueTrackerNames = getBoundValueTrackerVariableNames(valueTrackerTracks)

  return [...new Set([...existingNames, ...valueTrackerNames, ...AUTO_VARIABLE_TRACK_NAMES])]
}

export function extractAutoVariableTrackNames(expression = '') {
  const usedNames = new Set()

  for (const token of tokenizeFormulaWithOptions(expression)) {
    if (!AUTO_VARIABLE_TRACK_NAME_SET.has(token.value) || usedNames.has(token.value)) {
      continue
    }

    usedNames.add(token.value)
  }

  return [...usedNames]
}

export function collectAutoVariableTrackNames(expressions = []) {
  const usedNames = new Set()

  for (const expression of expressions) {
    for (const variableTrackName of extractAutoVariableTrackNames(expression)) {
      usedNames.add(variableTrackName)
    }
  }

  return [...usedNames]
}

export function collectFormulaReferencedVariableNames(
  expression = '',
  variableTracks = [],
  valueTrackerTracks = []
) {
  const allowedIdentifiers = getFormulaAllowedIdentifiers(variableTracks, valueTrackerTracks)
  const variableTrackByName = new Map(
    (Array.isArray(variableTracks) ? variableTracks : [])
      .filter((variableTrack) => typeof variableTrack?.name === 'string' && variableTrack.name)
      .map((variableTrack) => [variableTrack.name, variableTrack])
  )
  const boundValueTrackerNames = new Set(getBoundValueTrackerVariableNames(valueTrackerTracks))
  const pendingNames = [...getExpressionReferencedVariableNames(expression, allowedIdentifiers)]
  const referencedNames = new Set()

  while (pendingNames.length) {
    const variableName = pendingNames.pop()

    if (referencedNames.has(variableName)) {
      continue
    }

    referencedNames.add(variableName)

    const variableTrack = variableTrackByName.get(variableName)

    if (!variableTrack) {
      continue
    }

    for (const clip of variableTrack.clips ?? []) {
      for (const nextVariableName of getExpressionReferencedVariableNames(
        resolveVariableClipFormula(clip),
        allowedIdentifiers
      )) {
        if (!referencedNames.has(nextVariableName)) {
          pendingNames.push(nextVariableName)
        }
      }
    }
  }

  return [...referencedNames].filter((variableName) =>
    variableTrackByName.has(variableName) || boundValueTrackerNames.has(variableName)
  )
}

export function getVariableDefinitionChangeTicksInRange(
  startTick,
  endTick,
  variableTracks = [],
  valueTrackerTracks = [],
  variableNames = []
) {
  const normalizedStartTick = Number(startTick)
  const normalizedEndTick = Number(endTick)

  if (
    !Number.isFinite(normalizedStartTick) ||
    !Number.isFinite(normalizedEndTick) ||
    normalizedEndTick <= normalizedStartTick
  ) {
    return []
  }

  const trackedVariableNames = new Set(
    (Array.isArray(variableNames) ? variableNames : []).filter(
      (variableName) => typeof variableName === 'string' && variableName
    )
  )

  if (!trackedVariableNames.size) {
    return []
  }

  const changeTicks = new Set()

  for (const variableTrack of variableTracks ?? []) {
    if (!trackedVariableNames.has(variableTrack?.name)) {
      continue
    }

    for (const clip of variableTrack.clips ?? []) {
      const clipStart = Number(clip?.start)

      if (clipStart > normalizedStartTick && clipStart < normalizedEndTick) {
        changeTicks.add(clipStart)
      }
    }
  }

  for (const valueTrackerTrack of valueTrackerTracks ?? []) {
    const variableName = getValueTrackerBoundVariableName(valueTrackerTrack)

    if (!trackedVariableNames.has(variableName)) {
      continue
    }

    for (const clip of valueTrackerTrack.clips ?? []) {
      for (const eventTick of getValueTrackerEventTicks(clip)) {
        if (eventTick > normalizedStartTick && eventTick < normalizedEndTick) {
          changeTicks.add(eventTick)
        }
      }
    }
  }

  return [...changeTicks].sort((leftTick, rightTick) => leftTick - rightTick)
}

export function resolveVariableClipFormula(clip) {
  return typeof clip?.formula === 'string' && clip.formula.trim()
    ? clip.formula
    : DEFAULT_VARIABLE_CLIP_FORMULA
}

export function getActiveVariableDefinitions(
  timeTicks,
  variableTracks = [],
  valueTrackerTracks = [],
  valueTrackerLiveInputs = {}
) {
  const definitionsByName = new Map()

  for (const variableTrack of variableTracks) {
    if (typeof variableTrack?.name !== 'string' || !variableTrack.name) {
      continue
    }

    definitionsByName.set(variableTrack.name, {
      formula: resolveVariableTrackFormulaAtTime(timeTicks, variableTrack),
      name: variableTrack.name
    })
  }

  for (const valueTrackerTrack of valueTrackerTracks) {
    const variableName = getValueTrackerBoundVariableName(valueTrackerTrack)

    if (!variableName) {
      continue
    }

    definitionsByName.set(variableName, {
      formula: String(
        getValueTrackerValueAtTimeWithLiveInput(
          timeTicks,
          valueTrackerTrack,
          0,
          valueTrackerLiveInputs?.[valueTrackerTrack.id] ?? null
        )
      ),
      name: variableName
    })
  }

  return [...definitionsByName.values()]
}

export function prependVariableDefinitions(expression, variableDefinitions = []) {
  if (typeof expression !== 'string' || !expression.trim()) {
    return null
  }

  const definitionsPrefix = variableDefinitions
    .map((entry) => `${entry.name}=(${resolveVariableFormula(entry.formula)})`)
    .join(',')

  return definitionsPrefix ? `${definitionsPrefix},${expression}` : expression
}

function getExpressionReferencedVariableNames(expression, allowedIdentifiers) {
  const referencedNames = new Set()

  for (const token of tokenizeFormulaWithOptions(expression, { allowedIdentifiers })) {
    if (token.type === 'identifier') {
      referencedNames.add(token.value)
    }
  }

  return [...referencedNames]
}

function resolveVariableTrackFormulaAtTime(timeTicks, variableTrack) {
  if (!Array.isArray(variableTrack?.clips) || !variableTrack.clips.length) {
    return DEFAULT_VARIABLE_CLIP_FORMULA
  }

  let lastFormula = DEFAULT_VARIABLE_CLIP_FORMULA

  for (const clip of variableTrack.clips) {
    const clipStart = Number(clip?.start)

    if (!Number.isFinite(clipStart)) {
      continue
    }

    if (timeTicks < clipStart) {
      break
    }

    lastFormula = resolveVariableClipFormula(clip)

    const clipDuration = Number(clip?.duration)
    const clipEnd = clipStart + (Number.isFinite(clipDuration) ? clipDuration : 0)

    if (timeTicks >= clipStart && timeTicks < clipEnd) {
      return lastFormula
    }
  }

  return lastFormula
}

function resolveVariableFormula(formula) {
  return typeof formula === 'string' && formula.trim() ? formula : DEFAULT_VARIABLE_CLIP_FORMULA
}

function getVariableTrackNameFromIndex(index) {
  let normalizedIndex = Math.max(0, Math.floor(index))
  let name = ''

  do {
    name = String.fromCharCode(97 + (normalizedIndex % 26)) + name
    normalizedIndex = Math.floor(normalizedIndex / 26) - 1
  } while (normalizedIndex >= 0)

  return name
}
