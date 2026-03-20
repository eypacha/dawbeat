import { resolveClipFormula } from '@/services/formulaService'
import { isTrackAudible } from '@/services/trackPlaybackState'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'
import { getClipEnd } from '@/utils/timeUtils'

export function getActiveFormula(timeTicks, tracks, formulas, variableTracks = [], valueRollTracks = []) {
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
    getActiveVariableDefinitions(timeTicks, variableTracks, valueRollTracks)
  )
}

export function getPlaybackEndTick(tracks) {
  let maxEnd = 0

  for (const track of tracks) {
    if (!isTrackAudible(track, tracks)) {
      continue
    }

    for (const clip of track.clips) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  return maxEnd
}
