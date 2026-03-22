import { resolveClipFormulaExpressions } from '@/services/formulaService'
import { isTrackAudible } from '@/services/trackPlaybackState'
import { normalizeTrackUnionOperator } from '@/services/trackUnionOperatorService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'
import { getClipEnd } from '@/utils/timeUtils'

function normalizeChannelExpressions(expressions = []) {
  const normalizedExpressions = (Array.isArray(expressions) ? expressions : [])
    .filter((expression) => typeof expression === 'string' && expression.trim())

  if (!normalizedExpressions.length) {
    return []
  }

  if (normalizedExpressions.length === 1 || normalizedExpressions[1] === normalizedExpressions[0]) {
    return [normalizedExpressions[0]]
  }

  return [normalizedExpressions[0], normalizedExpressions[1]]
}

function combineChannelExpressions(leftExpressions = [], rightExpressions = [], unionOperator) {
  const normalizedLeftExpressions = normalizeChannelExpressions(leftExpressions)
  const normalizedRightExpressions = normalizeChannelExpressions(rightExpressions)

  if (!normalizedLeftExpressions.length) {
    return normalizedRightExpressions
  }

  if (!normalizedRightExpressions.length) {
    return normalizedLeftExpressions
  }

  const leftExpression = normalizedLeftExpressions[0]
  const rightExpression = normalizedLeftExpressions[1] ?? leftExpression
  const nextLeftExpression = normalizedRightExpressions[0]
  const nextRightExpression = normalizedRightExpressions[1] ?? nextLeftExpression

  return normalizeChannelExpressions([
    `(${leftExpression} ${unionOperator} ${nextLeftExpression})`,
    `(${rightExpression} ${unionOperator} ${nextRightExpression})`
  ])
}

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
        const resolvedExpressions = resolveClipFormulaExpressions(clip, formulas)

        if (!resolvedExpressions.length) {
          continue
        }

        activeTracks.push({
          expressions: resolvedExpressions.map((expression) => `(${expression})`),
          unionOperator: normalizeTrackUnionOperator(track.unionOperator)
        })
      }
    }
  }

  if (!activeTracks.length) {
    return null
  }

  const combinedExpressions = activeTracks.slice(1).reduce(
    (expressions, trackEntry, index) =>
      combineChannelExpressions(
        expressions,
        trackEntry.expressions,
        activeTracks[index].unionOperator
      ),
    activeTracks[0].expressions
  )
  const activeVariableDefinitions = getActiveVariableDefinitions(
    timeTicks,
    variableTracks,
    valueTrackerTracks,
    valueTrackerLiveInputs
  )
  const renderedExpressions = normalizeChannelExpressions(
    combinedExpressions.map((expression) =>
      prependVariableDefinitions(expression, activeVariableDefinitions) ?? expression
    )
  )

  if (!renderedExpressions.length) {
    return null
  }

  return renderedExpressions.length === 1
    ? renderedExpressions[0]
    : renderedExpressions
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
