import { defineStore } from 'pinia'
import { clampClipResizeEnd, clampClipResizeStart, clampClipStart } from '@/services/timelineService'
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

const MIN_LOOP_DURATION = 1 / TIMELINE_SNAP_SUBDIVISIONS

function createClipId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getNextTrackNumber(tracks) {
  return (
    tracks.reduce((largestTrackNumber, track) => {
      const match = track.id.match(/^track(\d+)$/)
      const trackNumber = match ? Number.parseInt(match[1], 10) : 0

      return Math.max(largestTrackNumber, trackNumber)
    }, 0) + 1
  )
}

export const useDawStore = defineStore('dawStore', {
  state: () => ({
    audioReady: false,
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
        id: 'track1',
        name: 'Track 1',
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
        id: 'track2',
        name: 'Track 2',
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

    addTrack() {
      const nextTrackNumber = getNextTrackNumber(this.tracks)

      this.tracks.push({
        id: `track${nextTrackNumber}`,
        name: `Track ${nextTrackNumber}`,
        clips: []
      })
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
