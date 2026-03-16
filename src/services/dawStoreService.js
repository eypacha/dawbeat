import { DEFAULT_TRACK_COLOR } from '@/utils/colorUtils'
import { DEFAULT_TRACK_UNION_OPERATOR } from '@/services/trackUnionOperatorService'
import { DEFAULT_VARIABLE_CLIP_FORMULA, normalizeVariableTrackName } from '@/services/variableTrackService'

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
    unionOperator: DEFAULT_TRACK_UNION_OPERATOR,
    name: undefined,
    clips: []
  }
}

export function createVariableTrack(variableTrack = {}) {
  return {
    name: normalizeVariableTrackName(variableTrack.name),
    clips: Array.isArray(variableTrack.clips) ? [...variableTrack.clips] : []
  }
}

export function sortTrackClips(track) {
  track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

export function sortVariableTrackClips(variableTrack) {
  sortTrackClips(variableTrack)
}

export function findTrack(tracks, trackId) {
  return tracks.find((track) => track.id === trackId) ?? null
}

export function findTrackIndex(tracks, trackId) {
  return tracks.findIndex((track) => track.id === trackId)
}

export function findVariableTrack(variableTracks, variableTrackName) {
  return variableTracks.find((variableTrack) => variableTrack.name === variableTrackName) ?? null
}

export function findVariableTrackIndex(variableTracks, variableTrackName) {
  return variableTracks.findIndex((variableTrack) => variableTrack.name === variableTrackName)
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

export function findVariableTrackWithClip(variableTracks, clipId) {
  for (const variableTrack of variableTracks) {
    const clipIndex = findClipIndex(variableTrack, clipId)

    if (clipIndex !== -1) {
      return {
        clipIndex,
        track: variableTrack
      }
    }
  }

  return null
}

export function findTimelineClip(tracks, variableTracks, clipId) {
  const trackResult = findTrackWithClip(tracks, clipId)

  if (trackResult) {
    return {
      clip: trackResult.track.clips[trackResult.clipIndex] ?? null,
      clipIndex: trackResult.clipIndex,
      lane: trackResult.track,
      laneId: trackResult.track.id,
      laneType: 'track'
    }
  }

  const variableTrackResult = findVariableTrackWithClip(variableTracks, clipId)

  if (!variableTrackResult) {
    return null
  }

  return {
    clip: variableTrackResult.track.clips[variableTrackResult.clipIndex] ?? null,
    clipIndex: variableTrackResult.clipIndex,
    lane: variableTrackResult.track,
    laneId: variableTrackResult.track.name,
    laneType: 'variable'
  }
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

export function createVariableTrackClip(clip = {}) {
  return createTrackClip({
    ...clip,
    formula: typeof clip.formula === 'string' ? clip.formula : DEFAULT_VARIABLE_CLIP_FORMULA,
    formulaId: null,
    formulaName: null
  })
}

export function createDuplicateClip(sourceClip) {
  return {
    ...sourceClip,
    id: createClipId()
  }
}
