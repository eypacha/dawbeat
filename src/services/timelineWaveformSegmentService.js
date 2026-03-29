import { normalizeExpressionList } from '@/services/formulaService'
import {
  collectFormulaReferencedVariableNames,
  getActiveVariableDefinitions,
  getVariableDefinitionChangeTicksInRange,
  prependVariableDefinitions
} from '@/services/variableTrackService'
import { ticksToSamples } from '@/utils/timeUtils'

export function getRenderableWaveformSegments({
  duration,
  expressions,
  start,
  tickSize,
  valueTrackerTracks = [],
  variableTracks = []
}) {
  const trimmedExpressions = normalizeExpressionList(expressions)
  const clipStart = Number(start)
  const clipDuration = Number(duration)
  const clipEnd = clipStart + clipDuration

  if (!trimmedExpressions.length || !Number.isFinite(clipStart) || !Number.isFinite(clipDuration) || clipDuration <= 0) {
    return []
  }

  const referencedVariableNames = collectReferencedVariableNames(
    trimmedExpressions,
    variableTracks,
    valueTrackerTracks
  )
  const changeTicks = getVariableDefinitionChangeTicksInRange(
    clipStart,
    clipEnd,
    variableTracks,
    valueTrackerTracks,
    referencedVariableNames
  )
  const boundaries = [clipStart, ...changeTicks, clipEnd]
  const referencedVariableNameSet = new Set(referencedVariableNames)
  const segments = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStartTick = boundaries[index]
    const segmentEndTick = boundaries[index + 1]

    if (!(segmentEndTick > segmentStartTick)) {
      continue
    }

    const variableDefinitions = getActiveVariableDefinitions(
      segmentStartTick,
      variableTracks,
      valueTrackerTracks,
      {}
    ).filter((variableDefinition) =>
      !referencedVariableNameSet.size || referencedVariableNameSet.has(variableDefinition.name)
    )
    const renderableExpressions = trimmedExpressions.map(
      (expression) => prependVariableDefinitions(expression, variableDefinitions) ?? expression
    )
    const segmentStartSample = ticksToSamples(segmentStartTick, tickSize)
    const segmentEndSample = ticksToSamples(segmentEndTick, tickSize)
    const previousSegment = segments[segments.length - 1]

    if (
      previousSegment &&
      JSON.stringify(previousSegment.expressions) === JSON.stringify(renderableExpressions) &&
      previousSegment.endSample === segmentStartSample
    ) {
      previousSegment.endSample = segmentEndSample
      continue
    }

    segments.push({
      endSample: segmentEndSample,
      expressions: renderableExpressions,
      startSample: segmentStartSample
    })
  }

  return segments
}

function collectReferencedVariableNames(expressions, variableTracks, valueTrackerTracks) {
  return [...new Set(
    expressions.flatMap((expression) =>
      collectFormulaReferencedVariableNames(
        expression,
        variableTracks,
        valueTrackerTracks
      )
    )
  )]
}
