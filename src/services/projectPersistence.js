import { createAudioEffect, normalizeMasterGain } from '@/services/audioEffectService'
import {
  MASTER_GAIN_AUTOMATION_LANE_ID,
  normalizeAutomationLanes
} from '@/services/automationService'
import {
  createTrackClip,
  createTrackId,
  createVariableTrack,
  createVariableTrackClip,
  createValueTrackerClip,
  createValueTrackerTrack,
  sortTrackClips,
  sortValueTrackerTrackClips,
  sortVariableTrackClips
} from '@/services/dawStoreService'
import {
  createEvalEffect,
  createStereoOffsetEvalEffect,
  getEvalEffectExpressions
} from '@/services/evalEffectService'
import { createFormula } from '@/services/formulaService'
import { DEFAULT_BPM_MEASURE, normalizeBpmMeasureExpression } from '@/services/bpmService'
import {
  normalizeTrackLaneHeight,
  normalizeValueTrackerTrackHeight,
  normalizeVariableTrackHeight
} from '@/services/timelineLaneLayoutService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import {
  collectAutoVariableTrackNames,
  getNextVariableTrackName,
  normalizeVariableTrackName
} from '@/services/variableTrackService'
import {
  createValueTrackerLibraryItem,
  createConstantValueTrackerValues,
  getBoundValueTrackerVariableNames,
  normalizeValueTrackerStepSubdivision,
  normalizeValueTrackerTrackName,
  normalizeValueTrackerValues
} from '@/services/valueTrackerService'
import { DEFAULT_FORMULA_DROP_DURATION } from '@/services/timelineService'
import { DEFAULT_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { DEFAULT_TRACK_COLOR, getTrackColor } from '@/utils/colorUtils'
import { BASE_TICK_SIZE, MAX_ZOOM, MIN_ZOOM, TIMELINE_SNAP_SUBDIVISIONS, clamp } from '@/utils/timeUtils'

const PROJECT_STORAGE_KEY = 'dawbeat-project'
const PROJECT_VERSION = 16
const SAVE_DEBOUNCE_MS = 400
const DEFAULT_LOOP_START = 0
const DEFAULT_LOOP_END = 16
const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const SUPPORTED_PROJECT_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, PROJECT_VERSION])

export function serializeProject(state) {
  return normalizeProjectPayload({
    version: PROJECT_VERSION,
    tracks: state.tracks,
    variableTracks: state.variableTracks,
    valueTrackerTracks: state.valueTrackerTracks,
    valueTrackerLibraryItems: state.valueTrackerLibraryItems,
    formulas: state.formulas,
    zoom: state.zoom,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
    loopEnabled: state.loopEnabled,
    audioEffects: state.audioEffects,
    evalEffects: state.evalEffects,
    automationLanes: state.automationLanes,
    bpmMeasure: state.bpmMeasure,
    masterGain: state.masterGain,
    sampleRate: state.sampleRate,
    tickSize: state.tickSize,
    showClipWaveforms: state.showClipWaveforms,
    showEvaluatedPanel: state.showEvaluatedPanel
  })
}

export function saveProject(state) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const project = serializeProject(state)

  if (!project) {
    return
  }

  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
}

export function loadProject() {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const rawProject = localStorage.getItem(PROJECT_STORAGE_KEY)

  if (!rawProject) {
    return null
  }

  return parseProjectJson(rawProject)
}

export function clearProjectStorage() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(PROJECT_STORAGE_KEY)
}

export function parseProjectJson(rawProject) {
  try {
    const project = JSON.parse(rawProject)
    return normalizeProject(project)
  } catch {
    return null
  }
}

export function normalizeProject(project) {
  return normalizeProjectPayload(project)
}

export async function importProjectFile(file) {
  if (!file) {
    throw new Error('No se selecciono ningun archivo.')
  }

  const rawProject = await file.text()
  const project = parseProjectJson(rawProject)

  if (!project) {
    throw new Error('El archivo JSON no contiene un proyecto valido de DawBeat.')
  }

  return project
}

export function downloadProjectFile(state, filename = createProjectFilename()) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('La descarga de archivos no esta disponible en este entorno.')
  }

  const project = serializeProject(state)

  if (!project) {
    throw new Error('No se pudo serializar el proyecto actual.')
  }

  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

export function setupProjectPersistence(store) {
  let saveTimeoutId = 0

  store.$subscribe(
    (_mutation, state) => {
      window.clearTimeout(saveTimeoutId)
      saveTimeoutId = window.setTimeout(() => {
        saveProject(state)
      }, SAVE_DEBOUNCE_MS)
    },
    { detached: true }
  )
}

function ensureNamedValueTrackerTracks(valueTrackerTracks, variableTrackNames = [], trackName = 'Value Tracker') {
  if (!Array.isArray(variableTrackNames) || !variableTrackNames.length) {
    return
  }

  for (const variableTrackName of variableTrackNames) {
    if (getBoundValueTrackerVariableNames(valueTrackerTracks).includes(variableTrackName)) {
      continue
    }

    const nextValueTrackerTrack = createValueTrackerTrack({
      binding: {
        type: 'variable',
        variableName: variableTrackName
      },
      name: trackName
    })

    nextValueTrackerTrack.clips.push(createValueTrackerClip({
      duration: DEFAULT_FORMULA_DROP_DURATION,
      start: 0,
      values: createConstantValueTrackerValues(0, DEFAULT_FORMULA_DROP_DURATION)
    }))
    sortValueTrackerTrackClips(nextValueTrackerTrack)
    valueTrackerTracks.unshift(nextValueTrackerTrack)
  }
}

function normalizeProjectPayload(project) {
  if (!isRecord(project)) {
    return null
  }

  if (typeof project.version === 'number' && !SUPPORTED_PROJECT_VERSIONS.has(project.version)) {
    return null
  }

  if (!Array.isArray(project.tracks) || !Array.isArray(project.formulas)) {
    return null
  }

  const formulas = project.formulas
    .filter(isRecord)
    .map((formula) => createFormula(formula))
  const formulaIds = new Set(formulas.map((formula) => formula.id))
  const usedVariableTrackNames = new Set()
  const tracks = project.tracks
    .map((track) => normalizeTrack(track, formulaIds))
    .filter(Boolean)
  const variableTracks = Array.isArray(project.variableTracks)
    ? project.variableTracks
        .map((variableTrack) => normalizeVariableTrack(variableTrack, usedVariableTrackNames))
        .filter(Boolean)
    : []
  const valueTrackerTracks = Array.isArray(project.valueTrackerTracks)
    ? project.valueTrackerTracks
        .map((valueTrackerTrack) => normalizeValueTrackerTrack(valueTrackerTrack, project.version))
        .filter(Boolean)
    : []
  const valueTrackerLibraryItems = Array.isArray(project.valueTrackerLibraryItems)
    ? project.valueTrackerLibraryItems
        .map((item) => normalizeValueTrackerLibraryItem(item, project.version))
        .filter(Boolean)
    : []
  const valueTrackerLibraryItemsById = new Map(
    valueTrackerLibraryItems.map((item) => [item.id, item])
  )
  const evalEffects = hasOwn(project, 'evalEffects')
    ? normalizeEvalEffects(project.evalEffects)
    : [createStereoOffsetEvalEffect({ id: 'fx1' })]
  ensureNamedValueTrackerTracks(
    valueTrackerTracks,
    collectAutoVariableTrackNames(
      evalEffects
        .filter((effect) => effect?.type === 'stereoOffset')
        .flatMap((effect) => getEvalEffectExpressions(effect))
    ),
    'Stereo Offset'
  )
  ensureNamedValueTrackerTracks(
    valueTrackerTracks,
    collectAutoVariableTrackNames(
      evalEffects
        .filter((effect) => effect?.type === 'tReplacement')
        .flatMap((effect) => getEvalEffectExpressions(effect))
    ),
    'T Replacement'
  )

  for (const valueTrackerTrack of valueTrackerTracks) {
    for (const clip of valueTrackerTrack.clips ?? []) {
      const valueTrackerLibraryItem = valueTrackerLibraryItemsById.get(clip.valueTrackerLibraryItemId)

      if (!valueTrackerLibraryItem) {
        clip.valueTrackerLibraryItemId = null
        continue
      }

      clip.duration = valueTrackerLibraryItem.duration
      clip.stepSubdivision = valueTrackerLibraryItem.stepSubdivision
      clip.values = [...valueTrackerLibraryItem.values]
    }
  }

  const boundValueTrackerVariableNames = new Set(getBoundValueTrackerVariableNames(valueTrackerTracks))
  const requiredAutoVariableTrackNames = collectAutoVariableTrackNames([
    ...formulas.map((formula) => formula.code),
    ...collectTrackInlineFormulas(tracks),
    ...collectVariableTrackFormulas(variableTracks)
  ])

  for (const variableTrackName of requiredAutoVariableTrackNames) {
    if (usedVariableTrackNames.has(variableTrackName) || boundValueTrackerVariableNames.has(variableTrackName)) {
      continue
    }

    variableTracks.push(createVariableTrack({ name: variableTrackName }))
    usedVariableTrackNames.add(variableTrackName)
  }

  const loopStart = normalizeNonNegativeNumber(project.loopStart, DEFAULT_LOOP_START)
  const loopEnd = Math.max(
    normalizeNonNegativeNumber(project.loopEnd, DEFAULT_LOOP_END),
    loopStart + MIN_LOOP_DURATION
  )

  return {
    version: PROJECT_VERSION,
    tracks,
    variableTracks,
    valueTrackerTracks,
    valueTrackerLibraryItems,
    formulas,
    zoom: clamp(normalizeNumber(project.zoom, 1), MIN_ZOOM, MAX_ZOOM),
    loopStart,
    loopEnd,
    loopEnabled: typeof project.loopEnabled === 'boolean' ? project.loopEnabled : false,
    audioEffects: hasOwn(project, 'audioEffects')
      ? normalizeAudioEffects(project.audioEffects)
      : [],
    evalEffects,
    automationLanes: normalizeProjectAutomationLanes(project),
    bpmMeasure: normalizeBpmMeasureExpression(project.bpmMeasure, DEFAULT_BPM_MEASURE),
    masterGain: normalizeMasterGain(project.masterGain),
    sampleRate: normalizeSampleRate(project.sampleRate, DEFAULT_SAMPLE_RATE),
    tickSize: normalizePositiveNumber(project.tickSize, BASE_TICK_SIZE),
    showClipWaveforms: hasOwn(project, 'showClipWaveforms')
      ? Boolean(project.showClipWaveforms)
      : true,
    showEvaluatedPanel: hasOwn(project, 'showEvaluatedPanel')
      ? Boolean(project.showEvaluatedPanel)
      : true
  }
}

function normalizeProjectAutomationLanes(project) {
  const automationLanes = normalizeAutomationLanes(project.automationLanes)

  if (project.version !== 7) {
    return automationLanes
  }

  if (automationLanes.length !== 1) {
    return automationLanes
  }

  const lane = automationLanes[0]

  if (lane.id !== MASTER_GAIN_AUTOMATION_LANE_ID || lane.points.length !== 1) {
    return automationLanes
  }

  const [point] = lane.points

  if (point.time === 0 && point.value === 1) {
    return []
  }

  return automationLanes
}

function normalizeTrack(track, formulaIds) {
  if (!isRecord(track)) {
    return null
  }

  const nextTrack = {
    id: typeof track.id === 'string' && track.id ? track.id : createTrackId(),
    color: typeof track.color === 'string' ? getTrackColor(track.color) : DEFAULT_TRACK_COLOR,
    muted: Boolean(track.muted),
    soloed: Boolean(track.soloed),
    unionOperator: normalizeTrackUnionOperator(track.unionOperator),
    name: typeof track.name === 'string' && track.name.trim() ? track.name.trim() : undefined,
    height: normalizeTrackLaneHeight(track.height),
    clips: Array.isArray(track.clips)
      ? track.clips.map((clip) => normalizeClip(clip, formulaIds)).filter(Boolean)
      : []
  }

  sortTrackClips(nextTrack)
  return nextTrack
}

function normalizeVariableTrack(variableTrack, usedNames) {
  if (!isRecord(variableTrack)) {
    return null
  }

  const fallbackName = getNextVariableTrackName(
    [...usedNames].map((name) => ({ name }))
  )
  const normalizedName = normalizeVariableTrackName(variableTrack.name, fallbackName)
  const nextName = usedNames.has(normalizedName) ? fallbackName : normalizedName

  usedNames.add(nextName)

  const nextVariableTrack = createVariableTrack({
    height: normalizeVariableTrackHeight(variableTrack.height),
    name: nextName,
    clips: Array.isArray(variableTrack.clips)
      ? variableTrack.clips.map((clip) => normalizeVariableClip(clip)).filter(Boolean)
      : []
  })

  sortVariableTrackClips(nextVariableTrack)
  return nextVariableTrack
}

function normalizeValueTrackerTrack(valueTrackerTrack, projectVersion) {
  if (!isRecord(valueTrackerTrack)) {
    return null
  }

  const nextValueTrackerTrack = createValueTrackerTrack({
    id: typeof valueTrackerTrack.id === 'string' && valueTrackerTrack.id ? valueTrackerTrack.id : undefined,
    height: normalizeValueTrackerTrackHeight(valueTrackerTrack.height),
    name: normalizeValueTrackerTrackName(valueTrackerTrack.name),
    binding: valueTrackerTrack.binding,
    clips: Array.isArray(valueTrackerTrack.clips)
      ? valueTrackerTrack.clips
          .map((clip) => normalizeValueTrackerClip(clip, projectVersion))
          .filter(Boolean)
      : []
  })

  sortValueTrackerTrackClips(nextValueTrackerTrack)
  return nextValueTrackerTrack
}

function normalizeValueTrackerLibraryItem(item, projectVersion) {
  if (!isRecord(item)) {
    return null
  }

  return createValueTrackerLibraryItem({
    duration: normalizePositiveNumber(item.duration, 4),
    id: typeof item.id === 'string' && item.id ? item.id : undefined,
    name: typeof item.name === 'string' ? item.name : undefined,
    stepSubdivision: normalizeValueTrackerStepSubdivision(item.stepSubdivision),
    values: normalizeValueTrackerValues(
      item.values,
      normalizePositiveNumber(item.duration, 4),
      normalizeValueTrackerStepSubdivision(item.stepSubdivision),
      projectVersion <= 12 ? { mode: 'legacyDense' } : undefined
    )
  })
}

function normalizeClip(clip, formulaIds) {
  if (!isRecord(clip)) {
    return null
  }

  const hasValidFormulaId =
    typeof clip.formulaId === 'string' && clip.formulaId && formulaIds.has(clip.formulaId)

  return createTrackClip({
    id: typeof clip.id === 'string' && clip.id ? clip.id : undefined,
    formula: hasValidFormulaId ? null : typeof clip.formula === 'string' ? clip.formula : null,
    formulaId: hasValidFormulaId ? clip.formulaId : null,
    formulaName:
      !hasValidFormulaId && typeof clip.formulaName === 'string' ? clip.formulaName : null,
    start: normalizeNonNegativeNumber(clip.start, 0),
    duration: normalizePositiveNumber(clip.duration, 4)
  })
}

function normalizeVariableClip(clip) {
  if (!isRecord(clip)) {
    return null
  }

  return createVariableTrackClip({
    id: typeof clip.id === 'string' && clip.id ? clip.id : undefined,
    formula: typeof clip.formula === 'string' ? clip.formula : undefined,
    start: normalizeNonNegativeNumber(clip.start, 0),
    duration: normalizePositiveNumber(clip.duration, 4)
  })
}

function normalizeValueTrackerClip(clip, projectVersion) {
  if (!isRecord(clip)) {
    return null
  }

  const duration = normalizePositiveNumber(clip.duration, 4)
  const stepSubdivision = normalizeValueTrackerStepSubdivision(clip.stepSubdivision)
  const values = normalizeValueTrackerValues(
    clip.values,
    duration,
    stepSubdivision,
    projectVersion === 10
      ? { mode: 'legacyDense' }
      : undefined
  )

  return createValueTrackerClip({
    id: typeof clip.id === 'string' && clip.id ? clip.id : undefined,
    start: normalizeNonNegativeNumber(clip.start, 0),
    duration,
    stepSubdivision,
    valueTrackerLibraryItemId:
      typeof clip.valueTrackerLibraryItemId === 'string' && clip.valueTrackerLibraryItemId
        ? clip.valueTrackerLibraryItemId
        : null,
    values
  })
}

function normalizeAudioEffects(audioEffects) {
  if (!Array.isArray(audioEffects)) {
    return []
  }

  return audioEffects
    .filter(isRecord)
    .map((effect) => createAudioEffect(effect))
    .filter(Boolean)
}

function normalizeEvalEffects(evalEffects) {
  if (!Array.isArray(evalEffects)) {
    return []
  }

  return evalEffects.filter(isRecord).map((effect) => createEvalEffect(effect))
}

function collectTrackInlineFormulas(tracks) {
  if (!Array.isArray(tracks)) {
    return []
  }

  return tracks.flatMap((track) =>
    Array.isArray(track?.clips)
      ? track.clips
          .map((clip) => (typeof clip?.formula === 'string' ? clip.formula : ''))
          .filter(Boolean)
      : []
  )
}

function collectVariableTrackFormulas(variableTracks) {
  if (!Array.isArray(variableTracks)) {
    return []
  }

  return variableTracks.flatMap((variableTrack) =>
    Array.isArray(variableTrack?.clips)
      ? variableTrack.clips
          .map((clip) => (typeof clip?.formula === 'string' ? clip.formula : ''))
          .filter(Boolean)
      : []
  )
}

function normalizeNumber(value, fallback) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeNonNegativeNumber(value, fallback) {
  return Math.max(0, normalizeNumber(value, fallback))
}

function normalizePositiveNumber(value, fallback) {
  return Math.max(Number.EPSILON, normalizeNumber(value, fallback))
}

function createProjectFilename(now = new Date()) {
  const normalizedDate = now.toISOString().replace(/[:.]/g, '-')
  return `dawbeat-project-${normalizedDate}.json`
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}
