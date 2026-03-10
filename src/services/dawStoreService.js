import { DEFAULT_TRACK_COLOR } from '@/utils/colorUtils'

export function createClipId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTrackId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTrack() {
  return {
    id: createTrackId(),
    color: DEFAULT_TRACK_COLOR,
    muted: false,
    soloed: false,
    name: undefined,
    clips: []
  }
}

export function sortTrackClips(track) {
  track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

export function findTrack(tracks, trackId) {
  return tracks.find((track) => track.id === trackId) ?? null
}

export function findTrackIndex(tracks, trackId) {
  return tracks.findIndex((track) => track.id === trackId)
}

export function findClip(track, clipId) {
  if (!track) {
    return null
  }

  return track.clips.find((clip) => clip.id === clipId) ?? null
}

export function findClipIndex(track, clipId) {
  if (!track) {
    return -1
  }

  return track.clips.findIndex((clip) => clip.id === clipId)
}

export function findTrackWithClip(tracks, clipId) {
  for (const track of tracks) {
    const clipIndex = findClipIndex(track, clipId)

    if (clipIndex !== -1) {
      return {
        clipIndex,
        track
      }
    }
  }

  return null
}

export function createTrackClip(clip) {
  return {
    id: clip.id ?? createClipId(),
    formula: clip.formula ?? null,
    formulaId: clip.formulaId ?? null,
    formulaName: clip.formulaName ?? null,
    ...clip
  }
}

export function createDuplicateClip(sourceClip) {
  return {
    ...sourceClip,
    id: createClipId()
  }
}
