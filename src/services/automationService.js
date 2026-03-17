import { normalizeMasterGain } from '@/services/audioEffectService'

export const MASTER_GAIN_AUTOMATION_LANE_ID = 'masterGain'
export const MASTER_GAIN_AUTOMATION_LANE_TYPE = 'masterGain'
export const MASTER_GAIN_AUTOMATION_MAX = 1

export function createDefaultAutomationLane({ value = 1 } = {}) {
  return {
    id: MASTER_GAIN_AUTOMATION_LANE_ID,
    type: MASTER_GAIN_AUTOMATION_LANE_TYPE,
    points: [
      {
        time: 0,
        value: normalizeMasterGain(value)
      }
    ]
  }
}

export function getDefaultAutomationLanes() {
  return []
}

export function normalizeAutomationPoint(point = {}, fallback = {}) {
  const fallbackTime = Number.isFinite(Number(fallback.time)) ? Number(fallback.time) : 0
  const fallbackValue = Number.isFinite(Number(fallback.value)) ? Number(fallback.value) : 1
  const time = Number(point.time)
  const value = Number(point.value)

  return {
    time: Math.max(0, Number.isFinite(time) ? time : fallbackTime),
    value: normalizeMasterGain(Number.isFinite(value) ? value : fallbackValue)
  }
}

export function normalizeAutomationLane(lane = {}) {
  if (lane.id !== MASTER_GAIN_AUTOMATION_LANE_ID && lane.type !== MASTER_GAIN_AUTOMATION_LANE_TYPE) {
    return null
  }

  return {
    id: MASTER_GAIN_AUTOMATION_LANE_ID,
    type: MASTER_GAIN_AUTOMATION_LANE_TYPE,
    points: Array.isArray(lane.points)
      ? lane.points.map((point) => normalizeAutomationPoint(point)).filter(Boolean)
      : []
  }
}

export function normalizeAutomationLanes(automationLanes) {
  if (!Array.isArray(automationLanes)) {
    return []
  }

  const masterGainLane = automationLanes
    .map((lane) => normalizeAutomationLane(lane))
    .find(Boolean)

  return masterGainLane ? [masterGainLane] : []
}

export function getAutomationLaneById(automationLanes = [], laneId) {
  return automationLanes.find((lane) => lane.id === laneId) ?? null
}

export function getSortedAutomationPoints(points = []) {
  return [...points].sort((leftPoint, rightPoint) => leftPoint.time - rightPoint.time)
}

export function getAutomationValueAtTime(time, lane) {
  const points = getSortedAutomationPoints(lane?.points ?? [])

  if (!points.length) {
    return null
  }

  if (time <= points[0].time) {
    return points[0].value
  }

  if (time >= points[points.length - 1].time) {
    return points[points.length - 1].value
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const currentPoint = points[index]
    const nextPoint = points[index + 1]

    if (time < currentPoint.time || time > nextPoint.time) {
      continue
    }

    if (nextPoint.time === currentPoint.time) {
      return nextPoint.value
    }

    const interpolation = (time - currentPoint.time) / (nextPoint.time - currentPoint.time)
    return currentPoint.value + interpolation * (nextPoint.value - currentPoint.value)
  }

  return null
}

export function resolveMasterGainAtTime(time, automationLanes = [], fallbackGain = 1) {
  const automationValue = getAutomationValueAtTime(
    time,
    getAutomationLaneById(automationLanes, MASTER_GAIN_AUTOMATION_LANE_ID)
  )

  return normalizeMasterGain(automationValue ?? fallbackGain)
}
