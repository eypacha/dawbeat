import { createAudioEffect, createDelayAudioEffect, normalizeMasterGain } from '@/services/audioEffectService'
import { createTrackClip, createTrackId, sortTrackClips } from '@/services/dawStoreService'
import { createEvalEffect, createStereoOffsetEvalEffect } from '@/services/evalEffectService'
import { createFormula } from '@/services/formulaService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { DEFAULT_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { DEFAULT_TRACK_COLOR, getTrackColor } from '@/utils/colorUtils'
import { BASE_TICK_SIZE, MAX_ZOOM, MIN_ZOOM, TIMELINE_SNAP_SUBDIVISIONS, clamp } from '@/utils/timeUtils'

const PROJECT_STORAGE_KEY = 'dawbeat-project'
const PROJECT_VERSION = 5
const SAVE_DEBOUNCE_MS = 400
const DEFAULT_LOOP_START = 0
const DEFAULT_LOOP_END = 16
const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const SUPPORTED_PROJECT_VERSIONS = new Set([1, 2, 3, 4, PROJECT_VERSION])

export function serializeProject(state) {
  return normalizeProjectPayload({
    version: PROJECT_VERSION,
    tracks: state.tracks,
    formulas: state.formulas,
    zoom: state.zoom,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
    loopEnabled: state.loopEnabled,
    audioEffects: state.audioEffects,
    evalEffects: state.evalEffects,
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
  const tracks = project.tracks
    .map((track) => normalizeTrack(track, formulaIds))
    .filter(Boolean)

  const loopStart = normalizeNonNegativeNumber(project.loopStart, DEFAULT_LOOP_START)
  const loopEnd = Math.max(
    normalizeNonNegativeNumber(project.loopEnd, DEFAULT_LOOP_END),
    loopStart + MIN_LOOP_DURATION
  )

  return {
    version: PROJECT_VERSION,
    tracks,
    formulas,
    zoom: clamp(normalizeNumber(project.zoom, 1), MIN_ZOOM, MAX_ZOOM),
    loopStart,
    loopEnd,
    loopEnabled: typeof project.loopEnabled === 'boolean' ? project.loopEnabled : false,
    audioEffects: hasOwn(project, 'audioEffects')
      ? normalizeAudioEffects(project.audioEffects)
      : [createDelayAudioEffect({ id: 'fx-audio-delay' })],
    evalEffects: hasOwn(project, 'evalEffects')
      ? normalizeEvalEffects(project.evalEffects)
      : [createStereoOffsetEvalEffect({ id: 'fx1' })],
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
    clips: Array.isArray(track.clips)
      ? track.clips.map((clip) => normalizeClip(clip, formulaIds)).filter(Boolean)
      : []
  }

  sortTrackClips(nextTrack)
  return nextTrack
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

function normalizeAudioEffects(audioEffects) {
  if (!Array.isArray(audioEffects)) {
    return []
  }

  return audioEffects.filter(isRecord).map((effect) => createAudioEffect(effect))
}

function normalizeEvalEffects(evalEffects) {
  if (!Array.isArray(evalEffects)) {
    return []
  }

  return evalEffects.filter(isRecord).map((effect) => createEvalEffect(effect))
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
