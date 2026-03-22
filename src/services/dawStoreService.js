import { DEFAULT_TRACK_COLOR } from '@/utils/colorUtils'
import { DEFAULT_TRACK_UNION_OPERATOR } from '@/services/trackUnionOperatorService'
import {
  normalizeTrackLaneHeight,
  normalizeValueTrackerTrackHeight,
  normalizeVariableTrackHeight
} from '@/services/timelineLaneLayoutService'
import { DEFAULT_VARIABLE_CLIP_FORMULA, normalizeVariableTrackName } from '@/services/variableTrackService'
import {
  createDefaultValueTrackerBinding,
  getValueTrackerBoundVariableName,
  normalizeValueTrackerStepSubdivision,
  normalizeValueTrackerTrackName,
  normalizeValueTrackerValues
} from '@/services/valueTrackerService'

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

export function createTrack(track = {}) {
  return {
    id: track.id ?? createTrackId(),
    color: DEFAULT_TRACK_COLOR,
    muted: false,
    soloed: false,
    unionOperator: DEFAULT_TRACK_UNION_OPERATOR,
    name: typeof track.name === 'string' && track.name.trim() ? track.name.trim() : undefined,
    height: normalizeTrackLaneHeight(track.height),
    clips: Array.isArray(track.clips) ? [...track.clips] : []
  }
}

export function createVariableTrack(variableTrack = {}) {
  return {
    name: normalizeVariableTrackName(variableTrack.name),
    height: normalizeVariableTrackHeight(variableTrack.height),
    clips: Array.isArray(variableTrack.clips) ? [...variableTrack.clips] : []
  }
}

export function createValueTrackerTrack(valueTrackerTrack = {}) {
  return {
    id: valueTrackerTrack.id ?? createTrackId(),
    name: normalizeValueTrackerTrackName(valueTrackerTrack.name),
    binding: createDefaultValueTrackerBinding(valueTrackerTrack.binding),
    height: normalizeValueTrackerTrackHeight(valueTrackerTrack.height),
    clips: Array.isArray(valueTrackerTrack.clips) ? [...valueTrackerTrack.clips] : []
  }
}

export function sortTrackClips(track) {
  track.clips.sort((leftClip, rightClip) => leftClip.start - rightClip.start)
}

export function sortVariableTrackClips(variableTrack) {
  sortTrackClips(variableTrack)
}

export function sortValueTrackerTrackClips(valueTrackerTrack) {
  sortTrackClips(valueTrackerTrack)
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

export function findValueTrackerTrack(valueTrackerTracks, valueTrackerTrackId) {
  return valueTrackerTracks.find((valueTrackerTrack) => valueTrackerTrack.id === valueTrackerTrackId) ?? null
}

export function findValueTrackerTrackIndex(valueTrackerTracks, valueTrackerTrackId) {
  return valueTrackerTracks.findIndex((valueTrackerTrack) => valueTrackerTrack.id === valueTrackerTrackId)
}

export function findValueTrackerTrackByVariableName(valueTrackerTracks, variableName) {
  return valueTrackerTracks.find(
    (valueTrackerTrack) => getValueTrackerBoundVariableName(valueTrackerTrack) === variableName
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

export function findValueTrackerTrackWithClip(valueTrackerTracks, clipId) {
  for (const valueTrackerTrack of valueTrackerTracks) {
    const clipIndex = findClipIndex(valueTrackerTrack, clipId)

    if (clipIndex !== -1) {
      return {
        clipIndex,
        track: valueTrackerTrack
      }
    }
  }

  return null
}

export function findTimelineClip(tracks, variableTracks, valueTrackerTracksOrClipId, maybeClipId) {
  const hasExplicitValueTrackerTracks = Array.isArray(valueTrackerTracksOrClipId)
  const valueTrackerTracks = hasExplicitValueTrackerTracks ? valueTrackerTracksOrClipId : []
  const clipId = hasExplicitValueTrackerTracks ? maybeClipId : valueTrackerTracksOrClipId
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
    const valueTrackerTrackResult = findValueTrackerTrackWithClip(valueTrackerTracks, clipId)

    if (!valueTrackerTrackResult) {
      return null
    }

    return {
      clip: valueTrackerTrackResult.track.clips[valueTrackerTrackResult.clipIndex] ?? null,
      clipIndex: valueTrackerTrackResult.clipIndex,
      lane: valueTrackerTrackResult.track,
      laneId: valueTrackerTrackResult.track.id,
      laneType: 'valueTracker'
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

export function createValueTrackerClip(clip = {}) {
  const duration = Number.isFinite(Number(clip.duration)) ? Number(clip.duration) : 4
  const stepSubdivision = normalizeValueTrackerStepSubdivision(clip.stepSubdivision)

  return {
    id: clip.id ?? createClipId(),
    start: Number.isFinite(Number(clip.start)) ? Number(clip.start) : 0,
    duration,
    stepSubdivision,
    valueTrackerLibraryItemId:
      typeof clip.valueTrackerLibraryItemId === 'string' && clip.valueTrackerLibraryItemId
        ? clip.valueTrackerLibraryItemId
        : null,
    values: normalizeValueTrackerValues(
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
