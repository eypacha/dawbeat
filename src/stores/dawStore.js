import { defineStore } from 'pinia'
import {
  clampClipPlacementStart,
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
import { createFormula, getFormulaById } from '@/services/formulaService'
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
import { TRACK_COLOR_PALETTE, getTrackColor } from '@/utils/colorUtils'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

export const useDawStore = defineStore('dawStore', {
  state: () => ({
    audioReady: false,
    clipDragPreview: null,
    editingClipId: null,
    editingFormulaId: null,
    formulas: [],
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 16,
    playing: false,
    time: 0,
    zoom: 1,
    sampleRate: 8000,
    tickSize: BASE_TICK_SIZE,
    tracks: [
      {
        id: 'f2a8b8d6-6b53-4c4c-81df-5f6d9d85a101',
        color: TRACK_COLOR_PALETTE[0],
        muted: false,
        name: undefined,
        clips: [
          {
            id: 'clip0',
            formula: 't & 64 | t >> 4',
            formulaId: null,
            formulaName: null,
            start: 0,
            duration: 4
          },
          {
            id: 'clip1',
            formula: 't & 32 | t >> 4',
            formulaId: null,
            formulaName: null,
            start: 4,
            duration: 4
          },
          {
            id: 'clip2',
            formula: 't>>4',
            formulaId: null,
            formulaName: null,
            start: 8,
            duration: 4
          }
        ]
      },
      {
        id: '81e56bb6-5ca7-4e4e-a7f7-b43df392c202',
        color: TRACK_COLOR_PALETTE[1],
        muted: false,
        name: undefined,
        clips: [
          {
            id: 'clip3',
            formula: 't*(t>>8) & 64 % 128',
            formulaId: null,
            formulaName: null,
            start: 8,
            duration: 20
          }
        ]
      }
    ],
    selectedFormulaId: null,
    selectedClipId: null,
    selectedTrackId: null
  }),

  getters: {
    pixelsPerTick: (state) => BASE_PIXELS_PER_TICK * state.zoom
  },

  actions: {
    setAudioReady(ready) {
      this.audioReady = ready
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

    adjustZoom(delta) {
      this.setZoom(this.zoom + delta * -0.001)
    },

    setClipDragPreview(preview) {
      this.clipDragPreview = preview
    },

    clearClipDragPreview() {
      this.clipDragPreview = null
    },

    addFormula(formula = {}) {
      const nextFormula = createFormula(formula)
      this.formulas.push(nextFormula)
      this.selectedFormulaId = nextFormula.id
      return nextFormula.id
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

      if (removedTrack.clips.some((clip) => clip.id === this.selectedClipId)) {
        this.selectedClipId = null
      }

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

    toggleTrackMuted(trackId) {
      const track = findTrack(this.tracks, trackId)

      if (!track) {
        return
      }

      track.muted = !track.muted
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
      this.selectedClipId = nextClip.id
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
      this.selectedClipId = duplicateClipId

      if (duplicateClip.formulaId) {
        this.selectedFormulaId = duplicateClip.formulaId
      }

      return duplicateClipId
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
      this.selectedClipId = clip.id
      this.selectedTrackId = trackId
      this.selectedFormulaId = formula.id
    },

    removeClip(clipId) {
      const result = findTrackWithClip(this.tracks, clipId)

      if (!result) {
        return
      }

      result.track.clips.splice(result.clipIndex, 1)
      this.editingClipId = null
      this.selectedClipId = null
    },

    setEditingClip(clipId) {
      this.editingClipId = clipId
    },

    selectClip(clipId) {
      this.selectedClipId = clipId
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
