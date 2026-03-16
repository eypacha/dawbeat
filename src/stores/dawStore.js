import { defineStore } from 'pinia'
import {
  clampClipPlacementStart,
  getClipGroupMoveBounds,
  clampClipResizeEnd,
  clampClipResizeStart,
  clampClipStart
} from '@/services/timelineService'
import { getDraggedTick } from '@/services/snapService'
import {
  createDuplicateClip,
  createTrack,
  createTrackId,
  createTrackClip,
  createVariableTrack,
  createVariableTrackClip,
  findClip,
  findClipIndex,
  findTrack,
  findTrackIndex,
  findTimelineClip,
  findVariableTrack,
  findVariableTrackIndex,
  sortTrackClips,
  sortVariableTrackClips
} from '@/services/dawStoreService'
import {
  createAudioEffect,
  createBitCrusherAudioEffect,
  createDelayAudioEffect,
  createEqAudioEffect,
  normalizeDecibels,
  normalizeDelayTime,
  normalizeMasterGain,
  normalizeMixValue,
  normalizeUnitValue
} from '@/services/audioEffectService'
import { createEvalEffect, createStereoOffsetEvalEffect, mergeTReplacementParams } from '@/services/evalEffectService'
import { createFormula, getFormulaById } from '@/services/formulaService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import demoProject from '@/data/demo.json'
import { loadProject, normalizeProject, serializeProject } from '@/services/projectPersistence'
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
import { getNextVariableTrackName } from '@/services/variableTrackService'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS
const MAX_HISTORY_ENTRIES = 100

function createDefaultProject() {
  return normalizeProject(demoProject) ?? createEmptyProject()
}

function createEmptyProject() {
  return {
    audioEffects: [],
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
    tracks: [createTrack()],
    variableTracks: [],
    zoom: 1
  }
}

function createInitialState() {
  const defaultProject = createDefaultProject()
  const savedProject = loadProject()
  const project = savedProject ?? defaultProject

  return {
    audioReady: false,
    audioEffects: project.audioEffects,
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
    tracks: project.tracks,
    variableTracks: project.variableTracks,
    historyApplying: false,
    historyFuture: [],
    historyPast: [],
    historyRecording: false,
    historyTransaction: null,
    selectedClipIds: [],
    selectedFormulaId: null,
    selectedClipId: null,
    selectedTrackId: null
  }
}

function getSnapshotKey(snapshot) {
  return JSON.stringify(snapshot)
}

function clearTransientSelectionState(store) {
  store.clipDragPreview = null
  store.editingClipId = null
  store.editingFormulaId = null
  store.selectedFormulaId = null
  store.selectedTrackId = null
  syncSelectedClipState(store, [])
}

function applyProjectState(store, project, { preservePlaybackState = false } = {}) {
  const normalizedProject = normalizeProject(project)

  if (!normalizedProject) {
    return false
  }

  const nextPlaying = preservePlaybackState ? store.playing : false
  const nextTime = preservePlaybackState ? store.time : 0

  store.audioEffects = normalizedProject.audioEffects
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
  store.tracks = normalizedProject.tracks
  store.variableTracks = normalizedProject.variableTracks
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
  store.selectedClipIds = nextSelectedClipIds
  store.selectedClipId = nextSelectedClipIds[0] ?? null
}

function collectSelectedClipEntries(tracks, variableTracks, clipIds) {
  const selectedClipIds = normalizeSelectedClipIds(clipIds)
  const entries = []

  for (const clipId of selectedClipIds) {
    const result = findTimelineClip(tracks, variableTracks, clipId)

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

function getLaneOrderMap(tracks, variableTracks) {
  return new Map([
    ...variableTracks.map((variableTrack, index) => [`variable:${variableTrack.name}`, index]),
    ...tracks.map((track, index) => [`track:${track.id}`, variableTracks.length + index])
  ])
}

function sortClipEntriesForClipboard(tracks, variableTracks, clipEntries) {
  const laneOrderById = getLaneOrderMap(tracks, variableTracks)

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

function buildClipClipboard(entries, tracks, variableTracks, formulas) {
  if (!entries.length) {
    return null
  }

  const sortedEntries = sortClipEntriesForClipboard(tracks, variableTracks, entries)
  const anchorStart = sortedEntries[0]?.clip.start ?? 0
  const anchorTickStart = Math.floor(Math.max(0, anchorStart))

  return {
    anchorStart,
    anchorTickOffset: anchorStart - anchorTickStart,
    clips: sortedEntries.map((entry) => {
      const referencedFormula = entry.clip.formulaId
        ? getFormulaById(formulas, entry.clip.formulaId)
        : null

      return {
        duration: entry.clip.duration,
        formula: referencedFormula?.code ?? entry.clip.formula ?? null,
        formulaId: entry.laneType === 'track' ? referencedFormula?.id ?? null : null,
        formulaName:
          entry.laneType === 'track' ? referencedFormula?.name ?? entry.clip.formulaName ?? null : null,
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

function resolvePasteTargetLane(store, clipboardClip) {
  if (clipboardClip?.sourceLaneType === 'variable') {
    return {
      lane: resolvePasteTargetVariableTrack(store, clipboardClip.sourceLaneId),
      laneType: 'variable'
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

  sortTrackClips(entry.lane)
}

export const useDawStore = defineStore('dawStore', {
  state: createInitialState,

  getters: {
    canPasteClipsAtPlayhead: (state) =>
      Boolean(state.clipClipboard?.clips?.length && (state.tracks.length || state.variableTracks.length)),
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

    setSampleRate(value) {
      return this.recordHistoryStep('set-sample-rate', () => {
        this.sampleRate = normalizeSampleRate(value, this.sampleRate)
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
      })
    },

    reorderAudioEffect(effectId, targetEffectId) {
      return this.recordHistoryStep('reorder-audio-effect', () => {
        this.audioEffects = reorderEntries(this.audioEffects, effectId, targetEffectId)
      })
    },

    resetAudioEffect(effectId) {
      return this.recordHistoryStep('reset-audio-effect', () => {
        const effect = this.audioEffects.find((entry) => entry.id === effectId)

        if (!effect) {
          return
        }

        if (effect.type === 'delay') {
          const defaults = createDelayAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'eq') {
          const defaults = createEqAudioEffect({ id: effect.id })
          effect.enabled = defaults.enabled
          effect.params = defaults.params
          return
        }

        if (effect.type === 'bitcrusher') {
          const defaults = createBitCrusherAudioEffect({ id: effect.id })
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

      if (effect.type === 'delay') {
        if (typeof params.delayTime !== 'undefined') {
          effect.params.delayTime = normalizeDelayTime(params.delayTime)
        }

        if (typeof params.feedback !== 'undefined') {
          effect.params.feedback = normalizeMixValue(params.feedback)
        }

        if (typeof params.mix !== 'undefined') {
          effect.params.mix = normalizeMixValue(params.mix)
        }
        return
      }

      if (effect.type === 'eq') {
        if (typeof params.bass !== 'undefined') {
          effect.params.bass = normalizeDecibels(params.bass)
        }

        if (typeof params.mid !== 'undefined') {
          effect.params.mid = normalizeDecibels(params.mid)
        }

        if (typeof params.treble !== 'undefined') {
          effect.params.treble = normalizeDecibels(params.treble)
        }
        return
      }

      if (effect.type === 'bitcrusher' && typeof params.bits !== 'undefined') {
        effect.params.bits = normalizeUnitValue(params.bits)
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
      this.time = time
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
        this.selectedClipIds
      )
      const nextClipboard = buildClipClipboard(
        selectedClipEntries,
        this.tracks,
        this.variableTracks,
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

      const selectedClipEntries = collectSelectedClipEntries(this.tracks, this.variableTracks, [clipId])
      const nextClipboard = buildClipClipboard(
        selectedClipEntries,
        this.tracks,
        this.variableTracks,
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

        if (!clipboard?.clips?.length || (!this.tracks.length && !this.variableTracks.length)) {
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
            : createTrackClip({
                duration: clipboardClip.duration,
                formula: referencedFormula ? null : clipboardClip.formula ?? null,
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

    reorderEvalEffect(effectId, targetEffectId) {
      return this.recordHistoryStep('reorder-eval-effect', () => {
        this.evalEffects = reorderEntries(this.evalEffects, effectId, targetEffectId)
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
        const offset = Number(params.offset)
        effect.params.offset = Number.isFinite(offset) ? offset : 0
        return
      }

      if (effect.type === 'tReplacement') {
        effect.params = mergeTReplacementParams(effect.params, params)
      }
    },

    updateFormula(formulaId, updates) {
      const formula = getFormulaById(this.formulas, formulaId)

      if (!formula) {
        return
      }

      if (typeof updates.name === 'string') {
        formula.name = updates.name
      }

      if (typeof updates.code === 'string') {
        formula.code = updates.code
      }
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

            clip.formula = formula.code
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

    saveClipFormulaDraft(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, clipId)

      if (!result) {
        return
      }

      const clip = result.clip

      if (!clip) {
        return
      }

      if (result.laneType === 'variable') {
        clip.formula = draft.code
        return
      }

      if (clip.formulaId) {
        this.updateFormula(clip.formulaId, { code: draft.code })
      } else {
        clip.formula = draft.code
      }
    },

    saveClipFormulaDraftAndName(clipId, draft) {
      const result = findTimelineClip(this.tracks, this.variableTracks, clipId)

      if (!result) {
        return
      }

      const clip = result.clip

      if (!clip) {
        return
      }

      if (result.laneType === 'variable') {
        clip.formula = draft.code
        return
      }

      if (clip.formulaId) {
        this.updateFormula(clip.formulaId, {
          code: draft.code,
          name: draft.name
        })
      } else {
        clip.formula = draft.code
        clip.formulaName = draft.name
      }
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

    moveSelectedClips(anchorClipId, nextStart, shouldSnap = true) {
      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
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

    duplicateSelectedClips(anchorClipId) {
      const selectedClipEntries = collectSelectedClipEntries(
        this.tracks,
        this.variableTracks,
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
        ? collectSelectedClipEntries(this.tracks, this.variableTracks, [duplicatedAnchorClipId])[0]
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
          name: clip.formulaName ?? '',
          code: clip.formula ?? ''
        })

        clip.formulaId = formulaId
        clip.formula = null
        clip.formulaName = null
        return formulaId
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
        clip.formula = null
        clip.formulaName = null
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

        clip.formula = formula.code
        clip.formulaName = formula.name
        clip.formulaId = null
        this.setSelectedClips([clip.id])
        this.selectedTrackId = trackId
        this.selectedFormulaId = null
      })
    },

    removeClip(clipId) {
      return this.recordHistoryStep('remove-clip', () => {
        const result = findTimelineClip(this.tracks, this.variableTracks, clipId)

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
          const result = findTimelineClip(this.tracks, this.variableTracks, clipId)

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

    selectTrack(trackId) {
      this.selectedTrackId = trackId
    }
  }
})
