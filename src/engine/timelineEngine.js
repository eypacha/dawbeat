import { resolveClipFormula } from '@/services/formulaService'
import { isTrackAudible } from '@/services/trackPlaybackState'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'
import { getClipEnd } from '@/utils/timeUtils'

export function getActiveFormula(
  timeTicks,
  tracks,
  formulas,
  variableTracks = [],
  valueTrackerTracks = [],
  valueTrackerLiveInputs = {}
) {
  const activeTracks = []

  for (const track of tracks) {
    if (!isTrackAudible(track, tracks)) {
      continue
    }

    for (const clip of track.clips) {
      if (timeTicks >= clip.start && timeTicks < clip.start + clip.duration) {
        const resolvedFormula = resolveClipFormula(clip, formulas)

        if (!resolvedFormula.trim()) {
          continue
        }

        activeTracks.push({
          formula: `(${resolvedFormula})`,
          unionOperator: normalizeTrackUnionOperator(track.unionOperator)
        })
      }
    }
  }

  if (!activeTracks.length) {
    return null
  }

  const combinedExpression = activeTracks.slice(1).reduce(
    (expression, trackEntry, index) =>
      `(${expression} ${activeTracks[index].unionOperator} ${trackEntry.formula})`,
    activeTracks[0].formula
  )

  return prependVariableDefinitions(
    combinedExpression,
    getActiveVariableDefinitions(timeTicks, variableTracks, valueTrackerTracks, valueTrackerLiveInputs)
  )
}

export function getPlaybackEndTick(tracks, variableTracks = [], valueTrackerTracks = []) {
  let maxEnd = 0

  for (const track of tracks) {
    if (!isTrackAudible(track, tracks)) {
      continue
    }

    for (const clip of track.clips) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  for (const variableTrack of variableTracks) {
    for (const clip of variableTrack.clips ?? []) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  for (const valueTrackerTrack of valueTrackerTracks) {
    for (const clip of valueTrackerTrack.clips ?? []) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  return maxEnd
}
