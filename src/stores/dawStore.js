import { defineStore } from 'pinia'
import { BASE_TICK_SIZE } from '@/utils/timeUtils'

export const useDawStore = defineStore('dawStore', {
  state: () => ({
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
            id: 'clip1',
            formula: 't>>4',
            start: 0,
            duration: 16
          },
          {
            id: 'clip2',
            formula: 't>>4|t>>5',
            start: 16,
            duration: 16
          },
          {
            id: 'clip2',
            formula: 't>>4',
            start: 32,
            duration: 16
          }
        ]
      },
      {
        id: 'track2',
        name: 'Track 2',
        clips: [
          {
            id: 'clip3',
            formula: 't*(t>>8)',
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

    selectClip(clipId) {
      this.selectedClipId = clipId
    },

    selectTrack(trackId) {
      this.selectedTrackId = trackId
    }
  }
})
