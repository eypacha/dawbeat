import { defineStore } from 'pinia'
import {
  DEFAULT_FORMULA_DROP_DURATION,
  clampClipPlacementStart,
  getClipGroupMoveBounds,
  clampClipResizeEnd,
  clampClipResizeStart,
  clampClipStart,
  getTrackCreateBounds
} from '@/services/timelineService'
import { getDraggedTick } from '@/services/snapService'
import {
  createDuplicateClip,
  createTrack,
  createTrackId,
  createTrackClip,
  createVariableTrack,
  createVariableTrackClip,
  createValueTrackerClip,
  createValueTrackerTrack,
  findClip,
  findClipIndex,
  findTrack,
  findTrackIndex,
  findTimelineClip,
  findVariableTrack,
  findVariableTrackIndex,
  findValueTrackerTrack,
  findValueTrackerTrackByVariableName,
  findValueTrackerTrackIndex,
  sortTrackClips,
  sortValueTrackerTrackClips,
  sortVariableTrackClips
} from '@/services/dawStoreService'
import {
  createAudioEffect,
  createDistortionAudioEffect,
  createDelayAudioEffect,
  createCompressorAudioEffect,
  createEqAudioEffect,
  createLimiterAudioEffect,
  createReverbAudioEffect,
  createStereoWidenerAudioEffect,
  normalizeDecay,
  normalizeDecibels,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeWet,
  normalizeWidth
} from '@/services/audioEffectService'
import {
  createAudioEffectParamAutomationLane,
  createDefaultAutomationLane,
  getAutomationLaneByAudioEffectParam,
  getAutomationLaneConfig,
  getAutomationLaneById as findAutomationLaneById,
  getAutomationLaneNormalizedValue,
  getAutomationLaneValueFromNormalized,
  getAutomationValueAtTime,
  getDefaultAutomationLanes,
  normalizeAutomationCurveType,
  normalizeAutomationPointForLane,
  upsertAutomationPointForLane
} from '@/services/automationService'
import {
  collectEvalEffectExpressions,
  createEvalEffect,
  createStereoOffsetEvalEffect,
  mergeTReplacementParams,
  normalizeStereoOffsetExpression
} from '@/services/evalEffectService'
import {
  createClipFormulaFields,
  createFormula,
  getClipFormulaFieldsFromDraft,
  getClipFormulaFieldsFromFormula,
  getFormulaFieldsFromClipFormula,
  getFormulaById,
  mergeFormulaUpdates
} from '@/services/formulaService'
import { mutateFormula } from '@/services/formulaMutationService'
import { DEFAULT_BPM_MEASURE, normalizeBpmMeasureExpression } from '@/services/bpmService'
import {
  normalizeAutomationLaneHeight,
  normalizeTrackLaneHeight,
  normalizeValueTrackerTrackHeight,
  normalizeVariableTrackHeight
} from '@/services/timelineLaneLayoutService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getDefaultDemoProjectEntry } from '@/services/demoProjectService'
import { loadProject, normalizeProject, serializeProject } from '@/services/projectPersistence'
import {
  createTimelineSectionLabel,
  getTimelineSectionLabelById,
  normalizeTimelineSectionLabelName,
  normalizeTimelineSectionLabelTime,
  sortTimelineSectionLabels
} from '@/services/timelineSectionLabelService'
import {
  BASE_PIXELS_PER_TICK,
  BASE_TICK_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  TIMELINE_SNAP_SUBDIVISIONS,
  clamp,
  getClipEnd,
  snapTicks
} from '@/utils/timeUtils'
import { DEFAULT_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { TRACK_COLOR_PALETTE, getTrackColor } from '@/utils/colorUtils'
import {
  collectAutoVariableTrackNames,
  DEFAULT_VARIABLE_CLIP_FORMULA,
  getNextVariableTrackName
} from '@/services/variableTrackService'
import {
  DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION,
  createValueTrackerLibraryItem,
  createDefaultValueTrackerBinding,
  createSparseRecordedValueTrackerValues,
  createConstantValueTrackerValues,
  createEmptyValueTrackerValues,
  doesValueTrackerBindingMatchInput,
  getValueTrackerLibraryItemById,
  getValueTrackerRecordedStepIndex,
  getValueTrackerValueAtTime,
  getNextValueTrackerLibraryItemName,
  getNextValueTrackerTrackName,
  isNumericValueTrackerInitializer,
  materializeValueTrackerClipLibraryReference,
  normalizeValueTrackerLibraryItemName,
  normalizeValueTrackerValue,
  normalizeValueTrackerValues,
  normalizeValueTrackerTrackName,
  resizeValueTrackerValues
} from '@/services/valueTrackerService'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MIN_VALUE_TRACKER_RECORDING_DURATION = 1
const MAX_HISTORY_ENTRIES = 100
const AUTOMATION_KEYBOARD_NORMALIZED_STEP_COUNT = 10

function createDefaultProject() {
  return normalizeProject(getDefaultDemoProjectEntry()?.project) ?? createEmptyProject()
}

function createEmptyProject() {
  return {
    audioEffects: [],
    automationLanes: getDefaultAutomationLanes(),
    bpmMeasure: DEFAULT_BPM_MEASURE,
    evalEffects: [],
    formulas: [],
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 16,
    masterGain: 1,
    sampleRate: DEFAULT_SAMPLE_RATE,
    showEvaluatedPanel: true,
    showClipWaveforms: true,
    tickSize: BASE_TICK_SIZE,
    timelineSectionLabels: [],
    tracks: [createTrack()],
    variableTracks: [],
    valueTrackerLibraryItems: [],
    valueTrackerTracks: [],
    zoom: 1
  }
}

function ensureNamedValueTrackerTracks(store, variableTrackNames = [], trackName = 'Value Tracker') {
  if (!Array.isArray(variableTrackNames) || !variableTrackNames.length) {
    return []
  }

  const createdValueTrackerTrackIds = []

  for (const variableTrackName of variableTrackNames) {
    const existingValueTrackerTrack = findValueTrackerTrackByVariableName(
      store.valueTrackerTracks,
      variableTrackName
    )

    if (existingValueTrackerTrack) {
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
      values: createConstantValueTrackerValues('0', DEFAULT_FORMULA_DROP_DURATION)
    }))
    sortValueTrackerTrackClips(nextValueTrackerTrack)
    store.valueTrackerTracks.unshift(nextValueTrackerTrack)
    createdValueTrackerTrackIds.push(nextValueTrackerTrack.id)
  }

  return createdValueTrackerTrackIds
}

function syncValueTrackerClipWithLibraryItem(clip, valueTrackerLibraryItem) {
  if (!clip || !valueTrackerLibraryItem) {
    return
  }

  clip.duration = valueTrackerLibraryItem.duration
  clip.stepSubdivision = valueTrackerLibraryItem.stepSubdivision
  clip.valueTrackerLibraryItemId = valueTrackerLibraryItem.id
  clip.values = [...valueTrackerLibraryItem.values]
}

function detachValueTrackerClipLibraryReference(store, clip) {
  if (!clip?.valueTrackerLibraryItemId) {
    return
  }

  const materializedClip = materializeValueTrackerClipLibraryReference(
    clip,
    store.valueTrackerLibraryItems
  )

  clip.duration = materializedClip.duration
  clip.stepSubdivision = materializedClip.stepSubdivision
  clip.values = materializedClip.values
  clip.valueTrackerLibraryItemId = null
}

function syncValueTrackerClipsLinkedToLibraryItem(store, valueTrackerLibraryItemId) {
  const valueTrackerLibraryItem = getValueTrackerLibraryItemById(
    store.valueTrackerLibraryItems,
    valueTrackerLibraryItemId
  )

  if (!valueTrackerLibraryItem) {
    return
  }

  for (const valueTrackerTrack of store.valueTrackerTracks) {
    for (const clip of valueTrackerTrack.clips ?? []) {
      if (clip.valueTrackerLibraryItemId !== valueTrackerLibraryItem.id) {
        continue
      }

      syncValueTrackerClipWithLibraryItem(clip, valueTrackerLibraryItem)
    }
  }
}

function createInitialState() {
  const defaultProject = createDefaultProject()
  const savedProject = loadProject()
  const project = savedProject ?? defaultProject

  return {
    audioReady: false,
    audioEffects: project.audioEffects,
    automationLiveOverrides: {},
    automationLanes: project.automationLanes,
    automationRecordingArmed: false,
    bpmMeasure: project.bpmMeasure,
    clipDragPreview: null,
    clipClipboard: null,
    evalEffects: project.evalEffects,
    editingClipId: null,
    editingFormulaId: null,
    formulas: project.formulas,
    loopEnabled: project.loopEnabled,
    loopStart: project.loopStart,
    loopEnd: project.loopEnd,
    masterGain: project.masterGain,
    playing: false,
    time: 0,
    zoom: project.zoom,
    sampleRate: project.sampleRate,
    showEvaluatedPanel: project.showEvaluatedPanel,
    showClipWaveforms: project.showClipWaveforms,
    tickSize: project.tickSize,
    timelineSectionLabels: project.timelineSectionLabels,
    tracks: project.tracks,
    variableTracks: project.variableTracks,
    valueTrackerLibraryItems: project.valueTrackerLibraryItems,
    valueTrackerTracks: project.valueTrackerTracks,
    historyApplying: false,
    historyFuture: [],
    historyPast: [],
    historyRecording: false,
    historyTransaction: null,
    selectedAutomationPoint: null,
    selectedClipIds: [],
    selectedFormulaId: null,
    selectedClipId: null,
    selectedTrackId: null,
    selectedTimelineSectionLabelId: null,
    selectedValueTrackerLibraryItemId: null,
    selectedValueTrackerTrackId: null,
    valueTrackerRecordingSession: null,
    valueTrackerLiveInputs: {}
  }
}

function getSnapshotKey(snapshot) {
  return JSON.stringify(snapshot)
}

function clearTransientSelectionState(store) {
  store.automationLiveOverrides = {}
  store.automationRecordingArmed = false
  store.clipDragPreview = null
  store.editingClipId = null
  store.editingFormulaId = null
  store.selectedAutomationPoint = null
  store.selectedFormulaId = null
  store.selectedTrackId = null
  store.selectedTimelineSectionLabelId = null
  store.selectedValueTrackerLibraryItemId = null
  store.selectedValueTrackerTrackId = null
  store.valueTrackerRecordingSession = null
  store.valueTrackerLiveInputs = {}
  syncSelectedClipState(store, [])
}

function resolveActiveValueTrackerTrackForKeyboardInput(state) {
  const recordingTrackId = state.valueTrackerRecordingSession?.trackId

  if (recordingTrackId) {
    return findValueTrackerTrack(state.valueTrackerTracks, recordingTrackId)
  }

  return findValueTrackerTrack(state.valueTrackerTracks, state.selectedValueTrackerTrackId)
}

function resolveValueTrackerTracksForInput(state, input = {}) {
  if (input?.source === 'keyboard' || !input?.source) {
    const activeValueTrackerTrack = resolveActiveValueTrackerTrackForKeyboardInput(state)
    return activeValueTrackerTrack ? [activeValueTrackerTrack] : []
  }

  if (input.source !== 'midiCc' && input.source !== 'midiNote') {
    return []
  }

  const recordingTrackId = state.valueTrackerRecordingSession?.trackId

  if (recordingTrackId) {
    const recordingTrack = findValueTrackerTrack(state.valueTrackerTracks, recordingTrackId)

    return recordingTrack && doesValueTrackerBindingMatchInput(recordingTrack.binding, input)
      ? [recordingTrack]
      : []
  }

  return state.valueTrackerTracks.filter((valueTrackerTrack) =>
    doesValueTrackerBindingMatchInput(valueTrackerTrack.binding, input)
  )
}

function createValueTrackerRecordingResult(ok, extras = {}) {
  return {
    ok,
    ...extras
  }
}

function removeValueTrackerTrackWithoutHistory(store, valueTrackerTrackId) {
  const valueTrackerTrackIndex = findValueTrackerTrackIndex(store.valueTrackerTracks, valueTrackerTrackId)

  if (valueTrackerTrackIndex === -1) {
    return false
  }

  store.valueTrackerTracks.splice(valueTrackerTrackIndex, 1)

  if (store.selectedValueTrackerTrackId === valueTrackerTrackId) {
    store.selectedValueTrackerTrackId = null
  }

  return true
}

function normalizeValueTrackerRecordingTick(tick, stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION) {
  const normalizedStepSubdivision = Math.max(1, Math.round(Number(stepSubdivision) || 0))
  const normalizedTick = Math.max(0, Number(tick) || 0)

  return Math.floor(normalizedTick * normalizedStepSubdivision) / normalizedStepSubdivision
}

function normalizeValueTrackerRecordingStopTick(
  stopTick,
  startTick,
  stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
) {
  return Math.max(
    startTick + MIN_VALUE_TRACKER_RECORDING_DURATION,
    normalizeValueTrackerRecordingTick(stopTick, stepSubdivision)
  )
}

function captureValueTrackerRecordingInput(store, recordingSession, value, timeTicks) {
  if (!recordingSession) {
    return true
  }

  if (
    Number.isFinite(recordingSession.plannedStopTick) &&
    timeTicks >= recordingSession.plannedStopTick
  ) {
    store.finishValueTrackerRecording({
      stopTick: recordingSession.plannedStopTick
    })
    return true
  }

  if (timeTicks < recordingSession.startTick) {
    return true
  }

  const stepIndex = getValueTrackerRecordedStepIndex(
    timeTicks,
    recordingSession.startTick,
    recordingSession.stepSubdivision
  )

  if (stepIndex < 0) {
    return true
  }

  recordingSession.capturedSteps = {
    ...recordingSession.capturedSteps,
    [stepIndex]: normalizeValueTrackerValue(value)
  }
  recordingSession.hasInput = true
  return true
}

function applyProjectState(store, project, { preservePlaybackState = false } = {}) {
  const normalizedProject = normalizeProject(project)

  if (!normalizedProject) {
    return false
  }

  const nextPlaying = preservePlaybackState ? store.playing : false
  const nextTime = preservePlaybackState ? store.time : 0

  store.audioEffects = normalizedProject.audioEffects
  store.automationLanes = normalizedProject.automationLanes
  store.bpmMeasure = normalizedProject.bpmMeasure
  store.evalEffects = normalizedProject.evalEffects
  store.formulas = normalizedProject.formulas
  store.loopEnabled = normalizedProject.loopEnabled
  store.loopStart = normalizedProject.loopStart
  store.loopEnd = normalizedProject.loopEnd
  store.masterGain = normalizedProject.masterGain
  store.zoom = normalizedProject.zoom
  store.sampleRate = normalizedProject.sampleRate
  store.showEvaluatedPanel = normalizedProject.showEvaluatedPanel
  store.showClipWaveforms = normalizedProject.showClipWaveforms
  store.tickSize = normalizedProject.tickSize
  store.timelineSectionLabels = normalizedProject.timelineSectionLabels
  store.tracks = normalizedProject.tracks
  store.variableTracks = normalizedProject.variableTracks
  store.valueTrackerLibraryItems = normalizedProject.valueTrackerLibraryItems
  store.valueTrackerTracks = normalizedProject.valueTrackerTracks
  clearTransientSelectionState(store)
  store.playing = nextPlaying
  store.time = nextTime
  return true
}

function reorderEntries(entries, draggedId, targetId, placement = 'before') {
  if (!draggedId || !targetId || draggedId === targetId) {
    return entries
  }

  const sourceIndex = entries.findIndex((entry) => entry.id === draggedId)
  const targetIndex = entries.findIndex((entry) => entry.id === targetId)

  if (sourceIndex === -1 || targetIndex === -1) {
    return entries
  }

  const nextEntries = [...entries]
  const [draggedEntry] = nextEntries.splice(sourceIndex, 1)
  const nextTargetIndex = nextEntries.findIndex((entry) => entry.id === targetId)

  if (nextTargetIndex === -1) {
    return entries
  }

  const insertIndex = placement === 'after' ? nextTargetIndex + 1 : nextTargetIndex
  nextEntries.splice(insertIndex, 0, draggedEntry)
  return nextEntries
}

function normalizeSelectedClipIds(clipIds) {
  if (!Array.isArray(clipIds)) {
    return []
  }

  return [...new Set(clipIds.filter((clipId) => typeof clipId === 'string' && clipId))]
}

function syncSelectedClipState(store, clipIds) {
  const nextSelectedClipIds = normalizeSelectedClipIds(clipIds)
  store.selectedAutomationPoint = null
  store.selectedClipIds = nextSelectedClipIds
  store.selectedClipId = nextSelectedClipIds[0] ?? null
  store.selectedTimelineSectionLabelId = null
}

function collectSelectedClipEntries(tracks, variableTracks, valueTrackerTracks, clipIds) {
  const selectedClipIds = normalizeSelectedClipIds(clipIds)
  const entries = []

  for (const clipId of selectedClipIds) {
    const result = findTimelineClip(tracks, variableTracks, valueTrackerTracks, clipId)

    if (!result) {
      continue
    }

    const clip = result.clip

    if (!clip) {
      continue
    }

    entries.push({
      clip,
      clipId,
      lane: result.lane,
      laneId: result.laneId,
      laneType: result.laneType
    })
  }

  return entries
}

function getLaneOrderMap(tracks, variableTracks, valueTrackerTracks) {
  return new Map([
    ...variableTracks.map((variableTrack, index) => [`variable:${variableTrack.name}`, index]),
    ...valueTrackerTracks.map((valueTrackerTrack, index) => [
      `valueTracker:${valueTrackerTrack.id}`,
      variableTracks.length + index
    ]),
    ...tracks.map((track, index) => [
      `track:${track.id}`,
      variableTracks.length + valueTrackerTracks.length + index
    ])
  ])
}

function sortClipEntriesForClipboard(tracks, variableTracks, valueTrackerTracks, clipEntries) {
  const laneOrderById = getLaneOrderMap(tracks, variableTracks, valueTrackerTracks)

  return [...clipEntries].sort((leftEntry, rightEntry) => {
    const startDelta = leftEntry.clip.start - rightEntry.clip.start

    if (startDelta !== 0) {
      return startDelta
    }

    return (
      (laneOrderById.get(`${leftEntry.laneType}:${leftEntry.laneId}`) ?? Number.MAX_SAFE_INTEGER) -
      (laneOrderById.get(`${rightEntry.laneType}:${rightEntry.laneId}`) ?? Number.MAX_SAFE_INTEGER)
    )
  })
}

function buildClipClipboard(entries, tracks, variableTracks, valueTrackerTracks, formulas) {
  if (!entries.length) {
    return null
  }

  const sortedEntries = sortClipEntriesForClipboard(tracks, variableTracks, valueTrackerTracks, entries)
  const anchorStart = sortedEntries[0]?.clip.start ?? 0
  const anchorTickStart = Math.floor(Math.max(0, anchorStart))

  return {
    anchorStart,
    anchorTickOffset: anchorStart - anchorTickStart,
    clips: sortedEntries.map((entry) => {
      const referencedFormula = entry.clip.formulaId
        ? getFormulaById(formulas, entry.clip.formulaId)
        : null
      const inlineClipFormulaFields = referencedFormula
        ? getClipFormulaFieldsFromFormula(referencedFormula)
        : createClipFormulaFields(entry.clip)

      return {
        duration: entry.clip.duration,
        ...inlineClipFormulaFields,
        formulaId: entry.laneType === 'track' ? referencedFormula?.id ?? null : null,
        formulaName:
          entry.laneType === 'track' ? referencedFormula?.name ?? entry.clip.formulaName ?? null : null,
        stepSubdivision: entry.laneType === 'valueTracker' ? entry.clip.stepSubdivision : null,
        valueTrackerLibraryItemId:
          entry.laneType === 'valueTracker' ? entry.clip.valueTrackerLibraryItemId ?? null : null,
        values: entry.laneType === 'valueTracker' ? [...(entry.clip.values ?? [])] : null,
        sourceLaneId: entry.laneId,
        sourceLaneType: entry.laneType,
        sourceTrackId: entry.laneType === 'track' ? entry.laneId : null,
        startOffset: entry.clip.start - anchorStart
      }
    }),
    sourceLaneIds: [...new Set(sortedEntries.map((entry) => `${entry.laneType}:${entry.laneId}`))]
  }
}

function getClipboardAnchorTickOffset(clipboard) {
  if (!clipboard) {
    return 0
  }

  if (typeof clipboard.anchorTickOffset === 'number' && Number.isFinite(clipboard.anchorTickOffset)) {
    return clipboard.anchorTickOffset
  }

  if (typeof clipboard.anchorStart === 'number' && Number.isFinite(clipboard.anchorStart)) {
    return clipboard.anchorStart - Math.floor(Math.max(0, clipboard.anchorStart))
  }

  return 0
}

function getPasteAnchorStart(playheadTime, clipboard) {
  const playheadTickStart = Math.floor(Math.max(0, Number(playheadTime) || 0))
  return playheadTickStart + getClipboardAnchorTickOffset(clipboard)
}

function normalizeTrackName(nextName) {
  const normalizedName = typeof nextName === 'string' ? nextName.trim() : ''
  return normalizedName || undefined
}

function applyTrackPresentation(track, { color, name } = {}) {
  if (!track) {
    return
  }

  if (typeof name !== 'undefined') {
    track.name = normalizeTrackName(name)
  }

  if (typeof color === 'string' && TRACK_COLOR_PALETTE.includes(color)) {
    track.color = getTrackColor(color)
  }
}

function resolvePasteTargetTrack(store, sourceTrackId) {
  const sourceTrack = findTrack(store.tracks, sourceTrackId)

  if (sourceTrack) {
    return sourceTrack
  }

  const selectedTrack = findTrack(store.tracks, store.selectedTrackId)

  if (selectedTrack) {
    return selectedTrack
  }

  return store.tracks[0] ?? null
}

function resolvePasteTargetVariableTrack(store, sourceVariableTrackName) {
  const sourceVariableTrack = findVariableTrack(store.variableTracks, sourceVariableTrackName)

  if (sourceVariableTrack) {
    return sourceVariableTrack
  }

  return store.variableTracks[0] ?? null
}

function resolvePasteTargetValueTrackerTrack(store, sourceValueTrackerTrackId) {
  const sourceValueTrackerTrack = findValueTrackerTrack(store.valueTrackerTracks, sourceValueTrackerTrackId)

  if (sourceValueTrackerTrack) {
    return sourceValueTrackerTrack
  }

  return store.valueTrackerTracks[0] ?? null
}

function resolvePasteTargetLane(store, clipboardClip) {
  if (clipboardClip?.sourceLaneType === 'variable') {
    return {
      lane: resolvePasteTargetVariableTrack(store, clipboardClip.sourceLaneId),
      laneType: 'variable'
    }
  }

  if (clipboardClip?.sourceLaneType === 'valueTracker') {
    return {
      lane: resolvePasteTargetValueTrackerTrack(store, clipboardClip.sourceLaneId),
      laneType: 'valueTracker'
    }
  }

  return {
    lane: resolvePasteTargetTrack(store, clipboardClip?.sourceLaneId ?? clipboardClip?.sourceTrackId),
    laneType: 'track'
  }
}

function sortLaneClips(entry) {
  if (!entry?.lane) {
    return
  }

  if (entry.laneType === 'variable') {
    sortVariableTrackClips(entry.lane)
    return
  }

  if (entry.laneType === 'valueTracker') {
    sortValueTrackerTrackClips(entry.lane)
    return
  }

  sortTrackClips(entry.lane)
}

function hasPasteTargetForClipboard(clipboard, tracks, variableTracks, valueTrackerTracks) {
  if (!clipboard?.clips?.length) {
    return false
  }

  return clipboard.clips.some((clipboardClip) => {
    if (clipboardClip?.sourceLaneType === 'variable') {
      return Boolean(variableTracks.length)
    }

    if (clipboardClip?.sourceLaneType === 'valueTracker') {
      return Boolean(valueTrackerTracks.length)
    }

    return Boolean(tracks.length)
  })
}

export const useDawStore = defineStore('dawStore', {
  state: createInitialState,

  getters: {
    canPasteClipsAtPlayhead: (state) =>
      hasPasteTargetForClipboard(
        state.clipClipboard,
        state.tracks,
        state.variableTracks,
        state.valueTrackerTracks
      ),
    getAutomationLaneByAudioEffectParam: (state) => (effectId, paramKey) =>
      getAutomationLaneByAudioEffectParam(state.automationLanes, effectId, paramKey),
    getAutomationLaneById: (state) => (laneId) => findAutomationLaneById(state.automationLanes, laneId),
    getTimelineSectionLabelById: (state) => (labelId) =>
      getTimelineSectionLabelById(state.timelineSectionLabels, labelId),
    getAutomationValueAt: (state) => (time, laneId) =>
      Object.hasOwn(state.automationLiveOverrides, laneId)
        ? Number(state.automationLiveOverrides[laneId])
        : getAutomationValueAtTime(time, findAutomationLaneById(state.automationLanes, laneId)),
    activeValueTrackerTrackForKeyboardInput: (state) => resolveActiveValueTrackerTrackForKeyboardInput(state),
    isAutomationRecordingArmed: (state) => Boolean(state.automationRecordingArmed),
    isValueTrackerRecording: (state) => Boolean(state.valueTrackerRecordingSession),
    pixelsPerTick: (state) => BASE_PIXELS_PER_TICK * state.zoom,
    canRedo: (state) => !state.playing && state.historyFuture.length > 0,
    canUndo: (state) => !state.playing && state.historyPast.length > 0
  },

  actions: {
    createProjectSnapshot() {
      return serializeProject(this.$state)
    },

    pushHistoryEntry(beforeSnapshot, afterSnapshot) {
      if (!beforeSnapshot || !afterSnapshot) {
        return false
      }

      if (getSnapshotKey(beforeSnapshot) === getSnapshotKey(afterSnapshot)) {
        return false
      }

      this.historyPast = [...this.historyPast, beforeSnapshot].slice(-MAX_HISTORY_ENTRIES)
      this.historyFuture = []
      return true
    },

    applyHistorySnapshot(snapshot) {
      if (!snapshot) {
        return false
      }

      return applyProjectState(this, snapshot, { preservePlaybackState: true })
    },

    clearHistory() {
      this.historyApplying = false
      this.historyFuture = []
      this.historyPast = []
      this.historyRecording = false
      this.historyTransaction = null
    },

    beginHistoryTransaction(label = '') {
      if (this.historyApplying || this.historyRecording || this.historyTransaction) {
        return
      }

      const before = this.createProjectSnapshot()

      if (!before) {
        return
      }

      this.historyTransaction = {
        before,
        label
      }
    },

    commitHistoryTransaction() {
      if (!this.historyTransaction) {
        return false
      }

      const { before } = this.historyTransaction
      this.historyTransaction = null

      const after = this.createProjectSnapshot()

      if (!after) {
        return false
      }

      return this.pushHistoryEntry(before, after)
    },

    cancelHistoryTransaction() {
      this.historyTransaction = null
    },

    recordHistoryStep(_label, fn) {
      if (typeof fn !== 'function') {
        return undefined
      }

      if (this.historyApplying || this.historyRecording || this.historyTransaction) {
        return fn()
      }

      const before = this.createProjectSnapshot()

      if (!before) {
        return fn()
      }

      let failed = false
      this.historyRecording = true

      try {
        return fn()
      } catch (error) {
        failed = true
        throw error
      } finally {
        this.historyRecording = false

        if (!failed) {
          const after = this.createProjectSnapshot()

          if (after) {
            this.pushHistoryEntry(before, after)
          }
        }
      }
    },

    undo() {
      if (this.playing || !this.historyPast.length) {
        return
      }

      const previousSnapshot = this.historyPast[this.historyPast.length - 1]
      const currentSnapshot = this.createProjectSnapshot()

      if (!previousSnapshot || !currentSnapshot) {
        return
      }

      this.historyApplying = true

      try {
        if (!this.applyHistorySnapshot(previousSnapshot)) {
          return
        }

        this.historyPast = this.historyPast.slice(0, -1)
        this.historyFuture = [...this.historyFuture, currentSnapshot].slice(-MAX_HISTORY_ENTRIES)
      } finally {
        this.historyApplying = false
      }
    },

    redo() {
      if (this.playing || !this.historyFuture.length) {
        return
      }

      const nextSnapshot = this.historyFuture[this.historyFuture.length - 1]
      const currentSnapshot = this.createProjectSnapshot()

      if (!nextSnapshot || !currentSnapshot) {
        return
      }

      this.historyApplying = true

      try {
        if (!this.applyHistorySnapshot(nextSnapshot)) {
          return
        }

        this.historyFuture = this.historyFuture.slice(0, -1)
        this.historyPast = [...this.historyPast, currentSnapshot].slice(-MAX_HISTORY_ENTRIES)
      } finally {
        this.historyApplying = false
      }
    },

    setAudioReady(ready) {
      this.audioReady = ready
    },

    setMasterGain(value) {
      this.masterGain = normalizeMasterGain(value)
    },

    selectAutomationPoint(laneId, index) {
      const lane = this.getAutomationLaneById(laneId)

      if (!lane || !Number.isInteger(index) || index < 0 || index >= lane.points.length) {
        this.selectedAutomationPoint = null
        return
      }

      this.selectedTimelineSectionLabelId = null
      this.selectedAutomationPoint = {
        laneId,
        index
      }
    },

    clearAutomationPointSelection() {
      this.selectedAutomationPoint = null
    },

    selectTimelineSectionLabel(labelId) {
      if (!labelId) {
        this.selectedTimelineSectionLabelId = null
        return
      }

      const timelineSectionLabel = this.getTimelineSectionLabelById(labelId)

      if (!timelineSectionLabel) {
        this.selectedTimelineSectionLabelId = null
        return
      }

      this.selectedAutomationPoint = null
      this.selectedClipIds = []
      this.selectedClipId = null
      this.selectedFormulaId = null
      this.selectedTrackId = null
      this.selectedTimelineSectionLabelId = timelineSectionLabel.id
    },

    clearTimelineSectionLabelSelection() {
      this.selectedTimelineSectionLabelId = null
    },

    addTimelineSectionLabel(label = {}) {
      return this.recordHistoryStep('add-timeline-section-label', () => {
        const nextTimelineSectionLabel = createTimelineSectionLabel(label)

        this.timelineSectionLabels.push(nextTimelineSectionLabel)
        sortTimelineSectionLabels(this.timelineSectionLabels)
        this.selectTimelineSectionLabel(nextTimelineSectionLabel.id)
        return nextTimelineSectionLabel.id
      })
    },

    renameTimelineSectionLabel(labelId, nextName) {
      return this.recordHistoryStep('rename-timeline-section-label', () => {
        const timelineSectionLabel = this.getTimelineSectionLabelById(labelId)

        if (!timelineSectionLabel) {
          return false
        }

        timelineSectionLabel.name = normalizeTimelineSectionLabelName(
          nextName,
          timelineSectionLabel.name
        )
        this.selectTimelineSectionLabel(timelineSectionLabel.id)
        return true
      })
    },

    moveTimelineSectionLabel(labelId, nextTime, shouldSnap = true) {
      return this.recordHistoryStep('move-timeline-section-label', () => {
        const timelineSectionLabel = this.getTimelineSectionLabelById(labelId)

        if (!timelineSectionLabel) {
          if (this.selectedTimelineSectionLabelId === labelId) {
            this.clearTimelineSectionLabelSelection()
          }

          return false
        }

        const normalizedTime = shouldSnap
          ? snapTicks(nextTime)
          : normalizeTimelineSectionLabelTime(nextTime, timelineSectionLabel.time)

        timelineSectionLabel.time = normalizeTimelineSectionLabelTime(
          normalizedTime,
          timelineSectionLabel.time
        )
        sortTimelineSectionLabels(this.timelineSectionLabels)
        this.selectTimelineSectionLabel(timelineSectionLabel.id)
        return true
      })
    },

    removeTimelineSectionLabel(labelId) {
      return this.recordHistoryStep('remove-timeline-section-label', () => {
        const nextTimelineSectionLabels = this.timelineSectionLabels.filter(
          (timelineSectionLabel) => timelineSectionLabel.id !== labelId
        )

        if (nextTimelineSectionLabels.length === this.timelineSectionLabels.length) {
          return false
        }

        this.timelineSectionLabels = nextTimelineSectionLabels

        if (this.selectedTimelineSectionLabelId === labelId) {
          this.clearTimelineSectionLabelSelection()
        }

        return true
      })
    },

    addAutomationPoint(laneId, point) {
      return this.recordHistoryStep('add-automation-point', () => {
        const lane = this.getAutomationLaneById(laneId)

        if (!lane) {
          return null
        }

        const nextPoint = normalizeAutomationPointForLane(point, lane)

        if (lane.points[0] && nextPoint.time === 0) {
          this.selectAutomationPoint(laneId, 0)
          return 0
        }

        lane.points.push(nextPoint)
        this.selectAutomationPoint(laneId, lane.points.length - 1)
        return lane.points.length - 1
      })
    },

    enableMasterGainAutomationLane() {
      return this.recordHistoryStep('enable-master-gain-automation-lane', () => {
        if (this.getAutomationLaneById('masterGain')) {
          return 'masterGain'
        }

        this.automationLanes.push(
          createDefaultAutomationLane({
            value: this.masterGain
          })
        )
        return 'masterGain'
      })
    },

    enableAudioEffectParamAutomationLane(effectId, paramKey) {
      return this.recordHistoryStep('enable-audio-effect-param-automation-lane', () => {
        const effect = this.audioEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return null
        }

        const existingLane = this.getAutomationLaneByAudioEffectParam(effectId, paramKey)

        if (existingLane) {
          return existingLane.id
        }

        const nextLane = createAudioEffectParamAutomationLane(effect, paramKey)

        if (!nextLane) {
          return null
        }

        this.automationLanes.push(nextLane)
        return nextLane.id
      })
    },

    updateAutomationPoint(laneId, index, nextPoint) {
      const lane = this.getAutomationLaneById(laneId)

      if (!lane || !Number.isInteger(index) || index < 0 || index >= lane.points.length) {
        return
      }

      const normalizedPoint = normalizeAutomationPointForLane(nextPoint, lane, lane.points[index])

      lane.points[index] = index === 0
        ? {
            ...normalizedPoint,
            time: 0
          }
        : normalizedPoint

      if (
        this.selectedAutomationPoint?.laneId === laneId &&
        this.selectedAutomationPoint.index === index
      ) {
        this.selectAutomationPoint(laneId, index)
      }
    },

    setAutomationLaneValueAtTime(laneId, time, value) {
      return this.recordHistoryStep('set-automation-lane-value-at-time', () => {
        const lane = this.getAutomationLaneById(laneId)

        if (!lane) {
          return null
        }

        const nextLaneState = upsertAutomationPointForLane(lane, {
          time,
          value
        })

        if (!nextLaneState) {
          return null
        }

        lane.points = nextLaneState.points
        this.clearAutomationLiveOverride(laneId)
        this.selectAutomationPoint(laneId, nextLaneState.index)
        return nextLaneState.index
      })
    },

    setAutomationLiveOverride(laneId, value) {
      const lane = this.getAutomationLaneById(laneId)

      if (!lane) {
        return false
      }

      const normalizedValue = normalizeAutomationPointForLane({ value }, lane, lane.points?.[0]).value

      this.automationLiveOverrides = {
        ...this.automationLiveOverrides,
        [laneId]: normalizedValue
      }

      return true
    },

    clearAutomationLiveOverride(laneId) {
      if (typeof laneId !== 'string' || !laneId || !Object.hasOwn(this.automationLiveOverrides, laneId)) {
        return false
      }

      const nextOverrides = {
        ...this.automationLiveOverrides
      }

      delete nextOverrides[laneId]
      this.automationLiveOverrides = nextOverrides
      return true
    },

    clearAllAutomationLiveOverrides() {
      this.automationLiveOverrides = {}
    },

    setAutomationRecordingArmed(armed) {
      this.automationRecordingArmed = Boolean(armed)
    },

    toggleAutomationRecordingArmed() {
      this.automationRecordingArmed = !this.automationRecordingArmed
      return this.automationRecordingArmed
    },

    setAutomationPointCurve(laneId, index, curve) {
      return this.recordHistoryStep('set-automation-point-curve', () => {
        const lane = this.getAutomationLaneById(laneId)

        if (!lane || !Number.isInteger(index) || index < 0 || index >= lane.points.length) {
          return
        }

        lane.points[index] = {
          ...lane.points[index],
          curve: normalizeAutomationCurveType(curve, lane.points[index]?.curve)
        }

        this.selectAutomationPoint(laneId, index)
      })
    },

    nudgeSelectedAutomationPointTime(deltaTicks) {
      const normalizedDeltaTicks = Number(deltaTicks)
      const selectedPoint = this.selectedAutomationPoint

      if (!selectedPoint || !Number.isFinite(normalizedDeltaTicks) || normalizedDeltaTicks === 0) {
        return false
      }

      return this.recordHistoryStep('nudge-selected-automation-point-time', () => {
        const lane = this.getAutomationLaneById(selectedPoint.laneId)
        const point = lane?.points?.[selectedPoint.index]

        if (!lane || !point) {
          this.clearAutomationPointSelection()
          return false
        }

        if (selectedPoint.index === 0) {
          this.selectAutomationPoint(selectedPoint.laneId, 0)
          return false
        }

        const nextTime = Math.max(0, snapTicks(point.time) + normalizedDeltaTicks)

        if (nextTime === point.time) {
          return false
        }

        this.updateAutomationPoint(selectedPoint.laneId, selectedPoint.index, {
          ...point,
          time: nextTime
        })

        return true
      })
    },

    nudgeSelectedAutomationPointValue(deltaNormalizedSteps) {
      const normalizedDeltaSteps = Number(deltaNormalizedSteps)
      const selectedPoint = this.selectedAutomationPoint

      if (!selectedPoint || !Number.isFinite(normalizedDeltaSteps) || normalizedDeltaSteps === 0) {
        return false
      }

      return this.recordHistoryStep('nudge-selected-automation-point-value', () => {
        const lane = this.getAutomationLaneById(selectedPoint.laneId)
        const point = lane?.points?.[selectedPoint.index]
        const laneConfig = getAutomationLaneConfig(lane)

        if (!lane || !point || !laneConfig) {
          if (!lane || !point) {
            this.clearAutomationPointSelection()
          }

          return false
        }

        const currentNormalizedValue = getAutomationLaneNormalizedValue(
          lane,
          point.value,
          lane.points[0]?.value
        )
        const nextNormalizedValue = clamp(
          currentNormalizedValue + normalizedDeltaSteps / AUTOMATION_KEYBOARD_NORMALIZED_STEP_COUNT,
          0,
          1
        )
        const nextValue = getAutomationLaneValueFromNormalized(
          lane,
          nextNormalizedValue,
          point.value
        )

        if (nextValue === point.value) {
          return false
        }

        this.updateAutomationPoint(selectedPoint.laneId, selectedPoint.index, {
          ...point,
          value: nextValue
        })

        return true
      })
    },

    removeAutomationPoint(laneId, index) {
      return this.recordHistoryStep('remove-automation-point', () => {
        const lane = this.getAutomationLaneById(laneId)

        if (!lane || !Number.isInteger(index) || index < 0 || index >= lane.points.length) {
          return
        }

        if (index === 0) {
          this.selectAutomationPoint(laneId, 0)
          return
        }

        lane.points.splice(index, 1)

        if (this.selectedAutomationPoint?.laneId !== laneId) {
          return
        }

        if (this.selectedAutomationPoint.index === index) {
          this.selectAutomationPoint(laneId, Math.max(0, index - 1))
          return
        }

        if (this.selectedAutomationPoint.index > index) {
          this.selectAutomationPoint(laneId, this.selectedAutomationPoint.index - 1)
        }
      })
    },

    removeAutomationLane(laneId) {
      return this.recordHistoryStep('remove-automation-lane', () => {
        this.automationLanes = this.automationLanes.filter((lane) => lane.id !== laneId)
        this.clearAutomationLiveOverride(laneId)

        if (this.selectedAutomationPoint?.laneId === laneId) {
          this.clearAutomationPointSelection()
        }
      })
    },

    setSampleRate(value) {
      return this.recordHistoryStep('set-sample-rate', () => {
        this.sampleRate = normalizeSampleRate(value, this.sampleRate)
      })
    },

    setBpmMeasure(value) {
      return this.recordHistoryStep('set-bpm-measure', () => {
        this.bpmMeasure = normalizeBpmMeasureExpression(value, this.bpmMeasure)
      })
    },

    setShowClipWaveforms(value) {
      return this.recordHistoryStep('set-show-clip-waveforms', () => {
        this.showClipWaveforms = Boolean(value)
      })
    },

    setShowEvaluatedPanel(value) {
      return this.recordHistoryStep('set-show-evaluated-panel', () => {
        this.showEvaluatedPanel = Boolean(value)
      })
    },

    resetMasterGain() {
      return this.recordHistoryStep('reset-master-gain', () => {
        this.masterGain = 1
      })
    },

    addAudioEffect(effect) {
      return this.recordHistoryStep('add-audio-effect', () => {
        const nextEffect = createAudioEffect(effect)

        if (!nextEffect) {
          return null
        }

        this.audioEffects.push(nextEffect)
        return nextEffect.id
      })
    },

    toggleAudioEffect(effectId) {
      return this.recordHistoryStep('toggle-audio-effect', () => {
        const effect = this.audioEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        effect.enabled = !effect.enabled
      })
    },

    toggleAudioEffectExpanded(effectId) {
      return this.recordHistoryStep('toggle-audio-effect-expanded', () => {
        const effect = this.audioEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        effect.expanded = !effect.expanded
      })
    },

    removeAudioEffect(effectId) {
      return this.recordHistoryStep('remove-audio-effect', () => {
        this.audioEffects = this.audioEffects.filter((entry) => entry.id !== effectId)
        this.automationLanes = this.automationLanes.filter((lane) => lane.effectId !== effectId)

        if (this.selectedAutomationPoint?.laneId && !this.getAutomationLaneById(this.selectedAutomationPoint.laneId)) {
          this.clearAutomationPointSelection()
        }
      })
    },

    reorderAudioEffect(effectId, targetEffectId, placement = 'before') {
      return this.recordHistoryStep('reorder-audio-effect', () => {
        this.audioEffects = reorderEntries(this.audioEffects, effectId, targetEffectId, placement)
      })
    },

    resetAudioEffect(effectId) {
      return this.recordHistoryStep('reset-audio-effect', () => {
        const effect = this.audioEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        if (effect.type === 'eq') {
          const defaults = createEqAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'distortion') {
          const defaults = createDistortionAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'stereoWidener') {
          const defaults = createStereoWidenerAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'delay') {
          const defaults = createDelayAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'compressor') {
          const defaults = createCompressorAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'reverb') {
          const defaults = createReverbAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'limiter') {
          const defaults = createLimiterAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }
      })
    },

    updateAudioEffectParams(effectId, params) {
      const effect = this.audioEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      if (effect.type === 'eq') {
        if (typeof params.low !== 'undefined') {
          effect.params.low = normalizeDecibels(params.low)
        }

        if (typeof params.mid !== 'undefined') {
          effect.params.mid = normalizeDecibels(params.mid)
        }

        if (typeof params.high !== 'undefined') {
          effect.params.high = normalizeDecibels(params.high)
        }

        if (typeof params.lowFrequency !== 'undefined') {
          effect.params.lowFrequency = normalizeFrequency(params.lowFrequency)
        }

        if (typeof params.highFrequency !== 'undefined') {
          effect.params.highFrequency = normalizeFrequency(params.highFrequency)
        }

        if (effect.params.lowFrequency >= effect.params.highFrequency) {
          effect.params.lowFrequency = Math.max(40, effect.params.highFrequency - 10)
          effect.params.highFrequency = Math.min(12000, effect.params.lowFrequency + 10)
        }

        return
      }

      if (effect.type === 'distortion') {
        if (typeof params.drive !== 'undefined') {
          effect.params.drive = normalizeDrive(params.drive)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }

        return
      }

      if (effect.type === 'stereoWidener') {
        if (typeof params.width !== 'undefined') {
          effect.params.width = normalizeWidth(params.width)
        }

        return
      }

      if (effect.type === 'delay') {
        if (typeof params.delayTime !== 'undefined') {
          effect.params.delayTime = normalizeTime(params.delayTime)
        }

        if (typeof params.feedback !== 'undefined') {
          effect.params.feedback = normalizeFeedback(params.feedback)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }

        return
      }

      if (effect.type === 'compressor') {
        if (typeof params.threshold !== 'undefined') {
          effect.params.threshold = normalizeThreshold(params.threshold)
        }

        if (typeof params.ratio !== 'undefined') {
          effect.params.ratio = normalizeRatio(params.ratio)
        }

        if (typeof params.attack !== 'undefined') {
          effect.params.attack = normalizeTime(params.attack)
        }

        if (typeof params.release !== 'undefined') {
          effect.params.release = normalizeTime(params.release)
        }

        if (typeof params.knee !== 'undefined') {
          effect.params.knee = normalizeKnee(params.knee)
        }

        return
      }

      if (effect.type === 'reverb') {
        if (typeof params.decay !== 'undefined') {
          effect.params.decay = normalizeDecay(params.decay)
        }

        if (typeof params.preDelay !== 'undefined') {
          effect.params.preDelay = normalizeTime(params.preDelay)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }

        return
      }

      if (effect.type === 'limiter') {
        if (typeof params.threshold !== 'undefined') {
          effect.params.threshold = normalizeThreshold(params.threshold)
        }
      }
    },

    toggleLoop() {
      this.loopEnabled = !this.loopEnabled
    },

    setLoopStart(tick) {
      const snappedTick = snapTicks(Math.max(0, tick))
      this.loopStart = Math.min(snappedTick, this.loopEnd - MIN_LOOP_DURATION)
    },

    setLoopEnd(tick) {
      const snappedTick = snapTicks(Math.max(0, tick))
      this.loopEnd = Math.max(snappedTick, this.loopStart + MIN_LOOP_DURATION)
    },

    setLoopRange(startTick, endTick) {
      const snappedStart = snapTicks(Math.max(0, startTick))
      const snappedEnd = snapTicks(Math.max(0, endTick))

      this.loopStart = snappedStart
      this.loopEnd = Math.max(snappedEnd, snappedStart + MIN_LOOP_DURATION)
    },

    startPlayback() {
      this.playing = true
    },

    stopPlayback() {
      this.playing = false
    },

    setTime(time) {
      if (Number(time) < Number(this.time)) {
        this.valueTrackerLiveInputs = {}
      }

      this.time = time
    },

    setTrackHeight(trackId, height) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return false
      }

      track.height = normalizeTrackLaneHeight(height, track.height)
      return true
    },

    setVariableTrackHeight(variableTrackName, height) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return false
      }

      variableTrack.height = normalizeVariableTrackHeight(height, variableTrack.height)
      return true
    },

    setValueTrackerTrackHeight(valueTrackerTrackId, height) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return false
      }

      valueTrackerTrack.height = normalizeValueTrackerTrackHeight(height, valueTrackerTrack.height)
      return true
    },

    setAutomationLaneHeight(laneId, height) {
      const lane = this.getAutomationLaneById(laneId)

      if (!lane) {
        return false
      }

      lane.height = normalizeAutomationLaneHeight(height, lane.height)
      return true
    },

    setValueTrackerTrackLiveInput(valueTrackerTrackId, value, time = this.time) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return false
      }

      this.valueTrackerLiveInputs = {
        ...this.valueTrackerLiveInputs,
        [valueTrackerTrackId]: {
          time: Math.max(0, Number(time) || 0),
          value: normalizeValueTrackerValue(value)
        }
      }

      return true
    },

    startValueTrackerRecording(options = {}) {
      if (this.valueTrackerRecordingSession) {
        return createValueTrackerRecordingResult(false, { reason: 'already-recording' })
      }

      const beforeSnapshot = this.createProjectSnapshot()

      if (!beforeSnapshot) {
        return createValueTrackerRecordingResult(false, { reason: 'snapshot-failed' })
      }

      const stepSubdivision = DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION
      const startTick = normalizeValueTrackerRecordingTick(options.startTick ?? this.time, stepSubdivision)
      const previousTargetTrackId = this.selectedValueTrackerTrackId

      let recordingTrack = this.activeValueTrackerTrackForKeyboardInput
      let autoCreatedTrackId = null

      if (!recordingTrack) {
        recordingTrack = createValueTrackerTrack({
          name: getNextValueTrackerTrackName(this.valueTrackerTracks)
        })
        this.valueTrackerTracks.push(recordingTrack)
        autoCreatedTrackId = recordingTrack.id
      }

      const recordingBounds = getTrackCreateBounds(recordingTrack, startTick)

      if (!recordingBounds) {
        if (autoCreatedTrackId) {
          removeValueTrackerTrackWithoutHistory(this, autoCreatedTrackId)
          this.selectedValueTrackerTrackId = previousTargetTrackId
        }

        return createValueTrackerRecordingResult(false, { reason: 'clip-collision' })
      }

      const plannedStopTick = this.loopEnabled
        ? Math.min(recordingBounds.maxEnd, this.loopEnd)
        : recordingBounds.maxEnd

      if (
        Number.isFinite(plannedStopTick) &&
        plannedStopTick - startTick < MIN_VALUE_TRACKER_RECORDING_DURATION
      ) {
        if (autoCreatedTrackId) {
          removeValueTrackerTrackWithoutHistory(this, autoCreatedTrackId)
          this.selectedValueTrackerTrackId = previousTargetTrackId
        }

        return createValueTrackerRecordingResult(false, { reason: 'no-recording-space' })
      }

      this.selectedValueTrackerTrackId = recordingTrack.id
      this.valueTrackerRecordingSession = {
        autoCreatedTrackId,
        beforeSnapshot,
        capturedSteps: {},
        hasInput: false,
        initialHeldValue: getValueTrackerValueAtTime(startTick, recordingTrack, null),
        plannedStopTick,
        previousTargetTrackId,
        startTick,
        stepSubdivision,
        trackId: recordingTrack.id
      }

      return createValueTrackerRecordingResult(true, {
        autoCreatedTrackId,
        plannedStopTick,
        startTick,
        trackId: recordingTrack.id
      })
    },

    ingestValueTrackerInput(input = {}) {
      const targetValueTrackerTracks = resolveValueTrackerTracksForInput(this.$state, input)

      if (!targetValueTrackerTracks.length) {
        return false
      }

      const inputTimeTicks = Number(input.timeTicks)
      const normalizedTimeTicks = Math.max(
        0,
        Number.isFinite(inputTimeTicks) ? inputTimeTicks : this.time
      )
      let applied = false

      for (const targetValueTrackerTrack of targetValueTrackerTracks) {
        if (!this.setValueTrackerTrackLiveInput(
          targetValueTrackerTrack.id,
          input.value,
          normalizedTimeTicks
        )) {
          continue
        }

        applied = true

        if (this.valueTrackerRecordingSession?.trackId === targetValueTrackerTrack.id) {
          captureValueTrackerRecordingInput(
            this,
            this.valueTrackerRecordingSession,
            input.value,
            normalizedTimeTicks
          )
        }
      }

      return applied
    },

    finishValueTrackerRecording(options = {}) {
      const recordingSession = this.valueTrackerRecordingSession

      if (!recordingSession) {
        return createValueTrackerRecordingResult(false, { reason: 'not-recording' })
      }

      const recordingTrack = findValueTrackerTrack(this.valueTrackerTracks, recordingSession.trackId)
      const autoCreatedTrackId = recordingSession.autoCreatedTrackId
      const previousTargetTrackId = recordingSession.previousTargetTrackId ?? null
      const cancel = options.cancel === true

      this.valueTrackerRecordingSession = null

      if (!recordingTrack) {
        this.selectedValueTrackerTrackId = previousTargetTrackId
        return createValueTrackerRecordingResult(false, { reason: 'missing-track' })
      }

      if (cancel || !recordingSession.hasInput) {
        if (autoCreatedTrackId) {
          removeValueTrackerTrackWithoutHistory(this, autoCreatedTrackId)
          this.selectedValueTrackerTrackId = previousTargetTrackId
        } else {
          this.selectedValueTrackerTrackId = recordingTrack.id
        }

        return createValueTrackerRecordingResult(true, {
          cancelled: cancel,
          createdClipId: null,
          trackId: cancel && autoCreatedTrackId ? previousTargetTrackId : recordingTrack.id
        })
      }

      const resolvedStopTick = Number.isFinite(Number(options.stopTick))
        ? Number(options.stopTick)
        : Number.isFinite(recordingSession.plannedStopTick)
          ? recordingSession.plannedStopTick
          : this.time
      const stopTick = Number.isFinite(recordingSession.plannedStopTick)
        ? Math.min(resolvedStopTick, recordingSession.plannedStopTick)
        : resolvedStopTick
      const normalizedStopTick = normalizeValueTrackerRecordingStopTick(
        stopTick,
        recordingSession.startTick,
        recordingSession.stepSubdivision
      )
      const duration = normalizedStopTick - recordingSession.startTick
      const nextValues = createSparseRecordedValueTrackerValues(recordingSession.capturedSteps, {
        duration,
        initialValue: recordingSession.initialHeldValue,
        stepSubdivision: recordingSession.stepSubdivision
      })
      const createdClipId = this.addValueTrackerClip(recordingTrack.id, {
        duration,
        start: recordingSession.startTick,
        stepSubdivision: recordingSession.stepSubdivision,
        values: nextValues
      })
      const afterSnapshot = this.createProjectSnapshot()

      if (afterSnapshot && recordingSession.beforeSnapshot) {
        this.pushHistoryEntry(recordingSession.beforeSnapshot, afterSnapshot)
      }

      this.selectedValueTrackerTrackId = recordingTrack.id

      return createValueTrackerRecordingResult(true, {
        createdClipId,
        duration,
        stopTick: normalizedStopTick,
        trackId: recordingTrack.id
      })
    },

    cancelValueTrackerRecording(options = {}) {
      return this.finishValueTrackerRecording({
        ...options,
        cancel: true
      })
    },

    applyKeyboardValueToActiveValueTracker(value) {
      return this.ingestValueTrackerInput({
        source: 'keyboard',
        timeTicks: this.time,
        value
      })
    },

    setZoom(nextZoom) {
      this.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    },

    applyProject(project) {
      if (!applyProjectState(this, project)) {
        return
      }

      this.clipClipboard = null
      this.clearHistory()
    },

    resetProject() {
      this.applyProject(createDefaultProject())
    },

    resetToEmptyProject() {
      this.applyProject(createEmptyProject())
    },

    adjustZoom(delta) {
      this.setZoom(this.zoom + delta * -0.001)
    },

    setClipDragPreview(preview) {
      this.clipDragPreview = preview
    },

    clearClipDragPreview() {
      this.clipDragPreview = null
    },

    clearClipClipboard() {
      this.clipClipboard = null
    },

    setSelectedClips(clipIds) {
      syncSelectedClipState(this, clipIds)
    },

    addSelectedClip(clipId) {
      syncSelectedClipState(this, [...this.selectedClipIds, clipId])
    },

    removeSelectedClip(clipId) {
      syncSelectedClipState(
        this,
        this.selectedClipIds.filter((selectedClipId) => selectedClipId !== clipId)
      )
    },

    clearClipSelection() {
      syncSelectedClipState(this, [])
    },

    copySelectedClips() {
      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.selectedClipIds
      )
      const nextClipboard = buildClipClipboard(
        selectedClipEntries,
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.formulas
      )

      if (!nextClipboard) {
        return false
      }

      this.clipClipboard = nextClipboard
      return true
    },

    copyClip(clipId) {
      if (this.selectedClipIds.length > 1 && this.selectedClipIds.includes(clipId)) {
        return this.copySelectedClips()
      }

      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        [clipId]
      )
      const nextClipboard = buildClipClipboard(
        selectedClipEntries,
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.formulas
      )

      if (!nextClipboard) {
        return false
      }

      this.clipClipboard = nextClipboard
      return true
    },

    pasteClipboardAtPlayhead() {
      if (!this.canPasteClipsAtPlayhead) {
        return []
      }

      return this.recordHistoryStep('paste-clips', () => {
        const clipboard = this.clipClipboard

        if (
          !clipboard?.clips?.length ||
          (!this.tracks.length && !this.variableTracks.length && !this.valueTrackerTracks.length)
        ) {
          return []
        }

        const pastedClipIds = []
        const touchedLaneEntries = []
        const pasteAnchorStart = getPasteAnchorStart(this.time, clipboard)
        let pastedAnchorTrackId = null
        let pastedAnchorFormulaId = null

        this.editingClipId = null

        for (const clipboardClip of clipboard.clips) {
          const targetEntry = resolvePasteTargetLane(this, clipboardClip)

          if (!targetEntry.lane) {
            continue
          }

          const desiredStart = pasteAnchorStart + clipboardClip.startOffset
          const nextStart = clampClipPlacementStart(
            targetEntry.lane,
            desiredStart,
            clipboardClip.duration
          )
          const referencedFormula = clipboardClip.formulaId
            ? getFormulaById(this.formulas, clipboardClip.formulaId)
            : null

          const nextClip = targetEntry.laneType === 'variable'
            ? createVariableTrackClip({
                duration: clipboardClip.duration,
                formula: clipboardClip.formula ?? null,
                start: nextStart
              })
            : targetEntry.laneType === 'valueTracker'
              ? createValueTrackerClip({
                  duration: clipboardClip.duration,
                  start: nextStart,
                  stepSubdivision: clipboardClip.stepSubdivision,
                  valueTrackerLibraryItemId: clipboardClip.valueTrackerLibraryItemId ?? null,
                  values: clipboardClip.values
                })
            : createTrackClip({
                duration: clipboardClip.duration,
                ...(referencedFormula ? {} : createClipFormulaFields(clipboardClip)),
                formulaId: referencedFormula?.id ?? null,
                formulaName: referencedFormula?.name ?? clipboardClip.formulaName ?? null,
                start: nextStart
              })

          targetEntry.lane.clips.push(nextClip)
          pastedClipIds.push(nextClip.id)
          touchedLaneEntries.push(targetEntry)

          if (pastedAnchorTrackId === null) {
            pastedAnchorTrackId = targetEntry.laneType === 'track' ? targetEntry.lane.id : null
            pastedAnchorFormulaId = targetEntry.laneType === 'track' ? nextClip.formulaId ?? null : null
          }
        }

        if (!pastedClipIds.length) {
          return []
        }

        for (const touchedLaneEntry of touchedLaneEntries) {
          sortLaneClips(touchedLaneEntry)
        }

        this.setSelectedClips(pastedClipIds)
        this.selectedTrackId = pastedAnchorTrackId
        this.selectedFormulaId = pastedAnchorFormulaId
        return pastedClipIds
      })
    },

    addFormula(formula = {}) {
      return this.recordHistoryStep('add-formula', () => {
        const nextFormula = createFormula(formula)
        this.formulas.push(nextFormula)
        this.selectedFormulaId = nextFormula.id
        return nextFormula.id
      })
    },

    addValueTrackerLibraryItem(item = {}) {
      return this.recordHistoryStep('add-value-tracker-library-item', () => {
        const nextValueTrackerLibraryItem = createValueTrackerLibraryItem({
          ...item,
          name:
            typeof item.name === 'string' && item.name.trim()
              ? item.name
              : getNextValueTrackerLibraryItemName(this.valueTrackerLibraryItems)
        })

        this.valueTrackerLibraryItems.push(nextValueTrackerLibraryItem)
        this.selectedValueTrackerLibraryItemId = nextValueTrackerLibraryItem.id
        return nextValueTrackerLibraryItem.id
      })
    },

    addEvalEffect(effect) {
      return this.recordHistoryStep('add-eval-effect', () => {
        const nextEffect = createEvalEffect(effect)
        this.evalEffects.push(nextEffect)
        return nextEffect.id
      })
    },

    toggleEvalEffect(effectId) {
      return this.recordHistoryStep('toggle-eval-effect', () => {
        const effect = this.evalEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        effect.enabled = !effect.enabled
      })
    },

    toggleEvalEffectExpanded(effectId) {
      return this.recordHistoryStep('toggle-eval-effect-expanded', () => {
        const effect = this.evalEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        effect.expanded = !effect.expanded
      })
    },

    removeEvalEffect(effectId) {
      return this.recordHistoryStep('remove-eval-effect', () => {
        this.evalEffects = this.evalEffects.filter((entry) => entry.id !== effectId)
      })
    },

    reorderEvalEffect(effectId, targetEffectId, placement = 'before') {
      return this.recordHistoryStep('reorder-eval-effect', () => {
        this.evalEffects = reorderEntries(this.evalEffects, effectId, targetEffectId, placement)
      })
    },

    resetEvalEffect(effectId) {
      return this.recordHistoryStep('reset-eval-effect', () => {
        const effect = this.evalEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        if (effect.type === 'stereoOffset') {
          const defaults = createStereoOffsetEvalEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'tReplacement') {
          const defaults = createEvalEffect({ id: effect.id, type: 'tReplacement' })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }
      })
    },

    updateEvalEffectParams(effectId, params) {
      const effect = this.evalEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      if (effect.type === 'stereoOffset' && typeof params.offset !== 'undefined') {
        effect.params.offset = normalizeStereoOffsetExpression(params.offset, effect.params.offset)
        const missingAutoVariableTrackNames = collectAutoVariableTrackNames(
          collectEvalEffectExpressions([effect])
        )

        if (missingAutoVariableTrackNames.length) {
          ensureNamedValueTrackerTracks(this, missingAutoVariableTrackNames, 'Stereo Offset')
        }

        return
      }

      if (effect.type === 'tReplacement') {
        effect.params = mergeTReplacementParams(effect.params, params)

        const missingAutoVariableTrackNames = collectAutoVariableTrackNames(
          collectEvalEffectExpressions([effect])
        )

        if (missingAutoVariableTrackNames.length) {
          ensureNamedValueTrackerTracks(this, missingAutoVariableTrackNames, 'T Replacement')
        }
      }
    },

    updateFormula(formulaId, updates) {
      const formula = getFormulaById(this.formulas, formulaId)

      if (!formula) {
        return
      }

      Object.assign(formula, mergeFormulaUpdates(formula, updates))
    },

    updateValueTrackerLibraryItem(valueTrackerLibraryItemId, updates) {
      const valueTrackerLibraryItem = this.valueTrackerLibraryItems.find(
        (item) => item.id === valueTrackerLibraryItemId
      )

      if (!valueTrackerLibraryItem) {
        return
      }

      if (typeof updates?.name === 'string') {
        valueTrackerLibraryItem.name = normalizeValueTrackerLibraryItemName(
          updates.name,
          valueTrackerLibraryItem.name
        )
      }

      if (
        typeof updates?.values === 'undefined' &&
        typeof updates?.duration === 'undefined' &&
        typeof updates?.stepSubdivision === 'undefined'
      ) {
        return
      }

      const normalizedValueTrackerLibraryItem = createValueTrackerLibraryItem({
        ...valueTrackerLibraryItem,
        duration:
          typeof updates?.duration !== 'undefined'
            ? updates.duration
            : valueTrackerLibraryItem.duration,
        id: valueTrackerLibraryItem.id,
        name: valueTrackerLibraryItem.name,
        stepSubdivision:
          typeof updates?.stepSubdivision !== 'undefined'
            ? updates.stepSubdivision
            : valueTrackerLibraryItem.stepSubdivision,
        values:
          typeof updates?.values !== 'undefined'
            ? updates.values
            : valueTrackerLibraryItem.values
      })

      valueTrackerLibraryItem.duration = normalizedValueTrackerLibraryItem.duration
      valueTrackerLibraryItem.stepSubdivision = normalizedValueTrackerLibraryItem.stepSubdivision
      valueTrackerLibraryItem.values = normalizedValueTrackerLibraryItem.values
      syncValueTrackerClipsLinkedToLibraryItem(this, valueTrackerLibraryItem.id)
    },

    removeFormula(formulaId) {
      return this.recordHistoryStep('remove-formula', () => {
        const formula = getFormulaById(this.formulas, formulaId)

        if (!formula) {
          return
        }

        for (const track of this.tracks) {
          for (const clip of track.clips) {
            if (clip.formulaId !== formulaId) {
              continue
            }

            Object.assign(clip, getClipFormulaFieldsFromFormula(formula))
            clip.formulaName = formula.name
            clip.formulaId = null
          }
        }

        this.formulas = this.formulas.filter((entry) => entry.id !== formulaId)

        if (this.selectedFormulaId === formulaId) {
          this.selectedFormulaId = null
        }

        if (this.editingFormulaId === formulaId) {
          this.editingFormulaId = null
        }
      })
    },

    removeValueTrackerLibraryItem(valueTrackerLibraryItemId) {
      return this.recordHistoryStep('remove-value-tracker-library-item', () => {
        for (const valueTrackerTrack of this.valueTrackerTracks) {
          for (const clip of valueTrackerTrack.clips ?? []) {
            if (clip.valueTrackerLibraryItemId !== valueTrackerLibraryItemId) {
              continue
            }

            detachValueTrackerClipLibraryReference(this, clip)
          }
        }

        this.valueTrackerLibraryItems = this.valueTrackerLibraryItems.filter(
          (item) => item.id !== valueTrackerLibraryItemId
        )

        if (this.selectedValueTrackerLibraryItemId === valueTrackerLibraryItemId) {
          this.selectedValueTrackerLibraryItemId = null
        }
      })
    },

    addTrack(beforeTrackId = null) {
      return this.recordHistoryStep('add-track', () => {
        const nextTrack = createTrack()

        if (!beforeTrackId) {
          this.tracks.push(nextTrack)
          return nextTrack.id
        }

        const insertIndex = findTrackIndex(this.tracks, beforeTrackId)

        if (insertIndex === -1) {
          this.tracks.push(nextTrack)
          return nextTrack.id
        }

        this.tracks.splice(insertIndex, 0, nextTrack)
        return nextTrack.id
      })
    },

    addVariableTrack() {
      return this.recordHistoryStep('add-variable-track', () => {
        const nextVariableTrack = createVariableTrack({
          name: getNextVariableTrackName(this.variableTracks)
        })

        this.variableTracks.push(nextVariableTrack)
        return nextVariableTrack.name
      })
    },

    addValueTrackerTrack() {
      return this.recordHistoryStep('add-value-tracker-track', () => {
        const nextValueTrackerTrack = createValueTrackerTrack({
          name: getNextValueTrackerTrackName(this.valueTrackerTracks)
        })

        this.valueTrackerTracks.push(nextValueTrackerTrack)
        return nextValueTrackerTrack.id
      })
    },

    ensureInitializedValueTrackerTracks(valueTrackerInitializers = {}) {
      if (!valueTrackerInitializers || typeof valueTrackerInitializers !== 'object') {
        return []
      }

      const createdValueTrackerTrackIds = []

      for (const [variableTrackName, initializer] of Object.entries(valueTrackerInitializers)) {
        if (
          typeof variableTrackName !== 'string' ||
          !variableTrackName ||
          !isNumericValueTrackerInitializer(initializer)
        ) {
          continue
        }

        const existingValueTrackerTrack = findValueTrackerTrackByVariableName(
          this.valueTrackerTracks,
          variableTrackName
        )

        if (existingValueTrackerTrack) {
          if (!existingValueTrackerTrack.clips.some((clip) => clip.start === 0)) {
            existingValueTrackerTrack.clips.push(createValueTrackerClip({
              duration: DEFAULT_FORMULA_DROP_DURATION,
              start: 0,
              values: createConstantValueTrackerValues(initializer, DEFAULT_FORMULA_DROP_DURATION)
            }))
            sortValueTrackerTrackClips(existingValueTrackerTrack)
          }

          continue
        }

        const nextValueTrackerTrack = createValueTrackerTrack({
          binding: {
            type: 'variable',
            variableName: variableTrackName
          },
          name: variableTrackName
        })

        nextValueTrackerTrack.clips.push(createValueTrackerClip({
          duration: DEFAULT_FORMULA_DROP_DURATION,
          start: 0,
          values: createConstantValueTrackerValues(initializer, DEFAULT_FORMULA_DROP_DURATION)
        }))
        sortValueTrackerTrackClips(nextValueTrackerTrack)
        this.valueTrackerTracks.unshift(nextValueTrackerTrack)
        createdValueTrackerTrackIds.push(nextValueTrackerTrack.id)
      }

      return createdValueTrackerTrackIds
    },

    ensureInitializedVariableTracks(variableTrackInitializers = {}) {
      if (!variableTrackInitializers || typeof variableTrackInitializers !== 'object') {
        return []
      }

      const createdVariableTrackNames = []

      for (const [variableTrackName, initializer] of Object.entries(variableTrackInitializers)) {
        if (
          typeof variableTrackName !== 'string' ||
          !variableTrackName ||
          findVariableTrack(this.variableTracks, variableTrackName) ||
          findValueTrackerTrackByVariableName(this.valueTrackerTracks, variableTrackName)
        ) {
          continue
        }

        const nextVariableTrack = createVariableTrack({ name: variableTrackName })
        nextVariableTrack.clips.push(createVariableTrackClip({
          duration: DEFAULT_FORMULA_DROP_DURATION,
          formula: typeof initializer === 'string' && initializer.trim() ? initializer : DEFAULT_VARIABLE_CLIP_FORMULA,
          start: 0
        }))
        sortVariableTrackClips(nextVariableTrack)
        this.variableTracks.push(nextVariableTrack)
        createdVariableTrackNames.push(variableTrackName)
      }

      return createdVariableTrackNames
    },

    removeVariableTrack(variableTrackName) {
      return this.recordHistoryStep('remove-variable-track', () => {
        const variableTrackIndex = findVariableTrackIndex(this.variableTracks, variableTrackName)

        if (variableTrackIndex === -1) {
          return
        }

        const [removedVariableTrack] = this.variableTracks.splice(variableTrackIndex, 1)
        const removedClipIds = new Set(removedVariableTrack.clips.map((clip) => clip.id))

        this.setSelectedClips(
          this.selectedClipIds.filter((selectedClipId) => !removedClipIds.has(selectedClipId))
        )

        if (removedVariableTrack.clips.some((clip) => clip.id === this.editingClipId)) {
          this.editingClipId = null
        }
      })
    },

    renameValueTrackerTrack(valueTrackerTrackId, nextName) {
      return this.recordHistoryStep('rename-value-tracker-track', () => {
        const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

        if (!valueTrackerTrack) {
          return
        }

        valueTrackerTrack.name = normalizeValueTrackerTrackName(nextName, valueTrackerTrack.name)
      })
    },

    updateValueTrackerTrackBinding(valueTrackerTrackId, nextBinding) {
      return this.recordHistoryStep('update-value-tracker-track-binding', () => {
        const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

        if (!valueTrackerTrack) {
          return
        }

        valueTrackerTrack.binding = createDefaultValueTrackerBinding(nextBinding)
      })
    },

    removeValueTrackerTrack(valueTrackerTrackId) {
      if (this.valueTrackerRecordingSession?.trackId === valueTrackerTrackId) {
        this.cancelValueTrackerRecording()
      }

      return this.recordHistoryStep('remove-value-tracker-track', () => {
        const valueTrackerTrackIndex = findValueTrackerTrackIndex(this.valueTrackerTracks, valueTrackerTrackId)

        if (valueTrackerTrackIndex === -1) {
          return
        }

        const [removedValueTrackerTrack] = this.valueTrackerTracks.splice(valueTrackerTrackIndex, 1)
        const removedClipIds = new Set(removedValueTrackerTrack.clips.map((clip) => clip.id))

        if (this.selectedValueTrackerTrackId === removedValueTrackerTrack.id) {
          this.selectedValueTrackerTrackId = null
        }

        this.setSelectedClips(
          this.selectedClipIds.filter((selectedClipId) => !removedClipIds.has(selectedClipId))
        )

        if (removedValueTrackerTrack.clips.some((clip) => clip.id === this.editingClipId)) {
          this.editingClipId = null
        }
      })
    },

    duplicateTrack(trackId) {
      return this.recordHistoryStep('duplicate-track', () => {
        const trackIndex = findTrackIndex(this.tracks, trackId)

        if (trackIndex === -1) {
          return null
        }

        const sourceTrack = this.tracks[trackIndex]

        if (!sourceTrack) {
          return null
        }

        const duplicatedTrack = {
          ...sourceTrack,
          id: createTrackId(),
          name: sourceTrack.name ? `${sourceTrack.name} Copy` : undefined,
          clips: sourceTrack.clips.map((clip) => createDuplicateClip(clip))
        }

        this.tracks.splice(trackIndex + 1, 0, duplicatedTrack)
        this.clearClipSelection()
        this.selectedFormulaId = null
        this.selectedTrackId = duplicatedTrack.id
        return duplicatedTrack.id
      })
    },

    removeTrack(trackId) {
      return this.recordHistoryStep('remove-track', () => {
        const trackIndex = findTrackIndex(this.tracks, trackId)

        if (trackIndex === -1) {
          return
        }

        const [removedTrack] = this.tracks.splice(trackIndex, 1)

        if (this.selectedTrackId === trackId) {
          this.selectedTrackId = null
        }

        const removedClipIds = new Set(removedTrack.clips.map((clip) => clip.id))
        this.setSelectedClips(
          this.selectedClipIds.filter((selectedClipId) => !removedClipIds.has(selectedClipId))
        )

        if (removedTrack.clips.some((clip) => clip.id === this.editingClipId)) {
          this.editingClipId = null
        }
      })
    },

    reorderTrack(trackId, targetTrackId, placement = 'before') {
      return this.recordHistoryStep('reorder-track', () => {
        this.tracks = reorderEntries(this.tracks, trackId, targetTrackId, placement)
      })
    },

    renameTrack(trackId, nextName) {
      return this.recordHistoryStep('rename-track', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        applyTrackPresentation(track, { name: nextName })
      })
    },

    setTrackColor(trackId, color) {
      return this.recordHistoryStep('set-track-color', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        applyTrackPresentation(track, { color })
      })
    },

    updateTrackPresentation(trackId, updates = {}) {
      return this.recordHistoryStep('update-track-presentation', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        applyTrackPresentation(track, updates)
      })
    },

    setTrackUnionOperator(trackId, unionOperator) {
      return this.recordHistoryStep('set-track-union-operator', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        track.unionOperator = normalizeTrackUnionOperator(unionOperator)
      })
    },

    toggleTrackMuted(trackId) {
      return this.recordHistoryStep('toggle-track-muted', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        track.muted = !track.muted
      })
    },

    toggleTrackSoloed(trackId) {
      return this.recordHistoryStep('toggle-track-soloed', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        track.soloed = !track.soloed
      })
    },

    addClip(trackId, clip) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return null
      }

      const nextClip = createTrackClip({
        ...clip,
        formula: clip.formula ?? null,
        formulaId: clip.formulaId ?? null,
        formulaName: clip.formulaName ?? null
      })

      track.clips.push(nextClip)
      sortTrackClips(track)
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = trackId

      if (nextClip.formulaId) {
        this.selectedFormulaId = nextClip.formulaId
      }

      return nextClip.id
    },

    addVariableClip(variableTrackName, clip) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return null
      }

      const nextClip = createVariableTrackClip({
        ...clip,
        formula: clip.formula ?? undefined
      })

      variableTrack.clips.push(nextClip)
      sortVariableTrackClips(variableTrack)
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = null
      this.selectedFormulaId = null
      return nextClip.id
    },

    addValueTrackerClip(valueTrackerTrackId, clip) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return null
      }

      const valueTrackerLibraryItem = getValueTrackerLibraryItemById(
        this.valueTrackerLibraryItems,
        clip.valueTrackerLibraryItemId
      )

      const nextClip = createValueTrackerClip({
        ...clip,
        duration: valueTrackerLibraryItem?.duration ?? clip.duration,
        stepSubdivision: valueTrackerLibraryItem?.stepSubdivision ?? clip.stepSubdivision,
        valueTrackerLibraryItemId: valueTrackerLibraryItem?.id ?? null,
        values:
          valueTrackerLibraryItem?.values ??
          clip.values ??
          createEmptyValueTrackerValues(clip.duration, clip.stepSubdivision)
      })

      valueTrackerTrack.clips.push(nextClip)
      sortValueTrackerTrackClips(valueTrackerTrack)
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = null
      this.selectedFormulaId = null
      return nextClip.id
    },

    updateClip(trackId, clipId, updates) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const clip = findClip(track, clipId)

      if (!clip) {
        return
      }

      Object.assign(clip, updates)

      if (clip.formulaId) {
        this.selectedFormulaId = clip.formulaId
      }
    },

    updateVariableClip(variableTrackName, clipId, updates) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return
      }

      const clip = findClip(variableTrack, clipId)

      if (!clip) {
        return
      }

      Object.assign(clip, updates, {
        formula: typeof updates?.formula === 'string' ? updates.formula : clip.formula
      })
      this.selectedFormulaId = null
    },

    updateValueTrackerClip(valueTrackerTrackId, clipId, updates) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return
      }

      const clip = findClip(valueTrackerTrack, clipId)

      if (!clip) {
        return
      }

      if (
        clip.valueTrackerLibraryItemId &&
        (
          typeof updates?.values !== 'undefined' ||
          typeof updates?.duration !== 'undefined' ||
          typeof updates?.stepSubdivision !== 'undefined'
        )
      ) {
        detachValueTrackerClipLibraryReference(this, clip)
      }

      const nextDuration =
        typeof updates?.duration !== 'undefined' ? updates.duration : clip.duration
      const nextStepSubdivision =
        typeof updates?.stepSubdivision !== 'undefined' ? updates.stepSubdivision : clip.stepSubdivision

      Object.assign(clip, {
        ...updates,
        stepSubdivision: typeof nextStepSubdivision === 'number' ? nextStepSubdivision : clip.stepSubdivision,
        values: Array.isArray(updates?.values)
          ? normalizeValueTrackerValues(updates.values, nextDuration, nextStepSubdivision)
          : clip.values
      })
      this.selectedFormulaId = null
    },

    saveClipFormulaDraft(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

      if (!result) {
        return
      }

      const clip = result.clip

      if (!clip) {
        return
      }

      if (result.laneType === 'valueTracker') {
        return
      }

      if (result.laneType === 'variable') {
        clip.formula = draft.code
        return
      }

      if (clip.formulaId) {
        this.updateFormula(clip.formulaId, draft)
      } else {
        Object.assign(clip, getClipFormulaFieldsFromDraft(draft))
      }
    },

    saveClipFormulaDraftAndName(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

      if (!result) {
        return
      }

      const clip = result.clip

      if (!clip) {
        return
      }

      if (result.laneType === 'valueTracker') {
        return
      }

      if (result.laneType === 'variable') {
        clip.formula = draft.code
        return
      }

      if (clip.formulaId) {
        this.updateFormula(clip.formulaId, draft)
      } else {
        Object.assign(clip, getClipFormulaFieldsFromDraft(draft))
        clip.formulaName = draft.name
      }
    },

    saveValueTrackerClipDraft(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

      if (!result || result.laneType !== 'valueTracker' || !result.clip) {
        return
      }

      const linkedValueTrackerLibraryItem = getValueTrackerLibraryItemById(
        this.valueTrackerLibraryItems,
        result.clip.valueTrackerLibraryItemId
      )

      if (result.clip.valueTrackerLibraryItemId && !linkedValueTrackerLibraryItem) {
        result.clip.valueTrackerLibraryItemId = null
      }

      if (linkedValueTrackerLibraryItem) {
        this.updateValueTrackerLibraryItem(linkedValueTrackerLibraryItem.id, {
          values: normalizeValueTrackerValues(
            draft?.values,
            linkedValueTrackerLibraryItem.duration,
            linkedValueTrackerLibraryItem.stepSubdivision
          )
        })
        return
      }

      result.clip.values = normalizeValueTrackerValues(
        draft?.values,
        result.clip.duration,
        result.clip.stepSubdivision
      )
    },

    setEditingFormula(formulaId) {
      this.editingFormulaId = formulaId
    },

    moveClip(trackId, clipId, nextStart, shouldSnap = true) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const clip = findClip(track, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipStart(track, clipId, snappedStart)
    },

    moveVariableClip(variableTrackName, clipId, nextStart, shouldSnap = true) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return
      }

      const clip = findClip(variableTrack, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipStart(variableTrack, clipId, snappedStart)
    },

    moveValueTrackerClip(valueTrackerTrackId, clipId, nextStart, shouldSnap = true) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return
      }

      const clip = findClip(valueTrackerTrack, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipStart(valueTrackerTrack, clipId, snappedStart)
    },

    moveSelectedClips(anchorClipId, nextStart, shouldSnap = true) {
      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.selectedClipIds
      )

      if (!selectedClipEntries.length) {
        return
      }

      const anchorEntry = selectedClipEntries.find((entry) => entry.clipId === anchorClipId)

      if (!anchorEntry) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const desiredDelta = snappedStart - anchorEntry.clip.start
      const clipIdsByLaneKey = new Map()

      for (const entry of selectedClipEntries) {
        const laneKey = `${entry.laneType}:${entry.laneId}`
        const existingClipIds = clipIdsByLaneKey.get(laneKey) ?? {
          clipIds: [],
          lane: entry.lane,
          laneType: entry.laneType
        }
        existingClipIds.clipIds.push(entry.clipId)
        clipIdsByLaneKey.set(laneKey, existingClipIds)
      }

      let minDelta = Number.NEGATIVE_INFINITY
      let maxDelta = Number.POSITIVE_INFINITY

      for (const laneEntry of clipIdsByLaneKey.values()) {
        const bounds = getClipGroupMoveBounds(laneEntry.lane, laneEntry.clipIds)
        minDelta = Math.max(minDelta, bounds.minDelta)
        maxDelta = Math.min(maxDelta, bounds.maxDelta)
      }

      const clampedDelta = Math.max(minDelta, Math.min(desiredDelta, maxDelta))
      const touchedLaneEntries = new Map()

      for (const entry of selectedClipEntries) {
        entry.clip.start += clampedDelta
        touchedLaneEntries.set(`${entry.laneType}:${entry.laneId}`, entry)
      }

      for (const touchedLaneEntry of touchedLaneEntries.values()) {
        sortLaneClips(touchedLaneEntry)
      }

      this.selectedTrackId = anchorEntry.laneType === 'track' ? anchorEntry.laneId : null
      this.selectedFormulaId = anchorEntry.laneType === 'track' ? anchorEntry.clip.formulaId ?? null : null
    },

    nudgeSelectedClips(deltaTicks, shouldSnap = true, anchorClipId = this.selectedClipId) {
      const normalizedDeltaTicks = Number(deltaTicks)

      if (!Number.isFinite(normalizedDeltaTicks) || normalizedDeltaTicks === 0 || !anchorClipId) {
        return false
      }

      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.selectedClipIds
      )

      if (!selectedClipEntries.length) {
        return false
      }

      const anchorEntry = selectedClipEntries.find((entry) => entry.clipId === anchorClipId)

      if (!anchorEntry) {
        return false
      }

      return this.recordHistoryStep('nudge-selected-clips', () => {
        this.moveSelectedClips(anchorClipId, anchorEntry.clip.start + normalizedDeltaTicks, shouldSnap)
      })
    },

    placeClip(trackId, clipId, nextStart, shouldSnap = true) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const clip = findClip(track, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipPlacementStart(track, snappedStart, clip.duration, clipId)
      sortTrackClips(track)
    },

    placeVariableClip(variableTrackName, clipId, nextStart, shouldSnap = true) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return
      }

      const clip = findClip(variableTrack, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipPlacementStart(variableTrack, snappedStart, clip.duration, clipId)
      sortVariableTrackClips(variableTrack)
    },

    placeValueTrackerClip(valueTrackerTrackId, clipId, nextStart, shouldSnap = true) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return
      }

      const clip = findClip(valueTrackerTrack, clipId)

      if (!clip) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      clip.start = clampClipPlacementStart(valueTrackerTrack, snappedStart, clip.duration, clipId)
      sortValueTrackerTrackClips(valueTrackerTrack)
    },

    moveClipToTrack(sourceTrackId, targetTrackId, clipId, nextStart, shouldSnap = true) {
      const sourceTrack = findTrack(this.tracks, sourceTrackId)
      const targetTrack = findTrack(this.tracks, targetTrackId)

      if (!sourceTrack || !targetTrack) {
        return
      }

      const clipIndex = findClipIndex(sourceTrack, clipId)

      if (clipIndex === -1) {
        return
      }

      if (sourceTrackId === targetTrackId) {
        this.moveClip(sourceTrackId, clipId, nextStart, shouldSnap)
        this.selectedTrackId = targetTrackId
        return
      }

      const [clip] = sourceTrack.clips.splice(clipIndex, 1)
      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const clampedStart = clampClipPlacementStart(targetTrack, snappedStart, clip.duration)

      clip.start = clampedStart
      targetTrack.clips.push(clip)
      sortTrackClips(targetTrack)
      this.selectedTrackId = targetTrackId
    },

    moveValueTrackerClipToTrack(sourceValueTrackerTrackId, targetValueTrackerTrackId, clipId, nextStart, shouldSnap = true) {
      const sourceValueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, sourceValueTrackerTrackId)
      const targetValueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, targetValueTrackerTrackId)

      if (!sourceValueTrackerTrack || !targetValueTrackerTrack) {
        return
      }

      const clipIndex = findClipIndex(sourceValueTrackerTrack, clipId)

      if (clipIndex === -1) {
        return
      }

      if (sourceValueTrackerTrackId === targetValueTrackerTrackId) {
        this.moveValueTrackerClip(sourceValueTrackerTrackId, clipId, nextStart, shouldSnap)
        return
      }

      const [clip] = sourceValueTrackerTrack.clips.splice(clipIndex, 1)
      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const clampedStart = clampClipPlacementStart(targetValueTrackerTrack, snappedStart, clip.duration)

      clip.start = clampedStart
      targetValueTrackerTrack.clips.push(clip)
      sortValueTrackerTrackClips(targetValueTrackerTrack)
    },

    resizeClipStart(trackId, clipId, nextStart, shouldSnap = true) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const clip = findClip(track, clipId)

      if (!clip) {
        return
      }

      const clipEnd = getClipEnd(clip)
      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const clampedStart = clampClipResizeStart(track, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart
    },

    resizeVariableClipStart(variableTrackName, clipId, nextStart, shouldSnap = true) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return
      }

      const clip = findClip(variableTrack, clipId)

      if (!clip) {
        return
      }

      const clipEnd = getClipEnd(clip)
      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const clampedStart = clampClipResizeStart(variableTrack, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart
    },

    resizeValueTrackerClipStart(valueTrackerTrackId, clipId, nextStart, shouldSnap = true) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return
      }

      const clip = findClip(valueTrackerTrack, clipId)

      if (!clip) {
        return
      }

      if (clip.valueTrackerLibraryItemId) {
        detachValueTrackerClipLibraryReference(this, clip)
      }

      const previousStart = clip.start
      const previousDuration = clip.duration
      const clipEnd = getClipEnd(clip)
      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const clampedStart = clampClipResizeStart(valueTrackerTrack, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart
      clip.values = resizeValueTrackerValues(clip.values, {
        nextDuration: clip.duration,
        nextStart: clip.start,
        previousDuration,
        previousStart,
        stepSubdivision: clip.stepSubdivision
      })
    },

    resizeClipEnd(trackId, clipId, nextEnd, shouldSnap = true) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const clip = findClip(track, clipId)

      if (!clip) {
        return
      }

      const snappedEnd = getDraggedTick(nextEnd, shouldSnap)
      const clampedEnd = clampClipResizeEnd(track, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start
    },

    resizeVariableClipEnd(variableTrackName, clipId, nextEnd, shouldSnap = true) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return
      }

      const clip = findClip(variableTrack, clipId)

      if (!clip) {
        return
      }

      const snappedEnd = getDraggedTick(nextEnd, shouldSnap)
      const clampedEnd = clampClipResizeEnd(variableTrack, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start
    },

    resizeValueTrackerClipEnd(valueTrackerTrackId, clipId, nextEnd, shouldSnap = true) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return
      }

      const clip = findClip(valueTrackerTrack, clipId)

      if (!clip) {
        return
      }

      if (clip.valueTrackerLibraryItemId) {
        detachValueTrackerClipLibraryReference(this, clip)
      }

      const previousDuration = clip.duration
      const snappedEnd = getDraggedTick(nextEnd, shouldSnap)
      const clampedEnd = clampClipResizeEnd(valueTrackerTrack, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start
      clip.values = resizeValueTrackerValues(clip.values, {
        nextDuration: clip.duration,
        nextStart: clip.start,
        previousDuration,
        previousStart: clip.start,
        stepSubdivision: clip.stepSubdivision
      })
    },

    duplicateClip(trackId, clipId) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return null
      }

      const sourceClip = findClip(track, clipId)

      if (!sourceClip) {
        return null
      }

      const duplicateClip = createDuplicateClip(sourceClip)
      const duplicateClipId = duplicateClip.id

      track.clips.push(duplicateClip)
      sortTrackClips(track)
      this.selectedTrackId = trackId
      this.setSelectedClips([duplicateClipId])

      if (duplicateClip.formulaId) {
        this.selectedFormulaId = duplicateClip.formulaId
      }

      return duplicateClipId
    },

    duplicateVariableClip(variableTrackName, clipId) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return null
      }

      const sourceClip = findClip(variableTrack, clipId)

      if (!sourceClip) {
        return null
      }

      const duplicateClip = createDuplicateClip(sourceClip)
      const duplicateClipId = duplicateClip.id

      variableTrack.clips.push(duplicateClip)
      sortVariableTrackClips(variableTrack)
      this.selectedTrackId = null
      this.selectedFormulaId = null
      this.setSelectedClips([duplicateClipId])
      return duplicateClipId
    },

    duplicateValueTrackerClip(valueTrackerTrackId, clipId) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return null
      }

      const sourceClip = findClip(valueTrackerTrack, clipId)

      if (!sourceClip) {
        return null
      }

      const duplicateClip = createDuplicateClip(sourceClip)
      const duplicateClipId = duplicateClip.id

      valueTrackerTrack.clips.push(duplicateClip)
      sortValueTrackerTrackClips(valueTrackerTrack)
      this.selectedTrackId = null
      this.selectedFormulaId = null
      this.setSelectedClips([duplicateClipId])
      return duplicateClipId
    },

    duplicateSelectedClips(anchorClipId) {
      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        this.selectedClipIds
      )

      if (!selectedClipEntries.length) {
        return []
      }

      const duplicatedClipIds = []
      const laneEntriesToSort = new Map()
      const duplicatedClipIdBySourceId = new Map()

      for (const entry of selectedClipEntries) {
        const duplicateClip = createDuplicateClip(entry.clip)
        entry.lane.clips.push(duplicateClip)
        duplicatedClipIds.push(duplicateClip.id)
        duplicatedClipIdBySourceId.set(entry.clipId, duplicateClip.id)
        laneEntriesToSort.set(`${entry.laneType}:${entry.laneId}`, entry)
      }

      for (const laneEntry of laneEntriesToSort.values()) {
        sortLaneClips(laneEntry)
      }

      this.setSelectedClips(duplicatedClipIds)

      const duplicatedAnchorClipId = duplicatedClipIdBySourceId.get(anchorClipId) ?? duplicatedClipIds[0] ?? null
      const anchorEntry = duplicatedAnchorClipId
        ? collectSelectedClipEntries(
            this.tracks,
            this.variableTracks,
            this.valueTrackerTracks,
            [duplicatedAnchorClipId]
          )[0]
        : null

      if (anchorEntry) {
        this.selectedTrackId = anchorEntry.laneType === 'track' ? anchorEntry.laneId : null
        this.selectedFormulaId = anchorEntry.laneType === 'track' ? anchorEntry.clip.formulaId ?? null : null
      }

      return duplicatedClipIds
    },

    addClipFormulaToLibrary(trackId, clipId) {
      return this.recordHistoryStep('add-clip-formula-to-library', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return null
        }

        const clip = findClip(track, clipId)

        if (!clip) {
          return null
        }

        if (clip.formulaId) {
          this.selectedFormulaId = clip.formulaId
          return clip.formulaId
        }

        const formulaId = this.addFormula({
          ...getFormulaFieldsFromClipFormula(clip),
          name: clip.formulaName ?? '',
        })

        clip.formulaId = formulaId
        clip.formula = ''
        clip.formulaStereo = false
        clip.formulaName = null
        clip.leftFormula = ''
        clip.rightFormula = ''
        return formulaId
      })
    },

    addValueTrackerClipToLibrary(valueTrackerTrackId, clipId) {
      return this.recordHistoryStep('add-value-tracker-clip-to-library', () => {
        const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

        if (!valueTrackerTrack) {
          return null
        }

        const clip = findClip(valueTrackerTrack, clipId)

        if (!clip) {
          return null
        }

        const linkedValueTrackerLibraryItem = getValueTrackerLibraryItemById(
          this.valueTrackerLibraryItems,
          clip.valueTrackerLibraryItemId
        )

        if (linkedValueTrackerLibraryItem) {
          this.selectedValueTrackerLibraryItemId = linkedValueTrackerLibraryItem.id
          return linkedValueTrackerLibraryItem.id
        }

        const valueTrackerLibraryItemId = this.addValueTrackerLibraryItem({
          duration: clip.duration,
          name: valueTrackerTrack.name,
          stepSubdivision: clip.stepSubdivision,
          values: [...(clip.values ?? [])]
        })

        const valueTrackerLibraryItem = getValueTrackerLibraryItemById(
          this.valueTrackerLibraryItems,
          valueTrackerLibraryItemId
        )

        if (valueTrackerLibraryItem) {
          syncValueTrackerClipWithLibraryItem(clip, valueTrackerLibraryItem)
        }

        return valueTrackerLibraryItemId
      })
    },

    detachValueTrackerClipFromLibrary(valueTrackerTrackId, clipId) {
      return this.recordHistoryStep('detach-value-tracker-clip-library', () => {
        const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

        if (!valueTrackerTrack) {
          return
        }

        const clip = findClip(valueTrackerTrack, clipId)

        if (!clip) {
          return
        }

        detachValueTrackerClipLibraryReference(this, clip)
      })
    },

    assignFormulaToClip(trackId, clipId, formulaId) {
      return this.recordHistoryStep('assign-formula-to-clip', () => {
        const track = findTrack(this.tracks, trackId)
        const formula = getFormulaById(this.formulas, formulaId)

        if (!track || !formula) {
          return
        }

        const clip = findClip(track, clipId)

        if (!clip) {
          return
        }

        clip.formulaId = formula.id
        clip.formula = ''
        clip.formulaStereo = false
        clip.formulaName = null
        clip.leftFormula = ''
        clip.rightFormula = ''
        this.setSelectedClips([clip.id])
        this.selectedTrackId = trackId
        this.selectedFormulaId = formula.id
      })
    },

    detachClipFormula(trackId, clipId) {
      return this.recordHistoryStep('detach-clip-formula', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return
        }

        const clip = findClip(track, clipId)

        if (!clip || !clip.formulaId) {
          return
        }

        const formula = getFormulaById(this.formulas, clip.formulaId)

        if (!formula) {
          return
        }

        Object.assign(clip, getClipFormulaFieldsFromFormula(formula))
        clip.formulaName = formula.name
        clip.formulaId = null
        this.setSelectedClips([clip.id])
        this.selectedTrackId = trackId
        this.selectedFormulaId = null
      })
    },

    mutateClipFormula(trackId, clipId) {
      return this.recordHistoryStep('mutate-clip-formula', () => {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          return false
        }

        const clip = findClip(track, clipId)

        if (!clip) {
          return false
        }

        if (clip.formulaId) {
          const formula = getFormulaById(this.formulas, clip.formulaId)

          if (!formula) {
            return false
          }

          Object.assign(clip, getClipFormulaFieldsFromFormula(formula))
          clip.formulaName = formula.name
          clip.formulaId = null
        }

        let didMutate = false

        if (clip.formulaStereo) {
          const leftSource = clip.leftFormula || clip.formula || ''
          const rightSource = clip.rightFormula || clip.formula || ''
          const leftMutation = mutateFormula(leftSource)
          const rightMutation = mutateFormula(rightSource)

          if (typeof leftMutation === 'string' && leftMutation && leftMutation !== leftSource) {
            clip.leftFormula = leftMutation
            didMutate = true
          }

          if (typeof rightMutation === 'string' && rightMutation && rightMutation !== rightSource) {
            clip.rightFormula = rightMutation
            didMutate = true
          }

          if (didMutate) {
            clip.formula = clip.leftFormula || clip.formula || ''
          }
        } else {
          const source = clip.formula || clip.leftFormula || ''
          const mutation = mutateFormula(source)

          if (typeof mutation === 'string' && mutation && mutation !== source) {
            clip.formula = mutation
            didMutate = true
          }
        }

        if (!didMutate) {
          return false
        }

        this.setSelectedClips([clip.id])
        this.selectedTrackId = trackId
        this.selectedFormulaId = null
        return true
      })
    },

    removeClip(clipId) {
      return this.recordHistoryStep('remove-clip', () => {
        const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

        if (!result) {
          return
        }

        result.lane.clips.splice(result.clipIndex, 1)
        this.editingClipId = null
        this.removeSelectedClip(clipId)
      })
    },

    removeSelectedClips(clipIds = this.selectedClipIds) {
      return this.recordHistoryStep('remove-selected-clips', () => {
        const selectedClipIds = normalizeSelectedClipIds(clipIds)

        if (!selectedClipIds.length) {
          return
        }

        for (const clipId of selectedClipIds) {
          const result = findTimelineClip(
            this.tracks,
            this.variableTracks,
            this.valueTrackerTracks,
            clipId
          )

          if (!result) {
            continue
          }

          result.lane.clips.splice(result.clipIndex, 1)
        }

        if (selectedClipIds.includes(this.editingClipId)) {
          this.editingClipId = null
        }

        this.clearClipSelection()
      })
    },

    setEditingClip(clipId) {
      this.editingClipId = clipId
    },

    selectClip(clipId) {
      this.setSelectedClips(clipId ? [clipId] : [])
    },

    selectFormula(formulaId) {
      this.clearAutomationPointSelection()
      this.clearTimelineSectionLabelSelection()

      if (!formulaId) {
        this.selectedFormulaId = null
        return
      }

      const formula = getFormulaById(this.formulas, formulaId)

      if (!formula) {
        return
      }

      this.selectedFormulaId = formula.id
    },

    selectValueTrackerLibraryItem(valueTrackerLibraryItemId) {
      if (!valueTrackerLibraryItemId) {
        this.selectedValueTrackerLibraryItemId = null
        return
      }

      const valueTrackerLibraryItem = getValueTrackerLibraryItemById(
        this.valueTrackerLibraryItems,
        valueTrackerLibraryItemId
      )

      if (!valueTrackerLibraryItem) {
        return
      }

      this.selectedValueTrackerLibraryItemId = valueTrackerLibraryItem.id
    },

    selectTrack(trackId) {
      this.clearAutomationPointSelection()
      this.clearTimelineSectionLabelSelection()
      this.selectedTrackId = trackId
    },

    toggleValueTrackerTrackKeyboardTarget(valueTrackerTrackId) {
      const nextValueTrackerTrackId = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)?.id ?? null

      if (!nextValueTrackerTrackId) {
        return
      }

      if (this.valueTrackerRecordingSession) {
        this.selectedValueTrackerTrackId = this.valueTrackerRecordingSession.trackId
        return
      }

      this.selectedValueTrackerTrackId =
        this.selectedValueTrackerTrackId === nextValueTrackerTrackId
          ? null
          : nextValueTrackerTrackId
    }
  }
})
