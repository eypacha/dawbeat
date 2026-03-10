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
  createTrackClip,
  findClip,
  findClipIndex,
  findTrack,
  findTrackIndex,
  findTrackWithClip,
  sortTrackClips
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
import { createEvalEffect, createStereoOffsetEvalEffect } from '@/services/evalEffectService'
import { createFormula, getFormulaById } from '@/services/formulaService'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import demoProject from '@/data/demo.json'
import { loadProject, normalizeProject } from '@/services/projectPersistence'
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
import { getTrackColor } from '@/utils/colorUtils'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

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
    tickSize: BASE_TICK_SIZE,
    tracks: [],
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
    tickSize: project.tickSize,
    tracks: project.tracks,
    selectedClipIds: [],
    selectedFormulaId: null,
    selectedClipId: null,
    selectedTrackId: null
  }
}

function reorderEntries(entries, draggedId, targetId) {
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
  nextEntries.splice(targetIndex, 0, draggedEntry)
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

function collectSelectedClipEntries(tracks, clipIds) {
  const selectedClipIds = normalizeSelectedClipIds(clipIds)
  const entries = []

  for (const clipId of selectedClipIds) {
    const result = findTrackWithClip(tracks, clipId)

    if (!result) {
      continue
    }

    const clip = result.track.clips[result.clipIndex]

    if (!clip) {
      continue
    }

    entries.push({
      clip,
      clipId,
      track: result.track,
      trackId: result.track.id
    })
  }

  return entries
}

export const useDawStore = defineStore('dawStore', {
  state: createInitialState,

  getters: {
    pixelsPerTick: (state) => BASE_PIXELS_PER_TICK * state.zoom
  },

  actions: {
    setAudioReady(ready) {
      this.audioReady = ready
    },

    setMasterGain(value) {
      this.masterGain = normalizeMasterGain(value)
    },

    setSampleRate(value) {
      this.sampleRate = normalizeSampleRate(value, this.sampleRate)
    },

    resetMasterGain() {
      this.masterGain = 1
    },

    addAudioEffect(effect) {
      const nextEffect = createAudioEffect(effect)
      this.audioEffects.push(nextEffect)
      return nextEffect.id
    },

    toggleAudioEffect(effectId) {
      const effect = this.audioEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      effect.enabled = !effect.enabled
    },

    toggleAudioEffectExpanded(effectId) {
      const effect = this.audioEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      effect.expanded = !effect.expanded
    },

    removeAudioEffect(effectId) {
      this.audioEffects = this.audioEffects.filter((entry) => entry.id !== effectId)
    },

    reorderAudioEffect(effectId, targetEffectId) {
      this.audioEffects = reorderEntries(this.audioEffects, effectId, targetEffectId)
    },

    resetAudioEffect(effectId) {
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
      this.audioEffects = project.audioEffects
      this.clipDragPreview = null
      this.evalEffects = project.evalEffects
      this.editingClipId = null
      this.editingFormulaId = null
      this.formulas = project.formulas
      this.loopEnabled = project.loopEnabled
      this.loopStart = project.loopStart
      this.loopEnd = project.loopEnd
      this.masterGain = project.masterGain
      this.playing = false
      this.time = 0
      this.zoom = project.zoom
      this.sampleRate = project.sampleRate
      this.tickSize = project.tickSize
      this.tracks = project.tracks
      this.selectedClipIds = []
      this.selectedFormulaId = null
      this.selectedClipId = null
      this.selectedTrackId = null
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

    addFormula(formula = {}) {
      const nextFormula = createFormula(formula)
      this.formulas.push(nextFormula)
      this.selectedFormulaId = nextFormula.id
      return nextFormula.id
    },

    addEvalEffect(effect) {
      const nextEffect = createEvalEffect(effect)
      this.evalEffects.push(nextEffect)
      return nextEffect.id
    },

    toggleEvalEffect(effectId) {
      const effect = this.evalEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      effect.enabled = !effect.enabled
    },

    toggleEvalEffectExpanded(effectId) {
      const effect = this.evalEffects.find((entry) => entry.id === effectId)

      if (!effect) {
        return
      }

      effect.expanded = !effect.expanded
    },

    removeEvalEffect(effectId) {
      this.evalEffects = this.evalEffects.filter((entry) => entry.id !== effectId)
    },

    reorderEvalEffect(effectId, targetEffectId) {
      this.evalEffects = reorderEntries(this.evalEffects, effectId, targetEffectId)
    },

    resetEvalEffect(effectId) {
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
        if (typeof params.stereo !== 'undefined') {
          effect.params.stereo = Boolean(params.stereo)
        }

        if (typeof params.expression === 'string') {
          effect.params.expression = params.expression
        }

        if (typeof params.leftExpression === 'string') {
          effect.params.leftExpression = params.leftExpression
        }

        if (typeof params.rightExpression === 'string') {
          effect.params.rightExpression = params.rightExpression
        }
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
    },

    addTrack(beforeTrackId = null) {
      const nextTrack = createTrack()

      if (!beforeTrackId) {
        this.tracks.push(nextTrack)
        return
      }

      const insertIndex = findTrackIndex(this.tracks, beforeTrackId)

      if (insertIndex === -1) {
        this.tracks.push(nextTrack)
        return
      }

      this.tracks.splice(insertIndex, 0, nextTrack)
    },

    removeTrack(trackId) {
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
    },

    renameTrack(trackId, nextName) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      const normalizedName = typeof nextName === 'string' ? nextName.trim() : ''
      track.name = normalizedName || undefined
    },

    setTrackColor(trackId, color) {
      const track = findTrack(this.tracks, trackId)

      if (!track || !TRACK_COLOR_PALETTE.includes(color)) {
        return
      }

      track.color = getTrackColor(color)
    },

    setTrackUnionOperator(trackId, unionOperator) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      track.unionOperator = normalizeTrackUnionOperator(unionOperator)
    },

    toggleTrackMuted(trackId) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      track.muted = !track.muted
    },

    toggleTrackSoloed(trackId) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      track.soloed = !track.soloed
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

    saveClipFormulaDraft(clipId, draft) {
      const result = findTrackWithClip(this.tracks, clipId)

      if (!result) {
        return
      }

      const clip = result.track.clips[result.clipIndex]

      if (!clip) {
        return
      }

      if (clip.formulaId) {
        this.updateFormula(clip.formulaId, { code: draft.code })
      } else {
        clip.formula = draft.code
      }
    },

    saveClipFormulaDraftAndName(clipId, draft) {
      const result = findTrackWithClip(this.tracks, clipId)

      if (!result) {
        return
      }

      const clip = result.track.clips[result.clipIndex]

      if (!clip) {
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

    moveSelectedClips(anchorClipId, nextStart, shouldSnap = true) {
      const selectedClipEntries = collectSelectedClipEntries(this.tracks, this.selectedClipIds)

      if (!selectedClipEntries.length) {
        return
      }

      const anchorEntry = selectedClipEntries.find((entry) => entry.clipId === anchorClipId)

      if (!anchorEntry) {
        return
      }

      const snappedStart = getDraggedTick(nextStart, shouldSnap)
      const desiredDelta = snappedStart - anchorEntry.clip.start
      const clipIdsByTrackId = new Map()

      for (const entry of selectedClipEntries) {
        const existingClipIds = clipIdsByTrackId.get(entry.trackId) ?? []
        existingClipIds.push(entry.clipId)
        clipIdsByTrackId.set(entry.trackId, existingClipIds)
      }

      let minDelta = Number.NEGATIVE_INFINITY
      let maxDelta = Number.POSITIVE_INFINITY

      for (const [trackId, clipIds] of clipIdsByTrackId) {
        const track = findTrack(this.tracks, trackId)

        if (!track) {
          continue
        }

        const bounds = getClipGroupMoveBounds(track, clipIds)
        minDelta = Math.max(minDelta, bounds.minDelta)
        maxDelta = Math.min(maxDelta, bounds.maxDelta)
      }

      const clampedDelta = Math.max(minDelta, Math.min(desiredDelta, maxDelta))
      const touchedTrackIds = new Set()

      for (const entry of selectedClipEntries) {
        entry.clip.start += clampedDelta
        touchedTrackIds.add(entry.trackId)
      }

      for (const trackId of touchedTrackIds) {
        const track = findTrack(this.tracks, trackId)

        if (track) {
          sortTrackClips(track)
        }
      }

      this.selectedTrackId = anchorEntry.trackId
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

    duplicateSelectedClips(anchorClipId) {
      const selectedClipEntries = collectSelectedClipEntries(this.tracks, this.selectedClipIds)

      if (!selectedClipEntries.length) {
        return []
      }

      const duplicatedClipIds = []
      const trackIdsToSort = new Set()
      const duplicatedClipIdBySourceId = new Map()

      for (const entry of selectedClipEntries) {
        const duplicateClip = createDuplicateClip(entry.clip)
        entry.track.clips.push(duplicateClip)
        duplicatedClipIds.push(duplicateClip.id)
        duplicatedClipIdBySourceId.set(entry.clipId, duplicateClip.id)
        trackIdsToSort.add(entry.trackId)
      }

      for (const trackId of trackIdsToSort) {
        const track = findTrack(this.tracks, trackId)

        if (track) {
          sortTrackClips(track)
        }
      }

      this.setSelectedClips(duplicatedClipIds)

      const duplicatedAnchorClipId = duplicatedClipIdBySourceId.get(anchorClipId) ?? duplicatedClipIds[0] ?? null
      const anchorEntry = duplicatedAnchorClipId
        ? collectSelectedClipEntries(this.tracks, [duplicatedAnchorClipId])[0]
        : null

      if (anchorEntry) {
        this.selectedTrackId = anchorEntry.trackId

        if (anchorEntry.clip.formulaId) {
          this.selectedFormulaId = anchorEntry.clip.formulaId
        }
      }

      return duplicatedClipIds
    },

    addClipFormulaToLibrary(trackId, clipId) {
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
        code: clip.formula ?? '',
      })

      clip.formulaId = formulaId
      clip.formula = null
      clip.formulaName = null
      return formulaId
    },

    assignFormulaToClip(trackId, clipId, formulaId) {
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
    },

    detachClipFormula(trackId, clipId) {
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
    },

    removeClip(clipId) {
      const result = findTrackWithClip(this.tracks, clipId)

      if (!result) {
        return
      }

      result.track.clips.splice(result.clipIndex, 1)
      this.editingClipId = null
      this.removeSelectedClip(clipId)
    },

    removeSelectedClips(clipIds = this.selectedClipIds) {
      const selectedClipIds = normalizeSelectedClipIds(clipIds)

      if (!selectedClipIds.length) {
        return
      }

      for (const clipId of selectedClipIds) {
        const result = findTrackWithClip(this.tracks, clipId)

        if (!result) {
          continue
        }

        result.track.clips.splice(result.clipIndex, 1)
      }

      if (selectedClipIds.includes(this.editingClipId)) {
        this.editingClipId = null
      }

      this.clearClipSelection()
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
