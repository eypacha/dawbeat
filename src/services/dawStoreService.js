import { DEFAULT_TRACK_COLOR } from '@/utils/colorUtils'
import { DEFAULT_TRACK_UNION_OPERATOR } from '@/services/trackUnionOperatorService'
import { DEFAULT_VARIABLE_CLIP_FORMULA, normalizeVariableTrackName } from '@/services/variableTrackService'
import {
  createDefaultValueRollBinding,
  getValueRollBoundVariableName,
  normalizeValueRollStepSubdivision,
  normalizeValueRollTrackName,
  normalizeValueRollValues
} from '@/services/valueRollService'

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

export function createValueRollTrack(valueRollTrack = {}) {
  return {
    id: valueRollTrack.id ?? createTrackId(),
    name: normalizeValueRollTrackName(valueRollTrack.name),
    binding: createDefaultValueRollBinding(valueRollTrack.binding),
    clips: Array.isArray(valueRollTrack.clips) ? [...valueRollTrack.clips] : []
  }
}

export function sortTrackClips(track) {
  track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

export function sortVariableTrackClips(variableTrack) {
  sortTrackClips(variableTrack)
}

export function sortValueRollTrackClips(valueRollTrack) {
  sortTrackClips(valueRollTrack)
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

export function findValueRollTrack(valueRollTracks, valueRollTrackId) {
  return valueRollTracks.find((valueRollTrack) => valueRollTrack.id === valueRollTrackId) ?? null
}

export function findValueRollTrackIndex(valueRollTracks, valueRollTrackId) {
  return valueRollTracks.findIndex((valueRollTrack) => valueRollTrack.id === valueRollTrackId)
}

export function findValueRollTrackByVariableName(valueRollTracks, variableName) {
  return valueRollTracks.find(
    (valueRollTrack) => getValueRollBoundVariableName(valueRollTrack) === variableName
  ) ?? null
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

export function findValueRollTrackWithClip(valueRollTracks, clipId) {
  for (const valueRollTrack of valueRollTracks) {
    const clipIndex = findClipIndex(valueRollTrack, clipId)

    if (clipIndex !== -1) {
      return {
        clipIndex,
        track: valueRollTrack
      }
    }
  }

  return null
}

export function findTimelineClip(tracks, variableTracks, valueRollTracksOrClipId, maybeClipId) {
  const hasExplicitValueRollTracks = Array.isArray(valueRollTracksOrClipId)
  const valueRollTracks = hasExplicitValueRollTracks ? valueRollTracksOrClipId : []
  const clipId = hasExplicitValueRollTracks ? maybeClipId : valueRollTracksOrClipId
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
    const valueRollTrackResult = findValueRollTrackWithClip(valueRollTracks, clipId)

    if (!valueRollTrackResult) {
      return null
    }

    return {
      clip: valueRollTrackResult.track.clips[valueRollTrackResult.clipIndex] ?? null,
      clipIndex: valueRollTrackResult.clipIndex,
      lane: valueRollTrackResult.track,
      laneId: valueRollTrackResult.track.id,
      laneType: 'valueRoll'
    }
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

export function createValueRollClip(clip = {}) {
  const duration = Number.isFinite(Number(clip.duration)) ? Number(clip.duration) : 4
  const stepSubdivision = normalizeValueRollStepSubdivision(clip.stepSubdivision)

  return {
    id: clip.id ?? createClipId(),
    start: Number.isFinite(Number(clip.start)) ? Number(clip.start) : 0,
    duration,
    stepSubdivision,
    values: normalizeValueRollValues(
      clip.values,
      duration,
      stepSubdivision
    )
  }
}

export function createDuplicateClip(sourceClip) {
  return {
    ...sourceClip,
    values: Array.isArray(sourceClip?.values) ? [...sourceClip.values] : sourceClip?.values,
    id: createClipId()
  }
}
