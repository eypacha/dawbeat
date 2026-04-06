import {
  normalizeDecibels,
  normalizeDecay,
  normalizeBits,
  normalizeAutoWahBaseFrequency,
  normalizeAutoWahFollower,
  normalizeAutoWahGain,
  normalizeAutoWahOctaves,
  normalizeAutoWahQ,
  normalizeAutoWahSensitivity,
  normalizeDepth,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeChorusDelayTime,
  normalizeChorusFrequency,
  normalizeVibratoFrequency,
  normalizeOrder,
  normalizeTremoloFrequency,
  normalizeTremoloSpread,
  normalizePitchShiftPitch,
  normalizePitchShiftWindowSize,
  normalizeAutoPannerFrequency,
  normalizeAutoFilterFrequency,
  normalizeAutoFilterBaseFrequency,
  normalizeAutoFilterOctaves,
  normalizeWet,
  normalizeWidth
} from '@/services/audioEffectService'
import { normalizeAutomationLaneHeight } from '@/services/timelineLaneLayoutService'
import { clamp } from '@/utils/timeUtils'

export const MASTER_GAIN_AUTOMATION_LANE_ID = 'masterGain'
export const MASTER_GAIN_AUTOMATION_LANE_TYPE = 'masterGain'
export const MASTER_GAIN_AUTOMATION_MAX = 1
export const AUDIO_EFFECT_PARAM_AUTOMATION_LANE_TYPE = 'audioEffectParam'
export const AUTOMATION_POINT_TIME_EPSILON = 0.0001
export const AUTOMATION_CURVE_LINEAR = 'linear'
export const AUTOMATION_CURVE_EASE_IN = 'easeIn'
export const AUTOMATION_CURVE_EASE_OUT = 'easeOut'
export const AUTOMATION_CURVE_EASE_IN_OUT = 'easeInOut'

export const AUTOMATION_CURVE_OPTIONS = Object.freeze([
  {
    label: 'Straight',
    value: AUTOMATION_CURVE_LINEAR
  },
  {
    label: 'Ease In',
    value: AUTOMATION_CURVE_EASE_IN
  },
  {
    label: 'Ease Out',
    value: AUTOMATION_CURVE_EASE_OUT
  },
  {
    label: 'Ease In-Out',
    value: AUTOMATION_CURVE_EASE_IN_OUT
  }
])
export const DEFAULT_AUTOMATION_CURVE = AUTOMATION_CURVE_EASE_IN_OUT

const VALID_AUTOMATION_CURVES = new Set(AUTOMATION_CURVE_OPTIONS.map((option) => option.value))
const AUTOMATION_CURVE_LABELS = Object.freeze(
  AUTOMATION_CURVE_OPTIONS.reduce((labels, option) => {
    labels[option.value] = option.label
    return labels
  }, {})
)

const AUDIO_EFFECT_TYPE_LABELS = {
  autoFilter: 'Auto Filter',
  autoPanner: 'Auto Panner',
  autoWah: 'Auto Wah',
  bitCrusher: 'BitCrusher',
  chebyshev: 'Chebyshev',
  chorus: 'Chorus',
  compressor: 'Compressor',
  delay: 'Delay',
  distortion: 'Distortion',
  eq: 'EQ3',
  limiter: 'Limiter',
  pingPongDelay: 'Ping Pong Delay',
  pitchShift: 'Pitch Shift',
  reverb: 'Reverb',
  stereoWidener: 'Stereo Widener',
  tremolo: 'Tremolo',
  vibrato: 'Vibrato'
}

const AUDIO_EFFECT_PARAM_CONFIGS = {
  autoFilter: {
    baseFrequency: { label: 'Base Freq', min: 20, max: 10000, normalize: normalizeAutoFilterBaseFrequency },
    depth: { label: 'Depth', min: 0, max: 1, normalize: normalizeDepth },
    frequency: { label: 'Frequency', min: 0.01, max: 20, normalize: normalizeAutoFilterFrequency },
    octaves: { label: 'Octaves', min: 0.1, max: 10, normalize: normalizeAutoFilterOctaves },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  autoPanner: {
    depth: { label: 'Depth', min: 0, max: 1, normalize: normalizeDepth },
    frequency: { label: 'Frequency', min: 0.01, max: 20, normalize: normalizeAutoPannerFrequency },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  autoWah: {
    baseFrequency: { label: 'Base Freq', min: 20, max: 1000, normalize: normalizeAutoWahBaseFrequency },
    follower: { label: 'Follower', min: 0.01, max: 1, normalize: normalizeAutoWahFollower },
    gain: { label: 'Gain', min: 0, max: 20, normalize: normalizeAutoWahGain },
    octaves: { label: 'Octaves', min: 0, max: 8, normalize: normalizeAutoWahOctaves },
    q: { label: 'Q', min: 0.1, max: 10, normalize: normalizeAutoWahQ },
    sensitivity: { label: 'Sensitivity', min: -60, max: 0, normalize: normalizeAutoWahSensitivity },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  chebyshev: {
    order: { label: 'Order', min: 1, max: 100, normalize: normalizeOrder },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  chorus: {
    delayTime: { label: 'Delay Time', min: 2, max: 20, normalize: normalizeChorusDelayTime },
    depth: { label: 'Depth', min: 0, max: 1, normalize: normalizeDepth },
    feedback: { label: 'Feedback', min: 0, max: 0.95, normalize: normalizeFeedback },
    frequency: { label: 'Frequency', min: 0.1, max: 20, normalize: normalizeChorusFrequency },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  bitCrusher: {
    bits: { label: 'Bits', min: 1, max: 16, normalize: normalizeBits },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
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
  },
  vibrato: {
    depth: { label: 'Depth', min: 0, max: 1, normalize: normalizeDepth },
    frequency: { label: 'Frequency', min: 0.1, max: 20, normalize: normalizeVibratoFrequency },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  tremolo: {
    depth: { label: 'Depth', min: 0, max: 1, normalize: normalizeDepth },
    frequency: { label: 'Frequency', min: 0.1, max: 20, normalize: normalizeTremoloFrequency },
    spread: { label: 'Spread', min: 0, max: 180, normalize: normalizeTremoloSpread },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  pingPongDelay: {
    delayTime: { label: 'Delay Time', min: 0, max: 1, normalize: normalizeTime },
    feedback: { label: 'Feedback', min: 0, max: 1, normalize: normalizeFeedback },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet }
  },
  pitchShift: {
    feedback: { label: 'Feedback', min: 0, max: 1, normalize: normalizeFeedback },
    pitch: { label: 'Pitch', min: -24, max: 24, normalize: normalizePitchShiftPitch },
    wet: { label: 'Wet', min: 0, max: 1, normalize: normalizeWet },
    windowSize: { label: 'Window', min: 0.03, max: 0.1, normalize: normalizePitchShiftWindowSize }
  }
}

export function createDefaultAutomationLane({ value = 1 } = {}) {
  return {
    id: MASTER_GAIN_AUTOMATION_LANE_ID,
    height: normalizeAutomationLaneHeight(undefined),
    type: MASTER_GAIN_AUTOMATION_LANE_TYPE,
    points: [
      {
        curve: DEFAULT_AUTOMATION_CURVE,
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
        curve: DEFAULT_AUTOMATION_CURVE,
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

export function getAutomationLaneNormalizedValue(lane, value, fallback = 0) {
  const config = getAutomationLaneConfig(lane)
  const numericValue = Number(value)

  if (!config) {
    return clamp(Number.isFinite(numericValue) ? numericValue : Number(fallback) || 0, 0, 1)
  }

  const min = Number.isFinite(Number(config.min)) ? Number(config.min) : 0
  const max = Number.isFinite(Number(config.max)) ? Number(config.max) : 1
  const range = Math.max(0.0001, max - min)
  const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : min
  const resolvedValue = Number.isFinite(numericValue) ? numericValue : fallbackValue

  return clamp((resolvedValue - min) / range, 0, 1)
}

export function getAutomationLaneValueFromNormalized(lane, normalizedValue, fallback = null) {
  const config = getAutomationLaneConfig(lane)
  const normalized = clamp(Number(normalizedValue) || 0, 0, 1)

  if (!config) {
    return normalized
  }

  const min = Number.isFinite(Number(config.min)) ? Number(config.min) : 0
  const max = Number.isFinite(Number(config.max)) ? Number(config.max) : 1
  const range = Math.max(0.0001, max - min)
  const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : min
  const rawValue = min + normalized * range

  return config.normalize(Number.isFinite(rawValue) ? rawValue : fallbackValue)
}

export function normalizeAutomationCurveType(curve, fallback = DEFAULT_AUTOMATION_CURVE) {
  const normalizedFallback = VALID_AUTOMATION_CURVES.has(fallback)
    ? fallback
    : DEFAULT_AUTOMATION_CURVE

  return VALID_AUTOMATION_CURVES.has(curve) ? curve : normalizedFallback
}

export function getAutomationCurveLabel(curve) {
  const normalizedCurve = normalizeAutomationCurveType(curve)
  return AUTOMATION_CURVE_LABELS[normalizedCurve] ?? AUTOMATION_CURVE_LABELS[DEFAULT_AUTOMATION_CURVE]
}

export function getAutomationCurveProgress(curve, interpolation) {
  const normalizedInterpolation = clamp(Number(interpolation) || 0, 0, 1)
  const normalizedCurve = normalizeAutomationCurveType(curve)

  if (normalizedCurve === AUTOMATION_CURVE_EASE_IN) {
    return normalizedInterpolation ** 2
  }

  if (normalizedCurve === AUTOMATION_CURVE_EASE_OUT) {
    return 1 - (1 - normalizedInterpolation) ** 2
  }

  if (normalizedCurve === AUTOMATION_CURVE_EASE_IN_OUT) {
    if (normalizedInterpolation < 0.5) {
      return 2 * normalizedInterpolation ** 2
    }

    return 1 - ((-2 * normalizedInterpolation + 2) ** 2) / 2
  }

  return normalizedInterpolation
}

export function interpolateAutomationSegmentValue(startValue, endValue, interpolation, curve) {
  const curveProgress = getAutomationCurveProgress(curve, interpolation)
  return startValue + curveProgress * (endValue - startValue)
}

export function normalizeAutomationPoint(point = {}, fallback = {}) {
  return normalizeAutomationPointForLane(point, createDefaultAutomationLane(), fallback)
}

export function normalizeAutomationPointForLane(point = {}, lane, fallback = {}) {
  const config = getAutomationLaneConfig(lane)
  const fallbackCurve = normalizeAutomationCurveType(fallback.curve)
  const fallbackTime = Number.isFinite(Number(fallback.time)) ? Number(fallback.time) : 0
  const fallbackValue = Number.isFinite(Number(fallback.value)) ? Number(fallback.value) : 0
  const time = Number(point.time)
  const value = Number(point.value)

  if (!config) {
    return {
      curve: normalizeAutomationCurveType(point.curve, fallbackCurve),
      time: Math.max(0, Number.isFinite(time) ? time : fallbackTime),
      value: Number.isFinite(value) ? value : fallbackValue
    }
  }

  return {
    curve: normalizeAutomationCurveType(point.curve, fallbackCurve),
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

export function findAutomationPointIndexAtTime(lane, time, epsilon = AUTOMATION_POINT_TIME_EPSILON) {
  const normalizedTime = Math.max(0, Number(time) || 0)
  const normalizedEpsilon = Math.max(0, Number(epsilon) || 0)

  return (lane?.points ?? []).findIndex((point, index) => {
    if (!point) {
      return false
    }

    if (index === 0 && normalizedTime <= normalizedEpsilon) {
      return true
    }

    return Math.abs((Number(point.time) || 0) - normalizedTime) <= normalizedEpsilon
  })
}

export function upsertAutomationPointForLane(lane, point, options = {}) {
  if (!lane) {
    return null
  }

  const normalizedPoint = normalizeAutomationPointForLane(point, lane)
  const pointIndex = findAutomationPointIndexAtTime(
    lane,
    normalizedPoint.time,
    options.epsilon
  )
  const nextPoints = [...(lane.points ?? [])]

  if (pointIndex >= 0) {
    nextPoints[pointIndex] = pointIndex === 0
      ? {
          ...normalizedPoint,
          time: 0
        }
      : normalizedPoint

    return {
      index: pointIndex,
      points: nextPoints
    }
  }

  const nextPoint = normalizedPoint.time <= (options.epsilon ?? AUTOMATION_POINT_TIME_EPSILON)
    ? {
        ...normalizedPoint,
        time: 0
      }
    : normalizedPoint

  nextPoints.push(nextPoint)
  nextPoints.sort((leftPoint, rightPoint) => leftPoint.time - rightPoint.time)

  return {
    index: nextPoints.indexOf(nextPoint),
    points: nextPoints
  }
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
    return interpolateAutomationSegmentValue(
      currentPoint.value,
      nextPoint.value,
      interpolation,
      currentPoint.curve
    )
  }

  return null
}

export function resolveAutomationLaneValueAtTime(time, lane, fallbackValue = null) {
  return resolveAutomationLaneValueAtTimeWithOverride(time, lane, fallbackValue)
}

export function resolveAutomationLaneValueAtTimeWithOverride(time, lane, fallbackValue = null, liveOverrides = null) {
  const overrideValue = getAutomationLaneLiveOverrideValue(liveOverrides, lane?.id)
  const automationValue = getAutomationValueAtTime(time, lane)
  const config = getAutomationLaneConfig(lane)

  if (!config) {
    return overrideValue ?? automationValue ?? fallbackValue
  }

  return config.normalize(overrideValue ?? automationValue ?? fallbackValue)
}

export function resolveMasterGainAtTime(time, automationLanes = [], fallbackGain = 1, liveOverrides = null) {
  return resolveAutomationLaneValueAtTimeWithOverride(
    time,
    getAutomationLaneById(automationLanes, MASTER_GAIN_AUTOMATION_LANE_ID),
    fallbackGain,
    liveOverrides
  )
}

export function resolveAudioEffectParamValueAtTime(time, automationLanes = [], effect, paramKey, liveOverrides = null) {
  return resolveAutomationLaneValueAtTimeWithOverride(
    time,
    getAutomationLaneByAudioEffectParam(automationLanes, effect?.id, paramKey),
    effect?.params?.[paramKey],
    liveOverrides
  )
}

export function resolveAudioEffectAtTime(time, automationLanes = [], effect, liveOverrides = null) {
  if (!effect?.params) {
    return effect
  }

  const nextParams = { ...effect.params }

  for (const paramKey of Object.keys(nextParams)) {
    nextParams[paramKey] = resolveAudioEffectParamValueAtTime(
      time,
      automationLanes,
      effect,
      paramKey,
      liveOverrides
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

export function resolveAudioEffectsAtTimeWithOverrides(
  time,
  automationLanes = [],
  audioEffects = [],
  liveOverrides = null
) {
  return audioEffects.map((effect) =>
    resolveAudioEffectAtTime(time, automationLanes, effect, liveOverrides)
  )
}

export function getAutomationLaneLiveOverrideValue(liveOverrides = null, laneId = '') {
  if (!liveOverrides || typeof liveOverrides !== 'object' || Array.isArray(liveOverrides)) {
    return null
  }

  if (typeof laneId !== 'string' || !laneId || !Object.hasOwn(liveOverrides, laneId)) {
    return null
  }

  const overrideValue = Number(liveOverrides[laneId])
  return Number.isFinite(overrideValue) ? overrideValue : null
}
