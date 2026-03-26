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
import {
  createClipFormulaFields,
  getClipFormulaExpressions
} from '@/services/formulaService'
import { DEFAULT_BPM_MEASURE, normalizeBpmMeasureExpression } from '@/services/bpmService'
import {
  normalizeTrackLaneHeight,
  normalizeValueTrackerTrackHeight,
  normalizeVariableTrackHeight
} from '@/services/timelineLaneLayoutService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { normalizeTimelineSectionLabels } from '@/services/timelineSectionLabelService'
import {
  collectAutoVariableTrackNames,
  getNextAvailableVariableTrackName,
  getNextVariableTrackName,
  normalizeVariableTrackName
} from '@/services/variableTrackService'
import {
  createConstantValueTrackerValues,
  getBoundValueTrackerVariableNames,
  normalizeValueTrackerStepSubdivision,
  normalizeValueTrackerTrackName,
  normalizeValueTrackerValues
} from '@/services/valueTrackerService'
import { DEFAULT_FORMULA_DROP_DURATION } from '@/services/timelineService'
import { createGroupId, normalizeClipGroupId } from '@/services/groupService'
import { DEFAULT_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import {
  createProjectFilenameFromTitle,
  DEFAULT_PROJECT_TITLE,
  normalizeProjectTitle
} from '@/utils/projectTitle'
import { DEFAULT_TRACK_COLOR, getTrackColor } from '@/utils/colorUtils'
import {
  BASE_TICK_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  TIMELINE_SNAP_SUBDIVISIONS,
  clamp,
  normalizeSnapSubdivisions
} from '@/utils/timeUtils'

const PROJECT_STORAGE_KEY = 'dawbeat-project'
const PROJECT_VERSION = 23
const SAVE_DEBOUNCE_MS = 400
const DEFAULT_LOOP_START = 0
const DEFAULT_LOOP_END = 16
const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const SUPPORTED_PROJECT_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, PROJECT_VERSION])

export function serializeProject(state) {
  return normalizeProjectPayload({
    version: PROJECT_VERSION,
    projectTitle: state.projectTitle,
    tracks: state.tracks,
    variableTracks: state.variableTracks,
    valueTrackerTracks: state.valueTrackerTracks,
    groups: state.groups,
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
    timelineSectionLabels: state.timelineSectionLabels,
    showClipWaveforms: state.showClipWaveforms,
    showEvaluatedPanel: state.showEvaluatedPanel,
    timelineAutoscrollEnabled: state.timelineAutoscrollEnabled,
    snapToGridEnabled: state.snapToGridEnabled,
    snapSubdivision: state.snapSubdivision
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

export function downloadProjectFile(state, filename = createProjectFilename(state?.projectTitle)) {
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

function ensureNamedValueTrackerTracks(
  valueTrackerTracks,
  variableTrackNames = [],
  trackName = 'Value Tracker',
  reservedVariableNames = new Set()
) {
  if (!Array.isArray(variableTrackNames) || !variableTrackNames.length) {
    return
  }

  for (const variableTrackName of variableTrackNames) {
    if (
      reservedVariableNames.has(variableTrackName) ||
      getBoundValueTrackerVariableNames(valueTrackerTracks).includes(variableTrackName)
    ) {
      continue
    }

    const nextValueTrackerTrack = createValueTrackerTrack({
      name: trackName,
      variableName: variableTrackName
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

  if (!Array.isArray(project.tracks)) {
    return null
  }

  const usedVariableTrackNames = new Set()
  const tracks = project.tracks
    .map((track) => normalizeTrack(track))
    .filter(Boolean)
  const variableTracks = Array.isArray(project.variableTracks)
    ? project.variableTracks
        .map((variableTrack) => normalizeVariableTrack(variableTrack, usedVariableTrackNames))
        .filter(Boolean)
    : []
  const valueTrackerTracks = Array.isArray(project.valueTrackerTracks)
    ? project.valueTrackerTracks
        .map((valueTrackerTrack) =>
          normalizeValueTrackerTrack(valueTrackerTrack, project.version, usedVariableTrackNames)
        )
        .filter(Boolean)
    : []
  const groups = normalizeGroups(project.groups, tracks, variableTracks, valueTrackerTracks)
  const clipGroupIdByClipId = new Map(
    groups.flatMap((group) => group.clips.map((groupClip) => [groupClip.clipId, group.id]))
  )

  for (const clip of collectAllTimelineClips(tracks, variableTracks, valueTrackerTracks)) {
    clip.groupId = clipGroupIdByClipId.get(clip.id) ?? null
  }
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
    'Stereo Offset',
    usedVariableTrackNames
  )
  ensureNamedValueTrackerTracks(
    valueTrackerTracks,
    collectAutoVariableTrackNames(
      evalEffects
        .filter((effect) => effect?.type === 'tReplacement')
        .flatMap((effect) => getEvalEffectExpressions(effect))
    ),
    'T Replacement',
    usedVariableTrackNames
  )

  const boundValueTrackerVariableNames = new Set(getBoundValueTrackerVariableNames(valueTrackerTracks))
  const requiredAutoVariableTrackNames = collectAutoVariableTrackNames([
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
    projectTitle: normalizeProjectTitle(project.projectTitle, DEFAULT_PROJECT_TITLE),
    tracks,
    variableTracks,
    valueTrackerTracks,
    groups,
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
    timelineSectionLabels: normalizeTimelineSectionLabels(project.timelineSectionLabels),
    showClipWaveforms: hasOwn(project, 'showClipWaveforms')
      ? Boolean(project.showClipWaveforms)
      : true,
    showEvaluatedPanel: hasOwn(project, 'showEvaluatedPanel')
      ? Boolean(project.showEvaluatedPanel)
      : true,
    timelineAutoscrollEnabled: hasOwn(project, 'timelineAutoscrollEnabled')
      ? Boolean(project.timelineAutoscrollEnabled)
      : true,
    snapToGridEnabled: hasOwn(project, 'snapToGridEnabled')
      ? Boolean(project.snapToGridEnabled)
      : true,
    snapSubdivision: hasOwn(project, 'snapSubdivision')
      ? normalizeSnapSubdivisions(project.snapSubdivision)
      : TIMELINE_SNAP_SUBDIVISIONS
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

function normalizeTrack(track) {
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
      ? track.clips.map((clip) => normalizeClip(clip)).filter(Boolean)
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

function normalizeValueTrackerTrack(valueTrackerTrack, projectVersion, usedVariableNames = new Set()) {
  if (!isRecord(valueTrackerTrack)) {
    return null
  }

  const legacyVariableName = valueTrackerTrack?.binding?.type === 'variable'
    ? valueTrackerTrack.binding.variableName
    : ''
  const preferredVariableName = normalizeVariableTrackName(
    valueTrackerTrack.variableName ?? legacyVariableName,
    ''
  )
  const nextVariableName =
    preferredVariableName && !usedVariableNames.has(preferredVariableName)
      ? preferredVariableName
      : getNextAvailableVariableTrackName(
          [...usedVariableNames].map((name) => ({ name }))
        )

  usedVariableNames.add(nextVariableName)

  const nextValueTrackerTrack = createValueTrackerTrack({
    id: typeof valueTrackerTrack.id === 'string' && valueTrackerTrack.id ? valueTrackerTrack.id : undefined,
    height: normalizeValueTrackerTrackHeight(valueTrackerTrack.height),
    name: normalizeValueTrackerTrackName(valueTrackerTrack.name),
    variableName: nextVariableName,
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

function normalizeClip(clip) {
  if (!isRecord(clip)) {
    return null
  }

  const formulaFields = createClipFormulaFields(clip)

  return createTrackClip({
    id: typeof clip.id === 'string' && clip.id ? clip.id : undefined,
    ...formulaFields,
    groupId: normalizeClipGroupId(clip.groupId),
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
    groupId: normalizeClipGroupId(clip.groupId),
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
    groupId: normalizeClipGroupId(clip.groupId),
    start: normalizeNonNegativeNumber(clip.start, 0),
    duration,
    stepSubdivision,
    values
  })
}

function collectAllTimelineClips(tracks, variableTracks, valueTrackerTracks) {
  return [
    ...tracks.flatMap((track) => track?.clips ?? []),
    ...variableTracks.flatMap((variableTrack) => variableTrack?.clips ?? []),
    ...valueTrackerTracks.flatMap((valueTrackerTrack) => valueTrackerTrack?.clips ?? [])
  ]
}

function normalizeGroups(groups, tracks, variableTracks, valueTrackerTracks) {
  if (!Array.isArray(groups)) {
    return []
  }

  const validClipIds = new Set(
    collectAllTimelineClips(tracks, variableTracks, valueTrackerTracks).map((clip) => clip.id)
  )
  const assignedClipIds = new Set()
  const normalizedGroups = []

  for (const [groupIndex, group] of groups.entries()) {
    if (!isRecord(group)) {
      continue
    }

    const normalizedClips = []

    for (const groupClip of Array.isArray(group.clips) ? group.clips : []) {
      if (!isRecord(groupClip)) {
        continue
      }

      const clipId = typeof groupClip.clipId === 'string' && groupClip.clipId
      if (!clipId || !validClipIds.has(clipId) || assignedClipIds.has(clipId)) {
        continue
      }

      assignedClipIds.add(clipId)
      normalizedClips.push({
        clipId,
        timeOffset: normalizeNonNegativeNumber(groupClip.timeOffset, 0),
        trackOffset: Math.max(0, Math.floor(normalizeNumber(groupClip.trackOffset, 0)))
      })
    }

    if (!normalizedClips.length) {
      continue
    }

    normalizedGroups.push({
      id: typeof group.id === 'string' && group.id ? group.id : createGroupId(),
      name: typeof group.name === 'string' && group.name.trim() ? group.name.trim() : `Group ${groupIndex + 1}`,
      start: normalizeNonNegativeNumber(group.start, 0),
      trackIndex: Math.max(0, Math.floor(normalizeNumber(group.trackIndex, 0))),
      duration: normalizePositiveNumber(group.duration, 1),
      clips: normalizedClips
    })
  }

  return normalizedGroups
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
          .flatMap((clip) => getClipFormulaExpressions(clip))
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

export function createProjectFilename(projectTitle = DEFAULT_PROJECT_TITLE) {
  return createProjectFilenameFromTitle(projectTitle, 'json')
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}
