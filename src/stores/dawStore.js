import { defineStore } from 'pinia'
import {
  DEFAULT_FORMULA_DROP_DURATION,
  clampDeltaToClipMoveIntervals,
  clampClipPlacementStart,
  getClipGroupMoveIntervals,
  getClipPlacement,
  clampClipResizeEnd,
  clampClipResizeStart,
  clampClipStart,
  intersectClipMoveIntervals,
  getTrackCreateBounds
} from '@/services/timelineService'
import { getDraggedTick } from '@/services/snapService'
import {
  createClipId,
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
import { createGroupId, generateGroupName } from '@/services/groupService'
import {
  createAudioEffect,
  createBitCrusherAudioEffect,
  createDistortionAudioEffect,
  createDelayAudioEffect,
  createEqAudioEffect,
  createLimiterAudioEffect,
  createReverbAudioEffect,
  createStereoWidenerAudioEffect,
  createChorusAudioEffect,
  createChebyshevAudioEffect,
  createAutoWahAudioEffect,
  createAutoFilterAudioEffect,
  createPingPongDelayAudioEffect,
  createPitchShiftAudioEffect,
  createTremoloAudioEffect,
  createVibratoAudioEffect,
  normalizeBits,
  normalizeDecay,
  normalizeDecibels,
  normalizeDepth,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeChorusDelayTime,
  normalizeChorusFrequency,
  normalizeVibratoFrequency,
  normalizeAutoWahBaseFrequency,
  normalizeAutoWahFollower,
  normalizeAutoWahGain,
  normalizeAutoWahOctaves,
  normalizeAutoWahQ,
  normalizeAutoWahSensitivity,
  normalizeOrder,
  normalizeTremoloFrequency,
  normalizeTremoloSpread,
  normalizeTremoloType,
  normalizePitchShiftPitch,
  normalizePitchShiftWindowSize,
  normalizeAutoFilterType,
  normalizeAutoFilterFilterType,
  normalizeAutoFilterFrequency,
  normalizeAutoFilterBaseFrequency,
  normalizeAutoFilterOctaves,
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
  getClipFormulaFieldsFromDraft
} from '@/services/formulaService'
import { DEFAULT_BPM_MEASURE, normalizeBpmMeasureExpression } from '@/services/bpmService'
import {
  createSharedProjectSnapshot,
  createSharedProjectUrl,
  fetchSharedProjectSnapshot
} from '@/services/sharedProjectService'
import {
  normalizeAutomationLaneHeight,
  normalizeTrackLaneHeight,
  normalizeValueTrackerTrackHeight,
  normalizeVariableTrackHeight
} from '@/services/timelineLaneLayoutService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getDefaultDemoProjectEntry } from '@/services/demoProjectService'
import { DEFAULT_BYTEBEAT_TYPE, normalizeBytebeatType } from '@/services/bytebeatTypeService'
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
  normalizeSnapSubdivisions,
  snapTicks
} from '@/utils/timeUtils'
import { DEFAULT_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { DEFAULT_PROJECT_TITLE, normalizeProjectTitle } from '@/utils/projectTitle'
import { TRACK_COLOR_PALETTE, getTrackColor } from '@/utils/colorUtils'
import {
  collectAutoVariableTrackNames,
  DEFAULT_VARIABLE_CLIP_FORMULA,
  getNextAvailableVariableTrackName
} from '@/services/variableTrackService'
import {
  DEFAULT_VALUE_TRACKER_STEP_SUBDIVISION,
  createDefaultValueTrackerBinding,
  createSparseRecordedValueTrackerValues,
  createConstantValueTrackerValues,
  createEmptyValueTrackerValues,
  doesValueTrackerBindingMatchInput,
  getValueTrackerRecordedStepIndex,
  getValueTrackerValueAtTime,
  isNumericValueTrackerInitializer,
  normalizeValueTrackerValue,
  normalizeValueTrackerValues,
  normalizeValueTrackerTrackName,
  resizeValueTrackerValues
} from '@/services/valueTrackerService'
import { enqueueSnackbar } from '@/services/notifications'
import {
  splitTimelineClip,
  splitValueTrackerClip
} from '@/services/timelineClipSplitService'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MIN_VALUE_TRACKER_RECORDING_DURATION = 1
const MAX_HISTORY_ENTRIES = 100
const AUTOMATION_KEYBOARD_NORMALIZED_STEP_COUNT = 10

function createDefaultProject() {
  return normalizeProject(getDefaultDemoProjectEntry()?.project) ?? createEmptyProject()
}

function createEmptyProject() {
  return {
    projectTitle: DEFAULT_PROJECT_TITLE,
    projectDescription: '',
    projectAuthor: '',
    projectLicense: 'CC0',
    projectMeta: null,
    shared: false,
    audioEffects: [],
    automationLanes: getDefaultAutomationLanes(),
    bpmMeasure: DEFAULT_BPM_MEASURE,
    bytebeatType: DEFAULT_BYTEBEAT_TYPE,
    evalEffects: [],
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 16,
    masterGain: 1,
    sampleRate: DEFAULT_SAMPLE_RATE,
    showEvaluatedPanel: true,
    showClipWaveforms: true,
    timelineAutoscrollEnabled: true,
    snapToGridEnabled: true,
    snapSubdivision: TIMELINE_SNAP_SUBDIVISIONS,
    tickSize: BASE_TICK_SIZE,
    timelineSectionLabels: [],
    tracks: [createTrack()],
    variableTracks: [],
    valueTrackerTracks: [],
    groups: [],
    zoom: 1
  }
}

function ensureNamedValueTrackerTracks(store, variableTrackNames = [], trackName = 'Value Tracker') {
  if (!Array.isArray(variableTrackNames) || !variableTrackNames.length) {
    return []
  }

  const createdValueTrackerTrackIds = []

  for (const variableTrackName of variableTrackNames) {
    if (findVariableTrack(store.variableTracks, variableTrackName)) {
      continue
    }

    const existingValueTrackerTrack = findValueTrackerTrackByVariableName(
      store.valueTrackerTracks,
      variableTrackName
    )

    if (existingValueTrackerTrack) {
      continue
    }

    const nextValueTrackerTrack = createValueTrackerTrack({
      name: trackName,
      variableName: variableTrackName
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
    bytebeatType: project.bytebeatType,
    clipDragPreview: null,
    clipClipboard: null,
    sharedProjectMeta: project.projectMeta,
    evalEffects: project.evalEffects,
    projectTitle: project.projectTitle,
    projectDescription: project.projectDescription,
    projectAuthor: project.projectAuthor,
    projectLicense: project.projectLicense || '',
    shared: typeof project.shared === 'boolean' ? project.shared : false,
    editingClipId: null,
    editingGroupId: null,
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
    timelineAutoscrollEnabled: project.timelineAutoscrollEnabled,
    snapToGridEnabled: project.snapToGridEnabled,
    snapSubdivision: project.snapSubdivision,
    tickSize: project.tickSize,
    timelineSectionLabels: project.timelineSectionLabels,
    tracks: project.tracks,
    variableTracks: project.variableTracks,
    valueTrackerTracks: project.valueTrackerTracks,
    groups: project.groups ?? [],
    historyApplying: false,
    historyFuture: [],
    historyPast: [],
    historyRecording: false,
    historyTransaction: null,
    selectedAutomationPoint: null,
    selectedClipIds: [],
    selectedClipId: null,
    selectedTrackId: null,
    selectedTimelineSectionLabelId: null,
    selectedValueTrackerTrackId: null,
    valueTrackerRecordingSession: null,
    valueTrackerLiveInputs: {},
    formulaAnalysisCache: {}
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
  store.editingGroupId = null
  store.selectedAutomationPoint = null
  store.selectedTrackId = null
  store.selectedTimelineSectionLabelId = null
  store.selectedValueTrackerTrackId = null
  store.valueTrackerRecordingSession = null
  store.valueTrackerLiveInputs = {}
  syncSelectedClipState(store, [])
}

function normalizeSharedProjectMeta(sharedProjectMeta) {
  if (!sharedProjectMeta || typeof sharedProjectMeta !== 'object') {
    return null
  }

  if (sharedProjectMeta.source !== 'shared') {
    return null
  }

  if (typeof sharedProjectMeta.snapshotId !== 'string' || !sharedProjectMeta.snapshotId.trim()) {
    return null
  }

  return {
    source: 'shared',
    snapshotId: sharedProjectMeta.snapshotId.trim()
  }
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
  store.bytebeatType = normalizedProject.bytebeatType
  store.evalEffects = normalizedProject.evalEffects
  store.projectTitle = normalizedProject.projectTitle
  store.projectDescription = normalizedProject.projectDescription
  store.projectAuthor = normalizedProject.projectAuthor
  store.sharedProjectMeta = normalizedProject.projectMeta
  store.loopEnabled = normalizedProject.loopEnabled
  store.loopStart = normalizedProject.loopStart
  store.loopEnd = normalizedProject.loopEnd
  store.masterGain = normalizedProject.masterGain
  store.zoom = normalizedProject.zoom
  store.sampleRate = normalizedProject.sampleRate
  store.showEvaluatedPanel = normalizedProject.showEvaluatedPanel
  store.showClipWaveforms = normalizedProject.showClipWaveforms
  store.timelineAutoscrollEnabled = normalizedProject.timelineAutoscrollEnabled
  store.snapToGridEnabled = normalizedProject.snapToGridEnabled
  store.snapSubdivision = normalizedProject.snapSubdivision
  store.tickSize = normalizedProject.tickSize
  store.timelineSectionLabels = normalizedProject.timelineSectionLabels
  store.tracks = normalizedProject.tracks
  store.variableTracks = normalizedProject.variableTracks
  store.valueTrackerTracks = normalizedProject.valueTrackerTracks
  store.groups = normalizedProject.groups ?? []
  store.formulaAnalysisCache = {}
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

function hasClipFormulaUpdates(updates = {}) {
  if (!updates || typeof updates !== 'object') {
    return false
  }

  return [
    'formula',
    'formulaId',
    'formulaName',
    'formulaStereo',
    'leftFormula',
    'rightFormula'
  ].some((key) => Object.hasOwn(updates, key))
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

function createClipboardClipItems(entries, tracks, variableTracks, valueTrackerTracks, anchorStart = null) {
  if (!entries.length) {
    return []
  }

  const sortedEntries = sortClipEntriesForClipboard(tracks, variableTracks, valueTrackerTracks, entries)
  const baseAnchorStart = Number.isFinite(anchorStart) ? anchorStart : (sortedEntries[0]?.clip.start ?? 0)

  return sortedEntries.map((entry) => {
    const inlineClipFormulaFields = createClipFormulaFields(entry.clip)

    return {
      duration: entry.clip.duration,
      ...inlineClipFormulaFields,
      stepSubdivision: entry.laneType === 'valueTracker' ? entry.clip.stepSubdivision : null,
      values: entry.laneType === 'valueTracker' ? [...(entry.clip.values ?? [])] : null,
      sourceLaneId: entry.laneId,
      sourceLaneType: entry.laneType,
      sourceTrackId: entry.laneType === 'track' ? entry.laneId : null,
      startOffset: entry.clip.start - baseAnchorStart
    }
  })
}

function buildClipClipboard(entries, tracks, variableTracks, valueTrackerTracks) {
  if (!entries.length) {
    return null
  }

  const sortedEntries = sortClipEntriesForClipboard(tracks, variableTracks, valueTrackerTracks, entries)
  const anchorStart = sortedEntries[0]?.clip.start ?? 0
  const anchorTickStart = Math.floor(Math.max(0, anchorStart))

  return {
    kind: 'clips',
    anchorStart,
    anchorTickOffset: anchorStart - anchorTickStart,
    clips: createClipboardClipItems(sortedEntries, tracks, variableTracks, valueTrackerTracks, anchorStart),
    sourceLaneIds: [...new Set(sortedEntries.map((entry) => `${entry.laneType}:${entry.laneId}`))]
  }
}

function createGroupClipboardContent(
  group,
  entries,
  tracks,
  variableTracks,
  valueTrackerTracks,
  anchorStart = null
) {
  if (!group || !entries.length) {
    return null
  }

  const sortedEntries = sortClipEntriesForClipboard(tracks, variableTracks, valueTrackerTracks, entries)
  const groupStart = Number.isFinite(Number(group.start))
    ? Number(group.start)
    : Math.min(...sortedEntries.map((entry) => entry.clip.start))
  const groupTrackIndex = Number.isInteger(group.trackIndex)
    ? group.trackIndex
    : Math.min(...sortedEntries.map((entry) => entry.trackIndex ?? 0))

  return {
    clips: sortedEntries.map((entry) => {
      const inlineClipFormulaFields = createClipFormulaFields(entry.clip)

      return {
        duration: entry.clip.duration,
        ...inlineClipFormulaFields,
        laneType: entry.laneType,
        stepSubdivision: entry.laneType === 'valueTracker' ? entry.clip.stepSubdivision : null,
        values: entry.laneType === 'valueTracker' ? [...(entry.clip.values ?? [])] : null,
        startOffset: entry.clip.start - groupStart,
        trackOffset: (entry.trackIndex ?? 0) - groupTrackIndex
      }
    }),
    name: group.name,
    startOffset: groupStart - (Number.isFinite(anchorStart) ? anchorStart : groupStart),
    trackIndex: groupTrackIndex
  }
}

function buildGroupClipboard(group, entries, tracks, variableTracks, valueTrackerTracks) {
  const groupContent = createGroupClipboardContent(
    group,
    entries,
    tracks,
    variableTracks,
    valueTrackerTracks
  )

  if (!groupContent) {
    return null
  }

  const groupStart = Number.isFinite(Number(group.start))
    ? Number(group.start)
    : Math.min(...entries.map((entry) => entry.clip.start))
  const anchorTickStart = Math.floor(Math.max(0, groupStart))

  return {
    kind: 'group',
    anchorStart: groupStart,
    anchorTickOffset: groupStart - anchorTickStart,
    group: groupContent
  }
}

function buildClipboardFromSelection(clipIds, groups, tracks, variableTracks, valueTrackerTracks) {
  const selectedEntries = getSelectedClipEntriesWithTrackIndex(
    tracks,
    variableTracks,
    valueTrackerTracks,
    clipIds
  )

  if (!selectedEntries.length) {
    return null
  }

  const selectedClipIdSet = new Set(selectedEntries.map((entry) => entry.clipId))
  const selectedGroups = (groups ?? [])
    .filter((group) => {
      const groupClipIds = getGroupClipIds(group)
      return groupClipIds.length && groupClipIds.every((clipId) => selectedClipIdSet.has(clipId))
    })
    .sort((leftGroup, rightGroup) => {
      const startDelta = (Number(leftGroup.start) || 0) - (Number(rightGroup.start) || 0)

      if (startDelta !== 0) {
        return startDelta
      }

      return (Number(leftGroup.trackIndex) || 0) - (Number(rightGroup.trackIndex) || 0)
    })

  if (!selectedGroups.length) {
    return buildClipClipboard(selectedEntries, tracks, variableTracks, valueTrackerTracks)
  }

  const groupedClipIdSet = new Set(selectedGroups.flatMap((group) => getGroupClipIds(group)))
  const looseEntries = selectedEntries.filter((entry) => !groupedClipIdSet.has(entry.clipId))

  if (selectedGroups.length === 1 && !looseEntries.length) {
    return buildGroupClipboard(
      selectedGroups[0],
      selectedEntries,
      tracks,
      variableTracks,
      valueTrackerTracks
    )
  }

  const anchorStart = Math.min(
    ...selectedGroups.map((group) => Number(group.start) || 0),
    ...looseEntries.map((entry) => entry.clip.start)
  )
  const normalizedAnchorStart = Number.isFinite(anchorStart) ? anchorStart : 0
  const anchorTickStart = Math.floor(Math.max(0, normalizedAnchorStart))

  return {
    kind: 'mixed',
    anchorStart: normalizedAnchorStart,
    anchorTickOffset: normalizedAnchorStart - anchorTickStart,
    clips: createClipboardClipItems(
      looseEntries,
      tracks,
      variableTracks,
      valueTrackerTracks,
      normalizedAnchorStart
    ),
    groups: selectedGroups
      .map((group) => {
        const groupEntries = selectedEntries.filter((entry) => entry.clip.groupId === group.id)
        return createGroupClipboardContent(
          group,
          groupEntries,
          tracks,
          variableTracks,
          valueTrackerTracks,
          normalizedAnchorStart
        )
      })
      .filter(Boolean)
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

function resolvePasteTargetLane(store, clipboardClip, overrideTarget) {
  if (
    overrideTarget?.laneType === 'variable' &&
    clipboardClip?.sourceLaneType === 'variable'
  ) {
    return {
      lane: resolvePasteTargetVariableTrack(store, overrideTarget.laneId),
      laneType: 'variable'
    }
  }

  if (
    overrideTarget?.laneType === 'valueTracker' &&
    clipboardClip?.sourceLaneType === 'valueTracker'
  ) {
    return {
      lane: resolvePasteTargetValueTrackerTrack(store, overrideTarget.laneId),
      laneType: 'valueTracker'
    }
  }

  if (
    overrideTarget?.laneType === 'track' &&
    clipboardClip?.sourceLaneType !== 'variable' &&
    clipboardClip?.sourceLaneType !== 'valueTracker'
  ) {
    return {
      lane: resolvePasteTargetTrack(store, overrideTarget.laneId),
      laneType: 'track'
    }
  }

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

function getLaneKey(laneType, laneId) {
  return `${laneType}:${laneId}`
}

function createClipForLaneType(laneType, clip) {
  if (laneType === 'variable') {
    return createVariableTrackClip(clip)
  }

  if (laneType === 'valueTracker') {
    return createValueTrackerClip(clip)
  }

  return createTrackClip(clip)
}

function applyClipSplitResult(store, laneEntry, splitResult, options = {}) {
  if (!laneEntry?.clip || !laneEntry?.lane || !splitResult?.rightClip) {
    return null
  }

  const selectClips = options.selectClips !== false
  const shiftRightClipStart = Number(options.shiftRightClipStart) || 0
  const shouldRecalculateGroupBounds = options.recalculateGroupBounds !== false

  laneEntry.clip.duration = splitResult.leftDuration

  if (Object.hasOwn(splitResult, 'leftValues')) {
    laneEntry.clip.values = splitResult.leftValues
  }

  const nextClip = createClipForLaneType(laneEntry.laneType, {
    ...splitResult.rightClip,
    start: splitResult.rightClip.start + shiftRightClipStart
  })

  laneEntry.lane.clips.push(nextClip)
  sortLaneClips(laneEntry)

  if (shouldRecalculateGroupBounds && laneEntry.clip.groupId) {
    store.recalculateGroupBounds(laneEntry.clip.groupId)
  }

  if (selectClips) {
    store.selectedTrackId = laneEntry.laneType === 'track' ? laneEntry.laneId : null
    store.setSelectedClips([laneEntry.clip.id, nextClip.id])
  }

  return nextClip.id
}

function shiftAutomationLanePointsAfterTime(automationLane, time, deltaTicks) {
  if (!Array.isArray(automationLane?.points) || !automationLane.points.length) {
    return false
  }

  let changed = false

  for (const point of automationLane.points) {
    if ((Number(point?.time) || 0) <= time) {
      continue
    }

    point.time = (Number(point.time) || 0) + deltaTicks
    changed = true
  }

  if (changed) {
    automationLane.points.sort((leftPoint, rightPoint) => leftPoint.time - rightPoint.time)
  }

  return changed
}

function shiftTimelineSectionLabelsAfterTime(timelineSectionLabels, time, deltaTicks) {
  if (!Array.isArray(timelineSectionLabels) || !timelineSectionLabels.length) {
    return false
  }

  let changed = false

  for (const timelineSectionLabel of timelineSectionLabels) {
    if ((Number(timelineSectionLabel?.time) || 0) <= time) {
      continue
    }

    timelineSectionLabel.time = (Number(timelineSectionLabel.time) || 0) + deltaTicks
    changed = true
  }

  if (changed) {
    sortTimelineSectionLabels(timelineSectionLabels)
  }

  return changed
}

function splitLaneClipsAtTime(store, laneEntry, time, deltaTicks, touchedGroupIds) {
  if (!Array.isArray(laneEntry?.lane?.clips) || !laneEntry.lane.clips.length) {
    return false
  }

  const laneClips = [...laneEntry.lane.clips]
  let changed = false

  for (const clip of laneClips) {
    const clipStart = Number(clip?.start) || 0
    const clipEnd = getClipEnd(clip)

    if (deltaTicks > 0 && clipStart >= time) {
      clip.start = clipStart + deltaTicks
      changed = true

      if (clip.groupId) {
        touchedGroupIds.add(clip.groupId)
      }

      continue
    }

    if (clipStart < time && clipEnd > time) {
      const splitResult = laneEntry.laneType === 'valueTracker'
        ? splitValueTrackerClip(clip, time)
        : splitTimelineClip(clip, time)

      if (!splitResult) {
        continue
      }

      applyClipSplitResult(store, {
        ...laneEntry,
        clip
      }, splitResult, {
        recalculateGroupBounds: false,
        selectClips: false,
        shiftRightClipStart: deltaTicks
      })
      changed = true

      if (clip.groupId) {
        touchedGroupIds.add(clip.groupId)
      }
    }
  }

  if (changed) {
    sortLaneClips(laneEntry)
  }

  return changed
}

function getLaneLabel(laneEntry) {
  if (!laneEntry) {
    return 'the target track'
  }

  if (laneEntry.laneType === 'variable') {
    return `variable "${laneEntry.lane?.name ?? laneEntry.laneId}"`
  }

  if (laneEntry.laneType === 'valueTracker') {
    return laneEntry.lane?.name
      ? `value tracker "${laneEntry.lane.name}"`
      : 'the target value tracker'
  }

  return laneEntry.lane?.name
    ? `track "${laneEntry.lane.name}"`
    : 'the target track'
}

function getOrCreatePastePlacementLane(laneByKey, laneEntry) {
  const laneKey = getLaneKey(laneEntry.laneType, laneEntry.laneId)
  const existingLane = laneByKey.get(laneKey)

  if (existingLane) {
    return existingLane
  }

  const nextLane = {
    lane: {
      ...laneEntry.lane,
      clips: Array.isArray(laneEntry.lane?.clips) ? [...laneEntry.lane.clips] : []
    },
    laneType: laneEntry.laneType
  }

  laneByKey.set(laneKey, nextLane)
  return nextLane
}

function planPasteClipPlacement(laneByKey, laneEntry, desiredStart, duration) {
  const targetLane = getOrCreatePastePlacementLane(laneByKey, laneEntry)
  const placement = getClipPlacement(targetLane.lane, desiredStart, duration)

  if (!placement.fitsAtStart) {
    return {
      ok: false,
      laneLabel: getLaneLabel(laneEntry)
    }
  }

  targetLane.lane.clips.push({
    duration,
    id: createClipId(),
    start: placement.start
  })
  sortLaneClips(targetLane)

  return {
    ok: true,
    start: placement.start
  }
}

function notifyPasteBlocked(reason) {
  const laneMessage = reason?.laneLabel ? ` in ${reason.laneLabel}` : ''

  enqueueSnackbar(
    `There is not enough space available${laneMessage}.`,
    { variant: 'warning' }
  )
}

function getClampedMoveDeltaForLaneSelections(laneSelections, desiredDelta) {
  let allowedIntervals = [
    {
      min: Number.NEGATIVE_INFINITY,
      max: Number.POSITIVE_INFINITY
    }
  ]

  for (const laneSelection of laneSelections) {
    allowedIntervals = intersectClipMoveIntervals(
      allowedIntervals,
      getClipGroupMoveIntervals(laneSelection.lane, laneSelection.clipIds)
    )

    if (!allowedIntervals.length) {
      return 0
    }
  }

  return clampDeltaToClipMoveIntervals(desiredDelta, allowedIntervals)
}

function hasPasteTargetForClipboard(clipboard, tracks, variableTracks, valueTrackerTracks) {
  if (!clipboard) {
    return false
  }

  if (clipboard.kind === 'mixed') {
    const groupDescriptors = Array.isArray(clipboard.groups) ? clipboard.groups : []
    const clipDescriptors = Array.isArray(clipboard.clips) ? clipboard.clips : []
    const groupsHaveTargets = groupDescriptors.every((groupDescriptor) =>
      Array.isArray(groupDescriptor?.clips) &&
      groupDescriptor.clips.length &&
      groupDescriptor.clips.every((groupClip) => {
        if (groupClip?.laneType === 'variable') {
          return Boolean(variableTracks.length)
        }

        if (groupClip?.laneType === 'valueTracker') {
          return Boolean(valueTrackerTracks.length)
        }

        return Boolean(tracks.length)
      })
    )

    const clipsHaveTargets = clipDescriptors.length
      ? clipDescriptors.some((clipboardClip) => {
          if (clipboardClip?.sourceLaneType === 'variable') {
            return Boolean(variableTracks.length)
          }

          if (clipboardClip?.sourceLaneType === 'valueTracker') {
            return Boolean(valueTrackerTracks.length)
          }

          return Boolean(tracks.length)
        })
      : false

    return (groupDescriptors.length && groupsHaveTargets) || clipsHaveTargets
  }

  if (clipboard.kind === 'group') {
    const groupClips = clipboard.group?.clips

    if (!Array.isArray(groupClips) || !groupClips.length) {
      return false
    }

    return groupClips.every((groupClip) => {
      if (groupClip?.laneType === 'variable') {
        return Boolean(variableTracks.length)
      }

      if (groupClip?.laneType === 'valueTracker') {
        return Boolean(valueTrackerTracks.length)
      }

      return Boolean(tracks.length)
    })
  }

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

function getClipboardSourceLaneIdSet(clipboard, laneType) {
  if (!clipboard?.clips?.length) {
    return new Set()
  }

  return new Set(
    clipboard.clips
      .filter((clipboardClip) => clipboardClip?.sourceLaneType === laneType && clipboardClip?.sourceLaneId)
      .map((clipboardClip) => clipboardClip.sourceLaneId)
  )
}

function getClipLanesInOrder(tracks, variableTracks, valueTrackerTracks) {
  return [
    ...variableTracks.map((lane, index) => ({
      lane,
      laneId: lane.name,
      laneType: 'variable',
      trackIndex: index
    })),
    ...valueTrackerTracks.map((lane, index) => ({
      lane,
      laneId: lane.id,
      laneType: 'valueTracker',
      trackIndex: variableTracks.length + index
    })),
    ...tracks.map((lane, index) => ({
      lane,
      laneId: lane.id,
      laneType: 'track',
      trackIndex: variableTracks.length + valueTrackerTracks.length + index
    }))
  ]
}

function getClipLaneIndexById(tracks, variableTracks, valueTrackerTracks) {
  const laneIndexById = new Map()

  for (const laneEntry of getClipLanesInOrder(tracks, variableTracks, valueTrackerTracks)) {
    laneIndexById.set(`${laneEntry.laneType}:${laneEntry.laneId}`, laneEntry.trackIndex)
  }

  return laneIndexById
}

function getSelectedClipEntriesWithTrackIndex(tracks, variableTracks, valueTrackerTracks, clipIds) {
  const laneIndexById = getClipLaneIndexById(tracks, variableTracks, valueTrackerTracks)

  return collectSelectedClipEntries(tracks, variableTracks, valueTrackerTracks, clipIds)
    .map((entry) => ({
      ...entry,
      trackIndex: laneIndexById.get(`${entry.laneType}:${entry.laneId}`)
    }))
    .filter((entry) => Number.isInteger(entry.trackIndex))
}

function getGroupClipEntriesWithTrackIndex(tracks, variableTracks, valueTrackerTracks, groupId) {
  if (typeof groupId !== 'string' || !groupId) {
    return []
  }

  return getClipLanesInOrder(tracks, variableTracks, valueTrackerTracks).flatMap((laneEntry) =>
    (Array.isArray(laneEntry.lane?.clips) ? laneEntry.lane.clips : [])
      .filter((clip) => clip?.groupId === groupId)
      .map((clip) => ({
        clip,
        clipId: clip.id,
        lane: laneEntry.lane,
        laneId: laneEntry.laneId,
        laneType: laneEntry.laneType,
        trackIndex: laneEntry.trackIndex
      }))
  )
}

function areEntriesGroupedInSingleLane(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return false
  }

  const firstEntry = entries[0]

  return entries.every((entry) =>
    entry.laneId === firstEntry.laneId && entry.laneType === firstEntry.laneType
  )
}

function getGroupById(groups, groupId) {
  if (!Array.isArray(groups) || typeof groupId !== 'string' || !groupId) {
    return null
  }

  return groups.find((group) => group.id === groupId) ?? null
}

function getGroupClipIds(group) {
  return Array.isArray(group?.clips)
    ? group.clips
        .map((groupClip) => groupClip?.clipId)
        .filter((clipId) => typeof clipId === 'string' && clipId)
    : []
}

function getGroupLaneEntry(store, groupId) {
  if (!groupId) {
    return null
  }

  const group = getGroupById(store.groups, groupId)
  const anchorClipId = getGroupClipIds(group)[0]

  if (!anchorClipId) {
    return null
  }

  return findTimelineClip(store.tracks, store.variableTracks, store.valueTrackerTracks, anchorClipId)
}

function getNewClipGroupAssignment(store, laneType, laneId) {
  if (!store.editingGroupId) {
    return {
      allowed: true,
      groupId: null
    }
  }

  const groupLaneEntry = getGroupLaneEntry(store, store.editingGroupId)

  if (!groupLaneEntry) {
    return {
      allowed: true,
      groupId: null
    }
  }

  if (groupLaneEntry.laneType !== laneType || groupLaneEntry.laneId !== laneId) {
    return {
      allowed: false,
      groupId: null
    }
  }

  return {
    allowed: true,
    groupId: store.editingGroupId
  }
}

function notifyNewClipGroupLaneMismatch() {
  enqueueSnackbar('New clips can only be created on the lane of the group being edited.', {
    variant: 'warning'
  })
}

function filterClipIdsByEditingGroup(store, clipIds) {
  const normalizedClipIds = normalizeSelectedClipIds(clipIds)

  if (!store.editingGroupId) {
    return normalizedClipIds
  }

  return normalizedClipIds.filter((clipId) => {
    const result = findTimelineClip(store.tracks, store.variableTracks, store.valueTrackerTracks, clipId)
    return result?.clip?.groupId === store.editingGroupId
  })
}

function syncGroupsAfterClipRemoval(store, removedClipIds = []) {
  const removedClipIdSet = new Set(normalizeSelectedClipIds(removedClipIds))

  if (!removedClipIdSet.size || !Array.isArray(store.groups) || !store.groups.length) {
    return []
  }

  const nextGroups = []
  const touchedGroupIds = []

  for (const group of store.groups) {
    const nextGroupClips = (group.clips ?? []).filter((groupClip) => !removedClipIdSet.has(groupClip.clipId))

    if (nextGroupClips.length !== (group.clips ?? []).length) {
      touchedGroupIds.push(group.id)
    }

    if (!nextGroupClips.length) {
      continue
    }

    nextGroups.push({
      ...group,
      clips: nextGroupClips
    })
  }

  store.groups = nextGroups

  if (store.editingGroupId && !getGroupById(store.groups, store.editingGroupId)) {
    store.editingGroupId = null
  }

  return touchedGroupIds
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
    getFormulaAnalysisByKey: (state) => (cacheKey) =>
      typeof cacheKey === 'string' && cacheKey ? state.formulaAnalysisCache[cacheKey] ?? null : null,
    pixelsPerTick: (state) => BASE_PIXELS_PER_TICK * state.zoom,
    canRedo: (state) => state.historyFuture.length > 0,
    canUndo: (state) => state.historyPast.length > 0,
    getGroupById: (state) => (groupId) => getGroupById(state.groups, groupId),
    editingGroup: (state) => getGroupById(state.groups, state.editingGroupId)
  },

  actions: {
    setProjectLicense(license) {
      this.projectLicense = typeof license === 'string' ? license : ''
    },
    setSharedProjectMeta(sharedProjectMeta) {
      this.sharedProjectMeta = normalizeSharedProjectMeta(sharedProjectMeta)
    },

    async shareProject() {
      const snapshot = this.createProjectSnapshot()

      if (!snapshot) {
        throw new Error('Could not serialize the current project.')
      }

      const { id: snapshotId, reused } = await createSharedProjectSnapshot(snapshot, this.projectTitle)

      const shareUrl = createSharedProjectUrl(snapshotId)
      console.log('[SHARE] Created shareUrl:', shareUrl)
      this.shared = true

      return {
        snapshotId,
        shareUrl,
        reused
      }
    },

    async loadSharedProject(snapshotId) {
      const snapshot = await fetchSharedProjectSnapshot(snapshotId)

      if (!snapshot) {
        return {
          notFound: true,
          ok: false
        }
      }

      if (!applyProjectState(this, snapshot)) {
        throw new Error('The shared snapshot payload is invalid.')
      }

      this.sharedProjectMeta = normalizeSharedProjectMeta({
        source: 'shared',
        snapshotId
      })
      this.clipClipboard = null
      this.clearHistory()

      return {
        notFound: false,
        ok: true
      }
    },

    setFormulaAnalysisByKey(cacheKey, result) {
      if (typeof cacheKey !== 'string' || !cacheKey) {
        return false
      }

      this.formulaAnalysisCache = {
        ...this.formulaAnalysisCache,
        [cacheKey]: result
      }

      return true
    },

    removeFormulaAnalysisByKey(cacheKey) {
      if (
        typeof cacheKey !== 'string' ||
        !cacheKey ||
        !Object.hasOwn(this.formulaAnalysisCache, cacheKey)
      ) {
        return false
      }

      const nextFormulaAnalysisCache = {
        ...this.formulaAnalysisCache
      }

      delete nextFormulaAnalysisCache[cacheKey]
      this.formulaAnalysisCache = nextFormulaAnalysisCache
      return true
    },

    clearFormulaAnalysisCache() {
      this.formulaAnalysisCache = {}
    },

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
      if (!this.historyPast.length) {
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
      if (!this.historyFuture.length) {
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
          ? snapTicks(nextTime, this.snapSubdivision)
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

    splitAllAtTime(time) {
      return this.recordHistoryStep('split-all', () => {
        const normalizedTime = Math.max(0, Number(time) || 0)
        let changed = false
        const touchedGroupIds = new Set()

        for (const laneEntry of getClipLanesInOrder(
          this.tracks,
          this.variableTracks,
          this.valueTrackerTracks
        )) {
          changed = splitLaneClipsAtTime(
            this,
            laneEntry,
            normalizedTime,
            0,
            touchedGroupIds
          ) || changed
        }

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        return changed
      })
    },

    addBarAtTime(time, duration = 1) {
      return this.recordHistoryStep('add-bar', () => {
        const normalizedTime = Math.max(0, Number(time) || 0)
        const normalizedDuration = Number(duration)

        if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
          return false
        }

        let changed = false
        const touchedGroupIds = new Set()

        for (const laneEntry of getClipLanesInOrder(
          this.tracks,
          this.variableTracks,
          this.valueTrackerTracks
        )) {
          changed = splitLaneClipsAtTime(
            this,
            laneEntry,
            normalizedTime,
            normalizedDuration,
            touchedGroupIds
          ) || changed
        }

        for (const automationLane of this.automationLanes) {
          changed = shiftAutomationLanePointsAfterTime(
            automationLane,
            normalizedTime,
            normalizedDuration
          ) || changed
        }

        changed = shiftTimelineSectionLabelsAfterTime(
          this.timelineSectionLabels,
          normalizedTime,
          normalizedDuration
        ) || changed

        if (this.loopStart > normalizedTime) {
          this.loopStart += normalizedDuration
          changed = true
        }

        if (this.loopEnd > normalizedTime) {
          this.loopEnd += normalizedDuration
          changed = true
        }

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        return changed
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

        const nextTime = Math.max(0, snapTicks(point.time, this.snapSubdivision) + normalizedDeltaTicks)

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
        this.clearFormulaAnalysisCache()
      })
    },

    setBpmMeasure(value) {
      return this.recordHistoryStep('set-bpm-measure', () => {
        this.bpmMeasure = normalizeBpmMeasureExpression(value, this.bpmMeasure)
      })
    },

    setBytebeatType(value) {
      return this.recordHistoryStep('set-bytebeat-type', () => {
        this.bytebeatType = normalizeBytebeatType(value, this.bytebeatType)
      })
    },

    setProjectTitle(value) {
      return this.recordHistoryStep('set-project-title', () => {
        this.projectTitle = normalizeProjectTitle(value, this.projectTitle)
      })
    },

    setProjectDescription(value) {
      const normalized = typeof value === 'string' ? value.trim() : ''
      this.projectDescription = normalized
    },

    setProjectAuthor(value) {
      const normalized = typeof value === 'string' ? value.trim() : ''
      this.projectAuthor = normalized
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

    setTimelineAutoscrollEnabled(value) {
      this.timelineAutoscrollEnabled = Boolean(value)
      return this.timelineAutoscrollEnabled
    },

    setSnapToGridEnabled(value) {
      this.snapToGridEnabled = Boolean(value)
      return this.snapToGridEnabled
    },

    setSnapSubdivision(value) {
      this.snapSubdivision = normalizeSnapSubdivisions(value, this.snapSubdivision)
      return this.snapSubdivision
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
          return
        }

        if (effect.type === 'bitCrusher') {
          const defaults = createBitCrusherAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'vibrato') {
          const defaults = createVibratoAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'chorus') {
          const defaults = createChorusAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'chebyshev') {
          const defaults = createChebyshevAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'autoWah') {
          const defaults = createAutoWahAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'tremolo') {
          const defaults = createTremoloAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'pingPongDelay') {
          const defaults = createPingPongDelayAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'pitchShift') {
          const defaults = createPitchShiftAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
        }

        if (effect.type === 'autoFilter') {
          const defaults = createAutoFilterAudioEffect({ id: effect.id })
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

      if (effect.type === 'bitCrusher') {
        if (typeof params.bits !== 'undefined') {
          effect.params.bits = normalizeBits(params.bits)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'vibrato') {
        if (typeof params.frequency !== 'undefined') {
          effect.params.frequency = normalizeVibratoFrequency(params.frequency)
        }

        if (typeof params.depth !== 'undefined') {
          effect.params.depth = normalizeDepth(params.depth)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'chorus') {
        if (typeof params.frequency !== 'undefined') {
          effect.params.frequency = normalizeChorusFrequency(params.frequency)
        }

        if (typeof params.delayTime !== 'undefined') {
          effect.params.delayTime = normalizeChorusDelayTime(params.delayTime)
        }

        if (typeof params.depth !== 'undefined') {
          effect.params.depth = normalizeDepth(params.depth)
        }

        if (typeof params.feedback !== 'undefined') {
          effect.params.feedback = normalizeFeedback(params.feedback)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'chebyshev') {
        if (typeof params.order !== 'undefined') {
          effect.params.order = normalizeOrder(params.order)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'autoWah') {
        if (typeof params.baseFrequency !== 'undefined') {
          effect.params.baseFrequency = normalizeAutoWahBaseFrequency(params.baseFrequency)
        }

        if (typeof params.octaves !== 'undefined') {
          effect.params.octaves = normalizeAutoWahOctaves(params.octaves)
        }

        if (typeof params.sensitivity !== 'undefined') {
          effect.params.sensitivity = normalizeAutoWahSensitivity(params.sensitivity)
        }

        if (typeof params.follower !== 'undefined') {
          effect.params.follower = normalizeAutoWahFollower(params.follower)
        }

        if (typeof params.q !== 'undefined') {
          effect.params.q = normalizeAutoWahQ(params.q)
        }

        if (typeof params.gain !== 'undefined') {
          effect.params.gain = normalizeAutoWahGain(params.gain)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'tremolo') {
        if (typeof params.frequency !== 'undefined') {
          effect.params.frequency = normalizeTremoloFrequency(params.frequency)
        }

        if (typeof params.depth !== 'undefined') {
          effect.params.depth = normalizeDepth(params.depth)
        }

        if (typeof params.spread !== 'undefined') {
          effect.params.spread = normalizeTremoloSpread(params.spread)
        }

        if (typeof params.type !== 'undefined') {
          effect.params.type = normalizeTremoloType(params.type)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'pingPongDelay') {
        if (typeof params.delayTime !== 'undefined') {
          effect.params.delayTime = normalizeTime(params.delayTime)
        }

        if (typeof params.feedback !== 'undefined') {
          effect.params.feedback = normalizeFeedback(params.feedback)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'pitchShift') {
        if (typeof params.pitch !== 'undefined') {
          effect.params.pitch = normalizePitchShiftPitch(params.pitch)
        }

        if (typeof params.windowSize !== 'undefined') {
          effect.params.windowSize = normalizePitchShiftWindowSize(params.windowSize)
        }

        if (typeof params.feedback !== 'undefined') {
          effect.params.feedback = normalizeFeedback(params.feedback)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }

      if (effect.type === 'autoFilter') {
        if (typeof params.frequency !== 'undefined') {
          effect.params.frequency = normalizeAutoFilterFrequency(params.frequency)
        }

        if (typeof params.depth !== 'undefined') {
          effect.params.depth = normalizeDepth(params.depth)
        }

        if (typeof params.type !== 'undefined') {
          effect.params.type = normalizeAutoFilterType(params.type)
        }

        if (typeof params.baseFrequency !== 'undefined') {
          effect.params.baseFrequency = normalizeAutoFilterBaseFrequency(params.baseFrequency)
        }

        if (typeof params.octaves !== 'undefined') {
          effect.params.octaves = normalizeAutoFilterOctaves(params.octaves)
        }

        if (typeof params.filterType !== 'undefined') {
          effect.params.filterType = normalizeAutoFilterFilterType(params.filterType)
        }

        if (typeof params.wet !== 'undefined') {
          effect.params.wet = normalizeWet(params.wet)
        }
      }
    },

    toggleLoop() {
      this.loopEnabled = !this.loopEnabled
    },

    setLoopStart(tick) {
      const snappedTick = snapTicks(Math.max(0, tick), this.snapSubdivision)
      this.loopStart = Math.min(snappedTick, this.loopEnd - MIN_LOOP_DURATION)
    },

    setLoopEnd(tick) {
      const snappedTick = snapTicks(Math.max(0, tick), this.snapSubdivision)
      this.loopEnd = Math.max(snappedTick, this.loopStart + MIN_LOOP_DURATION)
    },

    setLoopRange(startTick, endTick) {
      const snappedStart = snapTicks(Math.max(0, startTick), this.snapSubdivision)
      const snappedEnd = snapTicks(Math.max(0, endTick), this.snapSubdivision)

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
        const nextVariableName = getNextAvailableVariableTrackName(
          this.variableTracks,
          this.valueTrackerTracks
        )
        recordingTrack = createValueTrackerTrack({
          variableName: nextVariableName
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

    recalculateGroupBounds(groupId) {
      const group = this.getGroupById(groupId)

      if (!group) {
        return false
      }

      const entries = getGroupClipEntriesWithTrackIndex(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        groupId
      )

      if (!entries.length) {
        return false
      }

      const minStart = Math.min(...entries.map((entry) => entry.clip.start))
      const maxEnd = Math.max(...entries.map((entry) => getClipEnd(entry.clip)))
      const minTrackIndex = Math.min(...entries.map((entry) => entry.trackIndex))

      group.start = minStart
      group.duration = maxEnd - minStart
      group.trackIndex = minTrackIndex
      group.clips = entries.map((entry) => ({
        clipId: entry.clipId,
        timeOffset: entry.clip.start - minStart,
        trackOffset: entry.trackIndex - minTrackIndex
      }))
      return true
    },

    recalculateAllGroupBounds() {
      if (!Array.isArray(this.groups) || !this.groups.length) {
        return
      }

      for (const group of [...this.groups]) {
        this.recalculateGroupBounds(group.id)
      }
    },

    canCreateGroup(clipIds = this.selectedClipIds) {
      const selectedEntries = getSelectedClipEntriesWithTrackIndex(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        clipIds
      )

      return selectedEntries.length >= 2 && areEntriesGroupedInSingleLane(selectedEntries)
    },

    createGroup(clipIds = this.selectedClipIds) {
      return this.recordHistoryStep('create-group', () => {
        const selectedEntries = getSelectedClipEntriesWithTrackIndex(
          this.tracks,
          this.variableTracks,
          this.valueTrackerTracks,
          clipIds
        )

        if (selectedEntries.length < 2) {
          return null
        }

        if (!areEntriesGroupedInSingleLane(selectedEntries)) {
          enqueueSnackbar('Only clips from the same lane can be grouped.', {
            variant: 'warning'
          })
          return null
        }

        const nextGroupId = createGroupId()
        const minStart = Math.min(...selectedEntries.map((entry) => entry.clip.start))
        const maxEnd = Math.max(...selectedEntries.map((entry) => getClipEnd(entry.clip)))
        const minTrackIndex = Math.min(...selectedEntries.map((entry) => entry.trackIndex))

        for (const entry of selectedEntries) {
          if (entry.clip.groupId && entry.clip.groupId !== nextGroupId) {
            this.ungroup(entry.clip.groupId)
          }

          entry.clip.groupId = nextGroupId
        }

        this.groups.push({
          id: nextGroupId,
          name: generateGroupName(this.groups),
          start: minStart,
          trackIndex: minTrackIndex,
          duration: maxEnd - minStart,
          clips: selectedEntries.map((entry) => ({
            clipId: entry.clipId,
            timeOffset: entry.clip.start - minStart,
            trackOffset: entry.trackIndex - minTrackIndex
          }))
        })

        this.setSelectedClips(selectedEntries.map((entry) => entry.clipId))
        return nextGroupId
      })
    },

    moveGroup(groupId, newStart, newTrackIndex, shouldSnap = true) {
      const group = this.getGroupById(groupId)

      if (!group) {
        return false
      }

      const entries = getSelectedClipEntriesWithTrackIndex(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        getGroupClipIds(group)
      )

      if (!entries.length) {
        return false
      }

      const lanesInOrder = getClipLanesInOrder(this.tracks, this.variableTracks, this.valueTrackerTracks)
      const laneByIndex = new Map(lanesInOrder.map((laneEntry) => [laneEntry.trackIndex, laneEntry]))
      const nextStart = getDraggedTick(newStart, shouldSnap, this.snapSubdivision)
      const desiredTimeDelta = nextStart - group.start
      const nextTrackIndexValue = Math.max(0, Math.floor(Number(newTrackIndex) || 0))
      const trackDelta = nextTrackIndexValue - group.trackIndex

      if (trackDelta !== 0) {
        for (const entry of entries) {
          const targetLane = laneByIndex.get(entry.trackIndex + trackDelta)

          if (!targetLane || targetLane.laneType !== entry.laneType) {
            return false
          }
        }
      }

      if (trackDelta === 0) {
        const clipsByLane = new Map()

        for (const entry of entries) {
          const laneKey = getLaneKey(entry.laneType, entry.laneId)
          const laneSelection = clipsByLane.get(laneKey) ?? {
            clipIds: [],
            lane: entry.lane
          }

          laneSelection.clipIds.push(entry.clipId)
          clipsByLane.set(laneKey, laneSelection)
        }

        const timeDelta = getClampedMoveDeltaForLaneSelections(
          [...clipsByLane.values()],
          desiredTimeDelta
        )

        for (const entry of entries) {
          entry.clip.start += timeDelta
        }

        for (const laneEntry of lanesInOrder) {
          sortLaneClips(laneEntry)
        }

        this.recalculateGroupBounds(groupId)
        this.setSelectedClips(getGroupClipIds(this.getGroupById(groupId)))
        return true
      }

      const selectedClipIdSet = new Set(entries.map((entry) => entry.clipId))
      const laneStateByKey = new Map(
        lanesInOrder.map((laneEntry) => [
          getLaneKey(laneEntry.laneType, laneEntry.laneId),
          {
            lane: {
              ...laneEntry.lane,
              clips: laneEntry.lane.clips.filter((clip) => !selectedClipIdSet.has(clip.id))
            },
            laneType: laneEntry.laneType
          }
        ])
      )
      const plannedMoves = []

      for (const entry of entries) {
        const targetLaneEntry = laneByIndex.get(entry.trackIndex + trackDelta)
        const targetLaneState = laneStateByKey.get(getLaneKey(targetLaneEntry.laneType, targetLaneEntry.laneId))
        const desiredClipStart = entry.clip.start + desiredTimeDelta
        const placement = getClipPlacement(targetLaneState.lane, desiredClipStart, entry.clip.duration)

        if (!placement.fitsAtStart) {
          return false
        }

        targetLaneState.lane.clips.push({
          duration: entry.clip.duration,
          id: createClipId(),
          start: placement.start
        })
        sortLaneClips(targetLaneState)
        plannedMoves.push({
          entry,
          start: placement.start,
          targetLaneEntry
        })
      }

      const clipsBySourceLane = new Map()

      for (const plan of plannedMoves) {
        const sourceKey = getLaneKey(plan.entry.laneType, plan.entry.laneId)

        if (!clipsBySourceLane.has(sourceKey)) {
          clipsBySourceLane.set(sourceKey, {
            clips: [],
            sourceLane: plan.entry.lane
          })
        }

        clipsBySourceLane.get(sourceKey).clips.push(plan.entry.clip)
      }

      for (const sourceLaneEntry of clipsBySourceLane.values()) {
        sourceLaneEntry.sourceLane.clips = sourceLaneEntry.sourceLane.clips.filter(
          (clip) => !sourceLaneEntry.clips.includes(clip)
        )
      }

      for (const plan of plannedMoves) {
        plan.entry.clip.start = plan.start
        plan.targetLaneEntry.lane.clips.push(plan.entry.clip)
      }

      for (const laneEntry of lanesInOrder) {
        sortLaneClips(laneEntry)
      }

      this.recalculateGroupBounds(groupId)
      this.setSelectedClips(getGroupClipIds(this.getGroupById(groupId)))
      return true
    },

    renameGroup(groupId, name) {
      return this.recordHistoryStep('rename-group', () => {
        const group = this.getGroupById(groupId)

        if (!group || typeof name !== 'string') {
          return false
        }

        const nextName = name.trim()

        if (!nextName) {
          return false
        }

        group.name = nextName
        return true
      })
    },

    copyGroup(groupId) {
      const group = this.getGroupById(groupId)

      if (!group) {
        return false
      }

      const groupClipIds = getGroupClipIds(group)
      const selectedClipEntries = getSelectedClipEntriesWithTrackIndex(
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks,
        groupClipIds
      )
      const nextClipboard = buildGroupClipboard(
        group,
        selectedClipEntries,
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks
      )

      if (!nextClipboard) {
        return false
      }

      this.clipClipboard = nextClipboard
      this.setSelectedClips(groupClipIds)
      return true
    },

    deleteGroup(groupId) {
      return this.recordHistoryStep('delete-group', () => {
        const group = this.getGroupById(groupId)

        if (!group) {
          return false
        }

        const groupClipIds = getGroupClipIds(group)

        for (const clipId of groupClipIds) {
          const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

          if (!result) {
            continue
          }

          result.lane.clips.splice(result.clipIndex, 1)
        }

        this.groups = this.groups.filter((entry) => entry.id !== groupId)

        if (this.editingGroupId === groupId) {
          this.editingGroupId = null
        }

        if (groupClipIds.includes(this.editingClipId)) {
          this.editingClipId = null
        }

        this.setSelectedClips(
          this.selectedClipIds.filter((selectedClipId) => !groupClipIds.includes(selectedClipId))
        )

        return true
      })
    },

    ungroup(groupId) {
      return this.recordHistoryStep('ungroup', () => {
        const group = this.getGroupById(groupId)

        if (!group) {
          return false
        }

        const clipIdSet = new Set(getGroupClipIds(group))

        for (const clipId of clipIdSet) {
          const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

          if (result?.clip) {
            result.clip.groupId = null
          }
        }

        this.groups = this.groups.filter((entry) => entry.id !== groupId)

        if (this.editingGroupId === groupId) {
          this.editingGroupId = null
        }

        return true
      })
    },

    enterGroupEdit(groupId) {
      const group = this.getGroupById(groupId)

      if (!group) {
        return false
      }

      this.editingGroupId = groupId
      this.clearClipSelection()
      this.editingClipId = null
      this.selectedTrackId = null
      this.selectedTimelineSectionLabelId = null
      this.selectedAutomationPoint = null
      return true
    },

    exitGroupEdit() {
      this.editingGroupId = null
      return true
    },

    setSelectedClips(clipIds) {
      syncSelectedClipState(this, filterClipIdsByEditingGroup(this, clipIds))
    },

    addSelectedClip(clipId) {
      syncSelectedClipState(this, filterClipIdsByEditingGroup(this, [...this.selectedClipIds, clipId]))
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

    addSelectedClips(clipIds) {
      syncSelectedClipState(this, filterClipIdsByEditingGroup(this, [...this.selectedClipIds, ...clipIds]))
    },

    removeSelectedClipIds(clipIds) {
      const clipIdSet = new Set(normalizeSelectedClipIds(clipIds))

      syncSelectedClipState(
        this,
        this.selectedClipIds.filter((selectedClipId) => !clipIdSet.has(selectedClipId))
      )
    },

    copySelectedClips() {
      const nextClipboard = buildClipboardFromSelection(
        this.selectedClipIds,
        this.groups,
        this.tracks,
        this.variableTracks,
        this.valueTrackerTracks
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
        this.valueTrackerTracks
      )

      if (!nextClipboard) {
        return false
      }

      this.clipClipboard = nextClipboard
      return true
    },

    cutSelectedClips() {
      const selectedClipIds = [...this.selectedClipIds]

      if (!selectedClipIds.length || !this.copySelectedClips()) {
        return false
      }

      this.removeSelectedClips(selectedClipIds)
      return true
    },

    pasteClipboardAtTick(anchorTick, target = null) {
      if (!this.canPasteClipsAtPlayhead) {
        return []
      }

      return this.recordHistoryStep('paste-clips', () => {
        const clipboard = this.clipClipboard

        if (
          (!clipboard?.clips?.length && clipboard?.kind !== 'group' && clipboard?.kind !== 'mixed') ||
          (!this.tracks.length && !this.variableTracks.length && !this.valueTrackerTracks.length)
        ) {
          return []
        }

        const pastedClipIds = []
        const touchedLaneEntries = []
        const baseTick = Number.isFinite(anchorTick) ? anchorTick : this.time
        const pasteAnchorStart = getPasteAnchorStart(baseTick, clipboard)
        let pastedAnchorTrackId = null

        this.editingClipId = null

        if (clipboard.kind === 'group') {
          const lanesInOrder = getClipLanesInOrder(this.tracks, this.variableTracks, this.valueTrackerTracks)
          const laneByIndex = new Map(lanesInOrder.map((laneEntry) => [laneEntry.trackIndex, laneEntry]))
          const laneIndexByKey = new Map(
            lanesInOrder.map((laneEntry) => [`${laneEntry.laneType}:${laneEntry.laneId}`, laneEntry.trackIndex])
          )
          const groupClips = Array.isArray(clipboard.group?.clips) ? clipboard.group.clips : []

          if (!groupClips.length) {
            return []
          }

          const overrideLaneIndex = target?.laneId && target?.laneType
            ? laneIndexByKey.get(`${target.laneType}:${target.laneId}`)
            : undefined
          const baseTrackIndex = Number.isInteger(overrideLaneIndex)
            ? overrideLaneIndex
            : Math.max(0, Math.floor(Number(clipboard.group?.trackIndex) || 0))

          const targetLaneEntries = []

          for (const groupClip of groupClips) {
            const targetTrackIndex = baseTrackIndex + Math.max(0, Math.floor(Number(groupClip.trackOffset) || 0))
            const targetLaneEntry = laneByIndex.get(targetTrackIndex)

            if (!targetLaneEntry || targetLaneEntry.laneType !== groupClip.laneType) {
              return []
            }

            targetLaneEntries.push(targetLaneEntry)
          }

          const pastePlacementLaneByKey = new Map()
          const plannedGroupClips = []

          for (const [index, groupClip] of groupClips.entries()) {
            const targetLaneEntry = targetLaneEntries[index]
            const desiredStart = pasteAnchorStart + (Number(groupClip.startOffset) || 0)
            const placementPlan = planPasteClipPlacement(
              pastePlacementLaneByKey,
              targetLaneEntry,
              desiredStart,
              groupClip.duration
            )

            if (!placementPlan.ok) {
              notifyPasteBlocked(placementPlan)
              return []
            }

            plannedGroupClips.push({
              groupClip,
              start: placementPlan.start,
              targetLaneEntry
            })
          }

          const nextGroupId = createGroupId()

          for (const plannedGroupClip of plannedGroupClips) {
            const { groupClip, start, targetLaneEntry } = plannedGroupClip
            const nextClip = targetLaneEntry.laneType === 'variable'
              ? createVariableTrackClip({
                  duration: groupClip.duration,
                  formula: groupClip.formula ?? null,
                  groupId: nextGroupId,
                  start
                })
              : targetLaneEntry.laneType === 'valueTracker'
                ? createValueTrackerClip({
                    duration: groupClip.duration,
                    groupId: nextGroupId,
                    start,
                    stepSubdivision: groupClip.stepSubdivision,
                    values: groupClip.values
                  })
                : createTrackClip({
                    duration: groupClip.duration,
                    ...createClipFormulaFields(groupClip),
                    groupId: nextGroupId,
                    start
                  })

            targetLaneEntry.lane.clips.push(nextClip)
            pastedClipIds.push(nextClip.id)
            touchedLaneEntries.push(targetLaneEntry)

            if (pastedAnchorTrackId === null) {
              pastedAnchorTrackId = targetLaneEntry.laneType === 'track' ? targetLaneEntry.lane.id : null
            }
          }

          if (!pastedClipIds.length) {
            return []
          }

          for (const touchedLaneEntry of touchedLaneEntries) {
            sortLaneClips(touchedLaneEntry)
          }

          this.groups.push({
            id: nextGroupId,
            name: generateGroupName(this.groups),
            start: pasteAnchorStart,
            trackIndex: baseTrackIndex,
            duration: 1,
            clips: pastedClipIds.map((clipId) => ({
              clipId,
              timeOffset: 0,
              trackOffset: 0
            }))
          })
          this.recalculateGroupBounds(nextGroupId)
          this.setSelectedClips(pastedClipIds)
          this.selectedTrackId = pastedAnchorTrackId
          return pastedClipIds
        }

        if (clipboard.kind === 'mixed') {
          const lanesInOrder = getClipLanesInOrder(this.tracks, this.variableTracks, this.valueTrackerTracks)
          const laneByIndex = new Map(lanesInOrder.map((laneEntry) => [laneEntry.trackIndex, laneEntry]))
          const laneIndexByKey = new Map(
            lanesInOrder.map((laneEntry) => [`${laneEntry.laneType}:${laneEntry.laneId}`, laneEntry.trackIndex])
          )
          const groupDescriptors = Array.isArray(clipboard.groups) ? clipboard.groups : []
          const looseClips = Array.isArray(clipboard.clips) ? clipboard.clips : []
          const canOverrideSingleGroup = groupDescriptors.length === 1 && !looseClips.length
          const groupOverrideLaneIndex = canOverrideSingleGroup && target?.laneId && target?.laneType
            ? laneIndexByKey.get(`${target.laneType}:${target.laneId}`)
            : undefined
          const pastePlacementLaneByKey = new Map()
          const plannedGroups = []

          for (const groupDescriptor of groupDescriptors) {
            const groupClips = Array.isArray(groupDescriptor?.clips) ? groupDescriptor.clips : []

            if (!groupClips.length) {
              continue
            }

            const baseTrackIndex = Number.isInteger(groupOverrideLaneIndex)
              ? groupOverrideLaneIndex
              : Math.max(0, Math.floor(Number(groupDescriptor?.trackIndex) || 0))
            const groupStart = pasteAnchorStart + (Number(groupDescriptor?.startOffset) || 0)
            const targetLaneEntries = []

            for (const groupClip of groupClips) {
              const targetTrackIndex = baseTrackIndex + Math.max(0, Math.floor(Number(groupClip.trackOffset) || 0))
              const targetLaneEntry = laneByIndex.get(targetTrackIndex)

              if (!targetLaneEntry || targetLaneEntry.laneType !== groupClip.laneType) {
                return []
              }

              targetLaneEntries.push(targetLaneEntry)
            }

            const plannedGroupClips = []

            for (const [index, groupClip] of groupClips.entries()) {
              const targetLaneEntry = targetLaneEntries[index]
              const desiredStart = groupStart + (Number(groupClip.startOffset) || 0)
              const placementPlan = planPasteClipPlacement(
                pastePlacementLaneByKey,
                targetLaneEntry,
                desiredStart,
                groupClip.duration
              )

              if (!placementPlan.ok) {
                notifyPasteBlocked(placementPlan)
                return []
              }

              plannedGroupClips.push({
                groupClip,
                start: placementPlan.start,
                targetLaneEntry
              })
            }

            if (!plannedGroupClips.length) {
              continue
            }

            plannedGroups.push({
              baseTrackIndex,
              groupStart,
              plannedGroupClips
            })
          }

          const sourceTrackLaneIds = getClipboardSourceLaneIdSet({ clips: looseClips }, 'track')
          const sourceVariableLaneIds = getClipboardSourceLaneIdSet({ clips: looseClips }, 'variable')
          const sourceValueTrackerLaneIds = getClipboardSourceLaneIdSet({ clips: looseClips }, 'valueTracker')

          const overrideEnabledByType = {
            track: sourceTrackLaneIds.size <= 1,
            variable: sourceVariableLaneIds.size <= 1,
            valueTracker: sourceValueTrackerLaneIds.size <= 1
          }

          const overrideTarget = {
            laneId: target?.laneId ?? null,
            laneType: target?.laneType ?? null
          }
          const plannedLooseClips = []

          for (const clipboardClip of looseClips) {
            const clipLaneType = clipboardClip?.sourceLaneType === 'variable'
              ? 'variable'
              : clipboardClip?.sourceLaneType === 'valueTracker'
                ? 'valueTracker'
                : 'track'

            const scopedOverrideTarget = overrideEnabledByType[clipLaneType] ? overrideTarget : null
            const targetEntry = resolvePasteTargetLane(this, clipboardClip, scopedOverrideTarget)

            if (!targetEntry.lane) {
              continue
            }

            const desiredStart = pasteAnchorStart + clipboardClip.startOffset
            const placementPlan = planPasteClipPlacement(
              pastePlacementLaneByKey,
              targetEntry,
              desiredStart,
              clipboardClip.duration
            )

            if (!placementPlan.ok) {
              notifyPasteBlocked(placementPlan)
              return []
            }

            plannedLooseClips.push({
              clipboardClip,
              start: placementPlan.start,
              targetEntry
            })
          }

          for (const plannedGroup of plannedGroups) {
            const nextGroupId = createGroupId()
            const groupPastedClipIds = []

            for (const plannedGroupClip of plannedGroup.plannedGroupClips) {
              const { groupClip, start, targetLaneEntry } = plannedGroupClip
              const nextClip = targetLaneEntry.laneType === 'variable'
                ? createVariableTrackClip({
                    duration: groupClip.duration,
                    formula: groupClip.formula ?? null,
                    groupId: nextGroupId,
                    start
                  })
                : targetLaneEntry.laneType === 'valueTracker'
                  ? createValueTrackerClip({
                      duration: groupClip.duration,
                      groupId: nextGroupId,
                      start,
                      stepSubdivision: groupClip.stepSubdivision,
                      values: groupClip.values
                    })
                  : createTrackClip({
                      duration: groupClip.duration,
                      ...createClipFormulaFields(groupClip),
                      groupId: nextGroupId,
                      start
                    })

              targetLaneEntry.lane.clips.push(nextClip)
              pastedClipIds.push(nextClip.id)
              groupPastedClipIds.push(nextClip.id)
              touchedLaneEntries.push(targetLaneEntry)

              if (pastedAnchorTrackId === null) {
                pastedAnchorTrackId = targetLaneEntry.laneType === 'track' ? targetLaneEntry.lane.id : null
              }
            }

            this.groups.push({
              id: nextGroupId,
              name: generateGroupName(this.groups),
              start: plannedGroup.groupStart,
              trackIndex: plannedGroup.baseTrackIndex,
              duration: 1,
              clips: groupPastedClipIds.map((clipId) => ({
                clipId,
                timeOffset: 0,
                trackOffset: 0
              }))
            })
            this.recalculateGroupBounds(nextGroupId)
          }

          for (const plannedLooseClip of plannedLooseClips) {
            const { clipboardClip, start, targetEntry } = plannedLooseClip
            const nextClip = targetEntry.laneType === 'variable'
              ? createVariableTrackClip({
                  duration: clipboardClip.duration,
                  formula: clipboardClip.formula ?? null,
                  start
                })
              : targetEntry.laneType === 'valueTracker'
                ? createValueTrackerClip({
                    duration: clipboardClip.duration,
                    start,
                    stepSubdivision: clipboardClip.stepSubdivision,
                    values: clipboardClip.values
                  })
                : createTrackClip({
                    duration: clipboardClip.duration,
                    ...createClipFormulaFields(clipboardClip),
                    start
                  })

            targetEntry.lane.clips.push(nextClip)
            pastedClipIds.push(nextClip.id)
            touchedLaneEntries.push(targetEntry)

            if (pastedAnchorTrackId === null) {
              pastedAnchorTrackId = targetEntry.laneType === 'track' ? targetEntry.lane.id : null
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
          return pastedClipIds
        }

        const sourceTrackLaneIds = getClipboardSourceLaneIdSet(clipboard, 'track')
        const sourceVariableLaneIds = getClipboardSourceLaneIdSet(clipboard, 'variable')
        const sourceValueTrackerLaneIds = getClipboardSourceLaneIdSet(clipboard, 'valueTracker')

        const overrideEnabledByType = {
          track: sourceTrackLaneIds.size <= 1,
          variable: sourceVariableLaneIds.size <= 1,
          valueTracker: sourceValueTrackerLaneIds.size <= 1
        }

        const overrideTarget = {
          laneId: target?.laneId ?? null,
          laneType: target?.laneType ?? null
        }
        const pastePlacementLaneByKey = new Map()
        const plannedClips = []

        for (const clipboardClip of clipboard.clips) {
          const clipLaneType = clipboardClip?.sourceLaneType === 'variable'
            ? 'variable'
            : clipboardClip?.sourceLaneType === 'valueTracker'
              ? 'valueTracker'
              : 'track'

          const scopedOverrideTarget = overrideEnabledByType[clipLaneType] ? overrideTarget : null
          const targetEntry = resolvePasteTargetLane(this, clipboardClip, scopedOverrideTarget)

          if (!targetEntry.lane) {
            continue
          }

          const desiredStart = pasteAnchorStart + clipboardClip.startOffset
          const placementPlan = planPasteClipPlacement(
            pastePlacementLaneByKey,
            targetEntry,
            desiredStart,
            clipboardClip.duration
          )

          if (!placementPlan.ok) {
            notifyPasteBlocked(placementPlan)
            return []
          }

          plannedClips.push({
            clipboardClip,
            start: placementPlan.start,
            targetEntry
          })
        }

        for (const plannedClip of plannedClips) {
          const { clipboardClip, start, targetEntry } = plannedClip
          const nextClip = targetEntry.laneType === 'variable'
            ? createVariableTrackClip({
                duration: clipboardClip.duration,
                formula: clipboardClip.formula ?? null,
                start
              })
            : targetEntry.laneType === 'valueTracker'
              ? createValueTrackerClip({
                  duration: clipboardClip.duration,
                  start,
                  stepSubdivision: clipboardClip.stepSubdivision,
                  values: clipboardClip.values
                })
              : createTrackClip({
                  duration: clipboardClip.duration,
                  ...createClipFormulaFields(clipboardClip),
                  start
                })

          targetEntry.lane.clips.push(nextClip)
          pastedClipIds.push(nextClip.id)
          touchedLaneEntries.push(targetEntry)

          if (pastedAnchorTrackId === null) {
            pastedAnchorTrackId = targetEntry.laneType === 'track' ? targetEntry.lane.id : null
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
        return pastedClipIds
      })
    },

    pasteClipboardAtPlayhead(target = null) {
      return this.pasteClipboardAtTick(this.time, target)
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

    addTrack(beforeTrackId = null, afterTrackId = null) {
      return this.recordHistoryStep('add-track', () => {
        const nextTrack = createTrack()

        if (afterTrackId) {
          const afterIndex = findTrackIndex(this.tracks, afterTrackId)

          if (afterIndex !== -1) {
            this.tracks.splice(afterIndex + 1, 0, nextTrack)
            this.recalculateAllGroupBounds()
            return nextTrack.id
          }
        }

        if (!beforeTrackId) {
          this.tracks.push(nextTrack)
          this.recalculateAllGroupBounds()
          return nextTrack.id
        }

        const insertIndex = findTrackIndex(this.tracks, beforeTrackId)

        if (insertIndex === -1) {
          this.tracks.push(nextTrack)
          this.recalculateAllGroupBounds()
          return nextTrack.id
        }

        this.tracks.splice(insertIndex, 0, nextTrack)
        this.recalculateAllGroupBounds()
        return nextTrack.id
      })
    },

    addVariableTrack() {
      return this.recordHistoryStep('add-variable-track', () => {
        const nextVariableTrack = createVariableTrack({
          name: getNextAvailableVariableTrackName(this.variableTracks, this.valueTrackerTracks)
        })

        this.variableTracks.push(nextVariableTrack)
        this.recalculateAllGroupBounds()
        return nextVariableTrack.name
      })
    },

    addValueTrackerTrack() {
      return this.recordHistoryStep('add-value-tracker-track', () => {
        const nextVariableName = getNextAvailableVariableTrackName(
          this.variableTracks,
          this.valueTrackerTracks
        )
        const nextValueTrackerTrack = createValueTrackerTrack({
          variableName: nextVariableName
        })

        this.valueTrackerTracks.push(nextValueTrackerTrack)
        this.recalculateAllGroupBounds()
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
          variableName: variableTrackName
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
        const touchedGroupIds = syncGroupsAfterClipRemoval(this, [...removedClipIds])

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        this.recalculateAllGroupBounds()

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
        const touchedGroupIds = syncGroupsAfterClipRemoval(this, [...removedClipIds])

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        this.recalculateAllGroupBounds()

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
        this.recalculateAllGroupBounds()
        this.clearClipSelection()
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
        const touchedGroupIds = syncGroupsAfterClipRemoval(this, [...removedClipIds])

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        this.recalculateAllGroupBounds()
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
        this.recalculateAllGroupBounds()
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

      const groupAssignment = getNewClipGroupAssignment(this, 'track', trackId)

      if (!groupAssignment.allowed) {
        notifyNewClipGroupLaneMismatch()
        return null
      }

      const nextClip = createTrackClip({
        ...clip,
        formula: clip.formula ?? null,
        groupId: groupAssignment.groupId
      })
      nextClip.start = clampClipPlacementStart(track, nextClip.start, nextClip.duration)

      track.clips.push(nextClip)
      sortTrackClips(track)
      if (groupAssignment.groupId) {
        this.recalculateGroupBounds(groupAssignment.groupId)
      }
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = trackId

      return nextClip.id
    },

    addClipFromLibraryFormula(trackId, libraryItem, startTick) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return null
      }

      const groupAssignment = getNewClipGroupAssignment(this, 'track', trackId)

      if (!groupAssignment.allowed) {
        notifyNewClipGroupLaneMismatch()
        return null
      }

      const nextClip = createTrackClip({
        start: startTick,
        duration: libraryItem.duration ?? DEFAULT_FORMULA_DROP_DURATION,
        formula: libraryItem.formulaStereo ? null : (libraryItem.formula ?? null),
        formulaStereo: libraryItem.formulaStereo ?? false,
        leftFormula: libraryItem.leftFormula ?? null,
        rightFormula: libraryItem.rightFormula ?? null,
        formulaId: libraryItem.id,
        formulaName: libraryItem.name,
        groupId: groupAssignment.groupId
      })
      nextClip.start = clampClipPlacementStart(track, nextClip.start, nextClip.duration)

      track.clips.push(nextClip)
      sortTrackClips(track)
      if (groupAssignment.groupId) {
        this.recalculateGroupBounds(groupAssignment.groupId)
      }
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = trackId

      return nextClip.id
    },

    addVariableClip(variableTrackName, clip) {
      const variableTrack = findVariableTrack(this.variableTracks, variableTrackName)

      if (!variableTrack) {
        return null
      }

      const groupAssignment = getNewClipGroupAssignment(this, 'variable', variableTrackName)

      if (!groupAssignment.allowed) {
        notifyNewClipGroupLaneMismatch()
        return null
      }

      const nextClip = createVariableTrackClip({
        ...clip,
        formula: clip.formula ?? undefined,
        groupId: groupAssignment.groupId
      })
      nextClip.start = clampClipPlacementStart(variableTrack, nextClip.start, nextClip.duration)

      variableTrack.clips.push(nextClip)
      sortVariableTrackClips(variableTrack)
      if (groupAssignment.groupId) {
        this.recalculateGroupBounds(groupAssignment.groupId)
      }
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = null
      return nextClip.id
    },

    addValueTrackerClip(valueTrackerTrackId, clip) {
      const valueTrackerTrack = findValueTrackerTrack(this.valueTrackerTracks, valueTrackerTrackId)

      if (!valueTrackerTrack) {
        return null
      }

      const groupAssignment = getNewClipGroupAssignment(this, 'valueTracker', valueTrackerTrackId)

      if (!groupAssignment.allowed) {
        notifyNewClipGroupLaneMismatch()
        return null
      }

      const nextClip = createValueTrackerClip({
        ...clip,
        groupId: groupAssignment.groupId,
        values: clip.values ?? createEmptyValueTrackerValues(clip.duration, clip.stepSubdivision)
      })
      nextClip.start = clampClipPlacementStart(valueTrackerTrack, nextClip.start, nextClip.duration)

      valueTrackerTrack.clips.push(nextClip)
      sortValueTrackerTrackClips(valueTrackerTrack)
      if (groupAssignment.groupId) {
        this.recalculateGroupBounds(groupAssignment.groupId)
      }
      this.setSelectedClips([nextClip.id])
      this.selectedTrackId = null
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

      if (hasClipFormulaUpdates(updates)) {
        this.clearFormulaAnalysisCache()
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

      if (Object.hasOwn(updates ?? {}, 'formula')) {
        this.clearFormulaAnalysisCache()
      }
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
        this.clearFormulaAnalysisCache()
        return
      }

      Object.assign(clip, getClipFormulaFieldsFromDraft(draft))
      this.clearFormulaAnalysisCache()
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
        this.clearFormulaAnalysisCache()
        return
      }

      Object.assign(clip, getClipFormulaFieldsFromDraft(draft))
      clip.formulaName = draft.name
      this.clearFormulaAnalysisCache()
    },

    saveValueTrackerClipDraft(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

      if (!result || result.laneType !== 'valueTracker' || !result.clip) {
        return
      }

      result.clip.values = normalizeValueTrackerValues(
        draft?.values,
        result.clip.duration,
        result.clip.stepSubdivision
      )
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipStart(track, clipId, snappedStart)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipStart(variableTrack, clipId, snappedStart)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipStart(valueTrackerTrack, clipId, snappedStart)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      const desiredDelta = snappedStart - anchorEntry.clip.start
      const clipIdsByLaneKey = new Map()

      for (const entry of selectedClipEntries) {
        const laneKey = getLaneKey(entry.laneType, entry.laneId)
        const existingClipIds = clipIdsByLaneKey.get(laneKey) ?? {
          clipIds: [],
          lane: entry.lane,
          laneType: entry.laneType
        }
        existingClipIds.clipIds.push(entry.clipId)
        clipIdsByLaneKey.set(laneKey, existingClipIds)
      }

      const clampedDelta = getClampedMoveDeltaForLaneSelections(
        [...clipIdsByLaneKey.values()],
        desiredDelta
      )
      const touchedLaneEntries = new Map()
      const touchedGroupIds = new Set()

      for (const entry of selectedClipEntries) {
        entry.clip.start += clampedDelta
        touchedLaneEntries.set(getLaneKey(entry.laneType, entry.laneId), entry)

        if (entry.clip.groupId) {
          touchedGroupIds.add(entry.clip.groupId)
        }
      }

      for (const touchedLaneEntry of touchedLaneEntries.values()) {
        sortLaneClips(touchedLaneEntry)
      }

      this.selectedTrackId = anchorEntry.laneType === 'track' ? anchorEntry.laneId : null

      for (const groupId of touchedGroupIds) {
        this.recalculateGroupBounds(groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipPlacementStart(track, snappedStart, clip.duration, clipId)
      sortTrackClips(track)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipPlacementStart(variableTrack, snappedStart, clip.duration, clipId)
      sortVariableTrackClips(variableTrack)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      clip.start = clampClipPlacementStart(valueTrackerTrack, snappedStart, clip.duration, clipId)
      sortValueTrackerTrackClips(valueTrackerTrack)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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
      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      const clampedStart = clampClipPlacementStart(targetTrack, snappedStart, clip.duration)

      clip.start = clampedStart
      targetTrack.clips.push(clip)
      sortTrackClips(targetTrack)
      this.selectedTrackId = targetTrackId

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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
      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      const clampedStart = clampClipPlacementStart(targetValueTrackerTrack, snappedStart, clip.duration)

      clip.start = clampedStart
      targetValueTrackerTrack.clips.push(clip)
      sortValueTrackerTrackClips(targetValueTrackerTrack)

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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
      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      const clampedStart = clampClipResizeStart(track, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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
      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
      const clampedStart = clampClipResizeStart(variableTrack, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const previousStart = clip.start
      const previousDuration = clip.duration
      const clipEnd = getClipEnd(clip)
      const snappedStart = getDraggedTick(nextStart, shouldSnap, this.snapSubdivision)
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

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedEnd = getDraggedTick(nextEnd, shouldSnap, this.snapSubdivision)
      const clampedEnd = clampClipResizeEnd(track, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const snappedEnd = getDraggedTick(nextEnd, shouldSnap, this.snapSubdivision)
      const clampedEnd = clampClipResizeEnd(variableTrack, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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

      const previousDuration = clip.duration
      const snappedEnd = getDraggedTick(nextEnd, shouldSnap, this.snapSubdivision)
      const clampedEnd = clampClipResizeEnd(valueTrackerTrack, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start
      clip.values = resizeValueTrackerValues(clip.values, {
        nextDuration: clip.duration,
        nextStart: clip.start,
        previousDuration,
        previousStart: clip.start,
        stepSubdivision: clip.stepSubdivision
      })

      if (clip.groupId) {
        this.recalculateGroupBounds(clip.groupId)
      }
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
      }

      return duplicatedClipIds
    },

    splitClip(clipId, splitTime) {
      return this.recordHistoryStep('split-clip', () => {
        const laneEntry = findTimelineClip(
          this.tracks,
          this.variableTracks,
          this.valueTrackerTracks,
          clipId
        )

        if (!laneEntry?.clip || !laneEntry?.lane) {
          return null
        }

        const splitResult = laneEntry.laneType === 'valueTracker'
          ? splitValueTrackerClip(laneEntry.clip, splitTime)
          : splitTimelineClip(laneEntry.clip, splitTime)

        if (!splitResult) {
          return null
        }

        return applyClipSplitResult(this, laneEntry, splitResult)
      })
    },

    removeClip(clipId) {
      return this.recordHistoryStep('remove-clip', () => {
        const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

        if (!result) {
          return
        }

        const removedGroupId = result.clip.groupId

        result.lane.clips.splice(result.clipIndex, 1)
        const touchedGroupIds = syncGroupsAfterClipRemoval(this, [clipId])

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        if (removedGroupId) {
          this.recalculateGroupBounds(removedGroupId)
        }
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

        const touchedGroupIds = new Set()

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

          if (result.clip?.groupId) {
            touchedGroupIds.add(result.clip.groupId)
          }

          result.lane.clips.splice(result.clipIndex, 1)
        }

        for (const groupId of syncGroupsAfterClipRemoval(this, selectedClipIds)) {
          touchedGroupIds.add(groupId)
        }

        for (const groupId of touchedGroupIds) {
          this.recalculateGroupBounds(groupId)
        }

        if (selectedClipIds.includes(this.editingClipId)) {
          this.editingClipId = null
        }

        this.clearClipSelection()
      })
    },

    setEditingClip(clipId) {
      if (clipId && this.editingGroupId) {
        const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

        if (result?.clip?.groupId !== this.editingGroupId) {
          return
        }
      }

      this.editingClipId = clipId
    },

    handleTimelineClipDoubleClick(clipId) {
      if (!clipId) {
        return false
      }

      const result = findTimelineClip(this.tracks, this.variableTracks, this.valueTrackerTracks, clipId)

      if (!result?.clip) {
        return false
      }

      if (result.clip.groupId && this.editingGroupId !== result.clip.groupId) {
        return this.enterGroupEdit(result.clip.groupId)
      }

      this.setEditingClip(clipId)
      return true
    },

    selectClip(clipId) {
      this.setSelectedClips(clipId ? [clipId] : [])
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
