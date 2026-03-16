import { resolveClipFormula } from '@/services/formulaService'
import { isTrackAudible } from '@/services/trackPlaybackState'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getClipEnd } from '@/utils/timeUtils'

export function getActiveFormula(timeTicks, tracks, formulas) {
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

  return activeTracks.slice(1).reduce(
    (expression, trackEntry, index) =>
      `(${expression} ${activeTracks[index].unionOperator} ${trackEntry.formula})`,
    activeTracks[0].formula
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
