import { defineStore } from 'pinia'
import { clampClipStart } from '@/services/timelineService'
import { BASE_TICK_SIZE } from '@/utils/timeUtils'

export const useDawStore = defineStore('dawStore', {
  state: () => ({
    audioReady: false,
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

  actions: {
    setAudioReady(ready) {
      this.audioReady = ready
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

    addTrack() {
      const nextTrackNumber = this.tracks.length + 1

      this.tracks.push({
        id: `track${nextTrackNumber}`,
        name: `Track ${nextTrackNumber}`,
        clips: []
      })
    },

    addClip(trackId, clip) {
      const track = this.tracks.find((entry) => entry.id === trackId)

      if (!track) {
        return
      }

      track.clips.push(clip)
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

      clip.start = clampClipStart(track, clipId, Math.max(0, nextStart))
    },

    selectClip(clipId) {
      this.selectedClipId = clipId
    },

    selectTrack(trackId) {
      this.selectedTrackId = trackId
    }
  }
})
