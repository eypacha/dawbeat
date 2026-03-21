import {
  normalizeDecibels,
  normalizeDecay,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeWet,
  normalizeWidth
} from '@/services/audioEffectService'
import { normalizeAutomationLaneHeight } from '@/services/timelineLaneLayoutService'

export const MASTER_GAIN_AUTOMATION_LANE_ID = 'masterGain'
export const MASTER_GAIN_AUTOMATION_LANE_TYPE = 'masterGain'
export const MASTER_GAIN_AUTOMATION_MAX = 1
export const AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE = 'audioEffectParam'

const AUDIO_EFFECT_TYPE_LABELS = {
  compressor: 'Compressor',
  delay: 'Delay',
  distortion: 'Distortion',
  eq: 'EQ3',
  limiter: 'Limiter',
  reverb: 'Reverb',
  stereoWidener: 'Stereo Widener'
}

const AUDIO_EFFECT_PARAM_CONFIGS = {
  compressor: {
    attack: { label: 'Attack', min: 0, max: 1, normalize: normalizeTime },
    knee: { label: 'Knee', min: 0, max: 40, normalize: normalizeKnee },
    ratio: { label: 'Ratio', min: 1, max: 20, normalize: normalizeRatio },
    release: { label: 'Release', min: 0, max: 1, normalize: normalizeTime },
    threshold: { label: 'Threshold', min: -100, max: 0, normalize: normalizeThreshold }
  },
  delay: {
    delayTime: { label: 'Time', min: 0, max: 1, normalize: normalizeTime },
    feedback: { label: 'Feedback', min: 0, max: 1, normalize: normalizeFeedback },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  distortion: {
    drive: { label: 'Drive', min: 0, max: 1, normalize: normalizeDrive },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  eq: {
    high: { label: 'High', min: -24, max: 24, normalize: normalizeDecibels },
    highFrequency: { label: 'High Cut', min: 40, max: 12000, normalize: normalizeFrequency },
    low: { label: 'Low', min: -24, max: 24, normalize: normalizeDecibels },
    lowFrequency: { label: 'Low Cut', min: 40, max: 12000, normalize: normalizeFrequency },
    mid: { label: 'Mid', min: -24, max: 24, normalize: normalizeDecibels }
  },
  limiter: {
    threshold: { label: 'Threshold', min: -100, max: 0, normalize: normalizeThreshold }
  },
  reverb: {
    decay: { label: 'Decay', min: 0.1, max: 10, normalize: normalizeDecay },
    preDelay: { label: 'PreDelay', min: 0, max: 1, normalize: normalizeTime },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  stereoWidener: {
    width: { label: 'Width', min: 0, max: 1, normalize: normalizeWidth }
  }
}

export function createDefaultAutomationLane({ value = 1 } = {}) {
  return {
    id: MASTER_GAIN_AUTOMATION_LANE_ID,
    height: normalizeAutomationLaneHeight(undefined),
    type: MASTER_GAIN_AUTOMATION_LANE_TYPE,
    points: [
      {
        time: 0,
        value: normalizeMasterGain(value)
      }
    ]
  }
}

export function createAudioEffectParamAutomationLane(effect, paramKey) {
  const config = getAudioEffectParamAutomationConfig(effect?.type, paramKey)

  if (!effect?.id || !config) {
    return null
  }

  return {
    id: getAudioEffectParamAutomationLaneId(effect.id, paramKey),
    height: normalizeAutomationLaneHeight(undefined),
    type: AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE,
    effectId: effect.id,
    effectType: effect.type,
    paramKey,
    points: [
      {
        time: 0,
        value: config.normalize(effect.params?.[paramKey])
      }
    ]
  }
}

export function getDefaultAutomationLanes() {
  return []
}

export function getAudioEffectParamAutomationLaneId(effectId, paramKey) {
  return `audioEffect:${effectId}:${paramKey}`
}

export function getAudioEffectParamAutomationConfig(effectType, paramKey) {
  return AUDIO_EFFECT_PARAM_CONFIGS[effectType]?.[paramKey] ?? null
}

export function getAutomationLaneConfig(lane) {
  if (lane?.type === MASTER_GAIN_AUTOMATION_LANE_TYPE || lane?.id === MASTER_GAIN_AUTOMATION_LANE_ID) {
    return {
      id: MASTER_GAIN_AUTOMATION_LANE_ID,
      label: 'Master Gain',
      min: 0,
      max: MASTER_GAIN_AUTOMATION_MAX,
      normalize: normalizeMasterGain
    }
  }

  if (lane?.type !== AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE) {
    return null
  }

  const paramConfig = getAudioEffectParamAutomationConfig(lane.effectType, lane.paramKey)

  if (!paramConfig) {
    return null
  }

  return {
    ...paramConfig,
    id: lane.id,
    label: `${AUDIO_EFFECT_TYPE_LABELS[lane.effectType] ?? lane.effectType} ${paramConfig.label}`
  }
}

export function normalizeAutomationPoint(point = {}, fallback = {}) {
  return normalizeAutomationPointForLane(point, createDefaultAutomationLane(), fallback)
}

export function normalizeAutomationPointForLane(point = {}, lane, fallback = {}) {
  const config = getAutomationLaneConfig(lane)
  const fallbackTime = Number.isFinite(Number(fallback.time)) ? Number(fallback.time) : 0
  const fallbackValue = Number.isFinite(Number(fallback.value)) ? Number(fallback.value) : 0
  const time = Number(point.time)
  const value = Number(point.value)

  if (!config) {
    return {
      time: Math.max(0, Number.isFinite(time) ? time : fallbackTime),
      value: Number.isFinite(value) ? value : fallbackValue
    }
  }

  return {
    time: Math.max(0, Number.isFinite(time) ? time : fallbackTime),
    value: config.normalize(Number.isFinite(value) ? value : fallbackValue)
  }
}

export function normalizeAutomationLane(lane = {}) {
  if (lane.id === MASTER_GAIN_AUTOMATION_LANE_ID || lane.type === MASTER_GAIN_AUTOMATION_LANE_TYPE) {
    const nextLane = {
      id: MASTER_GAIN_AUTOMATION_LANE_ID,
      height: normalizeAutomationLaneHeight(lane.height),
      type: MASTER_GAIN_AUTOMATION_LANE_TYPE
    }

    return {
      ...nextLane,
      points: Array.isArray(lane.points)
        ? lane.points.map((point) => normalizeAutomationPointForLane(point, nextLane)).filter(Boolean)
        : []
    }
  }

  if (lane.type !== AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE) {
    return null
  }

  const nextLane = {
    id:
      typeof lane.id === 'string' && lane.id
        ? lane.id
        : getAudioEffectParamAutomationLaneId(lane.effectId, lane.paramKey),
    height: normalizeAutomationLaneHeight(lane.height),
    type: AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE,
    effectId: typeof lane.effectId === 'string' ? lane.effectId : '',
    effectType: typeof lane.effectType === 'string' ? lane.effectType : '',
    paramKey: typeof lane.paramKey === 'string' ? lane.paramKey : ''
  }

  if (!nextLane.effectId || !getAudioEffectParamAutomationConfig(nextLane.effectType, nextLane.paramKey)) {
    return null
  }

  return {
    ...nextLane,
    points: Array.isArray(lane.points)
      ? lane.points.map((point) => normalizeAutomationPointForLane(point, nextLane)).filter(Boolean)
      : []
  }
}

export function normalizeAutomationLanes(automationLanes) {
  if (!Array.isArray(automationLanes)) {
    return []
  }

  return automationLanes
    .map((lane) => normalizeAutomationLane(lane))
    .filter((lane, index, lanes) => lane && lanes.findIndex((entry) => entry.id === lane.id) === index)
}

export function getAutomationLaneById(automationLanes = [], laneId) {
  return automationLanes.find((lane) => lane.id === laneId) ?? null
}

export function getAutomationLaneByAudioEffectParam(automationLanes = [], effectId, paramKey) {
  return automationLanes.find((lane) =>
    lane.type === AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE &&
    lane.effectId === effectId &&
    lane.paramKey === paramKey
  ) ?? null
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

export function resolveAutomationLaneValueAtTime(time, lane, fallbackValue = null) {
  const automationValue = getAutomationValueAtTime(time, lane)
  const config = getAutomationLaneConfig(lane)

  if (!config) {
    return automationValue ?? fallbackValue
  }

  return config.normalize(automationValue ?? fallbackValue)
}

export function resolveMasterGainAtTime(time, automationLanes = [], fallbackGain = 1) {
  return resolveAutomationLaneValueAtTime(
    time,
    getAutomationLaneById(automationLanes, MASTER_GAIN_AUTOMATION_LANE_ID),
    fallbackGain
  )
}

export function resolveAudioEffectParamValueAtTime(time, automationLanes = [], effect, paramKey) {
  return resolveAutomationLaneValueAtTime(
    time,
    getAutomationLaneByAudioEffectParam(automationLanes, effect?.id, paramKey),
    effect?.params?.[paramKey]
  )
}

export function resolveAudioEffectAtTime(time, automationLanes = [], effect) {
  if (!effect?.params) {
    return effect
  }

  const nextParams = { ...effect.params }

  for (const paramKey of Object.keys(nextParams)) {
    nextParams[paramKey] = resolveAudioEffectParamValueAtTime(
      time,
      automationLanes,
      effect,
      paramKey
    )
  }

  return {
    ...effect,
    params: nextParams
  }
}

export function resolveAudioEffectsAtTime(time, automationLanes = [], audioEffects = []) {
  return audioEffects.map((effect) => resolveAudioEffectAtTime(time, automationLanes, effect))
}
