import { getAutomationLaneConfig } from '@/services/automationService'
import { TRACK_LABEL_WIDTH } from '@/utils/timeUtils'

const DEFAULT_HEADER_FONT = '500 14px ui-sans-serif, system-ui, sans-serif'
const VARIABLE_HEADER_FONT = '500 11px ui-sans-serif, system-ui, sans-serif'
const HEADER_HORIZONTAL_PADDING = 32
const FORMULA_TRACK_CONTROLS_WIDTH = 80
const VALUE_TRACKER_HEADER_EXTRA_WIDTH = 56
const AUTOMATION_HEADER_EXTRA_WIDTH = 72
const VARIABLE_HEADER_EXTRA_WIDTH = 24
const MAX_TRACK_LABEL_WIDTH = 360

let measurementContext = null

function getMeasurementContext() {
  if (measurementContext) {
    return measurementContext
  }

  if (typeof document === 'undefined') {
    return null
  }

  measurementContext = document.createElement('canvas').getContext('2d')
  return measurementContext
}

function measureTextWidth(text, font = DEFAULT_HEADER_FONT) {
  const normalizedText = typeof text === 'string' ? text : ''
  const context = getMeasurementContext()

  if (!context) {
    return normalizedText.length * 8
  }

  context.font = font
  return context.measureText(normalizedText).width
}

export function getFormulaTrackDisplayName(track, trackIndex = 0) {
  if (typeof track?.name === 'string' && track.name.trim()) {
    return track.name
  }

  return `Track ${trackIndex + 1}`
}

export function getTimelineTrackLabelWidth({
  tracks = [],
  variableTracks = [],
  valueTrackerTracks = [],
  automationLanes = []
} = {}) {
  const widths = [
    TRACK_LABEL_WIDTH,
    measureTextWidth('Timeline') + HEADER_HORIZONTAL_PADDING
  ]

  for (const [index, track] of (Array.isArray(tracks) ? tracks : []).entries()) {
    widths.push(
      measureTextWidth(getFormulaTrackDisplayName(track, index)) +
        HEADER_HORIZONTAL_PADDING +
        FORMULA_TRACK_CONTROLS_WIDTH
    )
  }

  for (const variableTrack of Array.isArray(variableTracks) ? variableTracks : []) {
    widths.push(
      measureTextWidth(`var ${variableTrack?.name ?? ''}`, VARIABLE_HEADER_FONT) +
        HEADER_HORIZONTAL_PADDING +
        VARIABLE_HEADER_EXTRA_WIDTH
    )
  }

  for (const valueTrackerTrack of Array.isArray(valueTrackerTracks) ? valueTrackerTracks : []) {
    widths.push(
      measureTextWidth(valueTrackerTrack?.name ?? '') +
        HEADER_HORIZONTAL_PADDING +
        VALUE_TRACKER_HEADER_EXTRA_WIDTH
    )
  }

  for (const automationLane of Array.isArray(automationLanes) ? automationLanes : []) {
    widths.push(
      measureTextWidth(getAutomationLaneConfig(automationLane)?.label ?? automationLane?.id ?? '') +
        HEADER_HORIZONTAL_PADDING +
        AUTOMATION_HEADER_EXTRA_WIDTH
    )
  }

  return Math.round(
    Math.min(
      MAX_TRACK_LABEL_WIDTH,
      Math.max(TRACK_LABEL_WIDTH, ...widths)
    )
  )
}
