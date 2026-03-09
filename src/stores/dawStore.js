import { defineStore } from 'pinia'
import {
  clampClipPlacementStart,
  clampClipResizeEnd,
  clampClipResizeStart,
  clampClipStart
} from '@/services/timelineService'
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
import { DEFAULT_TRACK_COLOR, TRACK_COLOR_PALETTE, getTrackColor } from '@/utils/colorUtils'

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

function createClipId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createTrackId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createTrack() {
  return {
    id: createTrackId(),
    color: DEFAULT_TRACK_COLOR,
    muted: false,
    name: undefined,
    clips: []
  }
}

export const useDawStore = defineStore('dawStore', {
  state: () => ({
    audioReady: false,
    clipDragPreview: null,
    editingClipId: null,
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
            start: 0,
            duration: 4
          },
          {
            id: 'clip1',
            formula: 't & 32 | t >> 4',
            start: 4,
            duration: 4
          },
          {
            id: 'clip2',
            formula: 't>>4',
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
            start: 8,
            duration: 20
          }
        ]
      }
    ],
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

    addTrack(beforeTrackId = null) {
      const nextTrack = createTrack()

      if (!beforeTrackId) {
        this.tracks.push(nextTrack)
        return
      }

      const insertIndex = this.tracks.findIndex((track) => track.id === beforeTrackId)

      if (insertIndex === -1) {
        this.tracks.push(nextTrack)
        return
      }

      this.tracks.splice(insertIndex, 0, nextTrack)
    },

    removeTrack(trackId) {
      const trackIndex = this.tracks.findIndex((track) => track.id === trackId)

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
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const normalizedName = typeof nextName === 'string' ? nextName.trim() : ''
      track.name = normalizedName || undefined
    },

    setTrackColor(trackId, color) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track || !TRACK_COLOR_PALETTE.includes(color)) {
        return
      }

      track.color = getTrackColor(color)
    },

    toggleTrackMuted(trackId) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      track.muted = !track.muted
    },

    addClip(trackId, clip) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      track.clips.push({
        id: clip.id ?? createClipId(),
        formula: clip.formula ?? 't',
        ...clip
      })

      track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
    },

    updateClip(trackId, clipId, updates) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const clip = track.clips.find((entry) => entry.id === clipId)

      if (!clip) {
        return
      }

      Object.assign(clip, updates)
    },

    moveClip(trackId, clipId, nextStart) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const clip = track.clips.find((entry) => entry.id === clipId)

      if (!clip) {
        return
      }

      const snappedStart = snapTicks(Math.max(0, nextStart))
      clip.start = clampClipStart(track, clipId, snappedStart)
    },

    placeClip(trackId, clipId, nextStart) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const clip = track.clips.find((entry) => entry.id === clipId)

      if (!clip) {
        return
      }

      const snappedStart = snapTicks(Math.max(0, nextStart))
      clip.start = clampClipPlacementStart(track, snappedStart, clip.duration, clipId)
      track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
    },

    moveClipToTrack(sourceTrackId, targetTrackId, clipId, nextStart) {
      const sourceTrack = this.tracks.find((entry) => entry.id === sourceTrackId)
      const targetTrack = this.tracks.find((entry) => entry.id === targetTrackId)

      if (!sourceTrack || !targetTrack) {
        return
      }

      const clipIndex = sourceTrack.clips.findIndex((entry) => entry.id === clipId)

      if (clipIndex === -1) {
        return
      }

      if (sourceTrackId === targetTrackId) {
        this.moveClip(sourceTrackId, clipId, nextStart)
        this.selectedTrackId = targetTrackId
        return
      }

      const [clip] = sourceTrack.clips.splice(clipIndex, 1)
      const snappedStart = snapTicks(Math.max(0, nextStart))
      const clampedStart = clampClipPlacementStart(targetTrack, snappedStart, clip.duration)

      clip.start = clampedStart
      targetTrack.clips.push(clip)
      targetTrack.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
      this.selectedTrackId = targetTrackId
    },

    resizeClipStart(trackId, clipId, nextStart) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const clip = track.clips.find((entry) => entry.id === clipId)

      if (!clip) {
        return
      }

      const clipEnd = getClipEnd(clip)
      const snappedStart = snapTicks(Math.max(0, nextStart))
      const clampedStart = clampClipResizeStart(track, clipId, snappedStart)

      clip.start = clampedStart
      clip.duration = clipEnd - clampedStart
    },

    resizeClipEnd(trackId, clipId, nextEnd) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      const clip = track.clips.find((entry) => entry.id === clipId)

      if (!clip) {
        return
      }

      const snappedEnd = snapTicks(Math.max(0, nextEnd))
      const clampedEnd = clampClipResizeEnd(track, clipId, snappedEnd)

      clip.duration = clampedEnd - clip.start
    },

    duplicateClip(trackId, clipId) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return null
      }

      const sourceClip = track.clips.find((entry) => entry.id === clipId)

      if (!sourceClip) {
        return null
      }

      const duplicateClipId = createClipId()
      const duplicateClip = {
        ...sourceClip,
        id: duplicateClipId
      }

      track.clips.push(duplicateClip)
      track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
      this.selectedTrackId = trackId
      this.selectedClipId = duplicateClipId

      return duplicateClipId
    },

    removeClip(clipId) {
      for (const track of this.tracks) {
        const clipIndex = track.clips.findIndex((entry) => entry.id === clipId)

        if (clipIndex === -1) {
          continue
        }

        track.clips.splice(clipIndex, 1)
        this.editingClipId = null
        this.selectedClipId = null
        return
      }
    },

    setEditingClip(clipId) {
      this.editingClipId = clipId
    },

    selectClip(clipId) {
      this.selectedClipId = clipId
    },

    selectTrack(trackId) {
      this.selectedTrackId = trackId
    }
  }
})
