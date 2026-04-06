export function createAudioEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `audio-fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAudioEffect(effect = {}) {
  switch (effect.type) {
    case 'distortion':
      return createDistortionAudioEffect(effect)

    case 'stereoWidener':
      return createStereoWidenerAudioEffect(effect)

    case 'delay':
      return createDelayAudioEffect(effect)

    case 'compressor':
      return createCompressorAudioEffect(effect)

    case 'reverb':
      return createReverbAudioEffect(effect)

    case 'limiter':
      return createLimiterAudioEffect(effect)

    case 'eq':
      return createEqAudioEffect(effect)

    case 'bitCrusher':
      return createBitCrusherAudioEffect(effect)

    case 'vibrato':
      return createVibratoAudioEffect(effect)

    case 'chorus':
      return createChorusAudioEffect(effect)

    case 'chebyshev':
      return createChebyshevAudioEffect(effect)

    case 'autoWah':
      return createAutoWahAudioEffect(effect)

    case 'tremolo':
      return createTremoloAudioEffect(effect)

    case 'pingPongDelay':
      return createPingPongDelayAudioEffect(effect)

    case 'pitchShift':
      return createPitchShiftAudioEffect(effect)

    case 'autoFilter':
      return createAutoFilterAudioEffect(effect)

    case 'autoPanner':
      return createAutoPannerAudioEffect(effect)

    case 'phaser':
      return createPhaserAudioEffect(effect)

    case 'freeverb':
      return createFreeverbAudioEffect(effect)

    case 'gate':
      return createGateAudioEffect(effect)

    case 'jcReverb':
      return createJCReverbAudioEffect(effect)

    default:
      return null
  }
}

export function createGateAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'gate',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      threshold: normalizeGateThreshold(effect.params?.threshold ?? -40),
      smoothing: normalizeGateSmoothing(effect.params?.smoothing ?? 0.1)
    }
  }
}

export function createFreeverbAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'freeverb',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      roomSize: normalizeFreeverbRoomSize(effect.params?.roomSize ?? 0.7),
      dampening: normalizeFreeverbDampening(effect.params?.dampening ?? 3000),
      wet: normalizeWet(effect.params?.wet ?? 0.3)
    }
  }
}

export function createJCReverbAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'jcReverb',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      roomSize: normalizeJCReverbRoomSize(effect.params?.roomSize ?? 0.5),
      wet: normalizeWet(effect.params?.wet ?? 0.3)
    }
  }
}

export function createPhaserAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'phaser',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizePhaserFrequency(effect.params?.frequency ?? 0.5),
      octaves: normalizePhaserOctaves(effect.params?.octaves ?? 3),
      stages: normalizePhaserStages(effect.params?.stages ?? 10),
      Q: normalizePhaserQ(effect.params?.Q ?? 10),
      baseFrequency: normalizePhaserBaseFrequency(effect.params?.baseFrequency ?? 350),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createAutoPannerAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'autoPanner',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizeAutoPannerFrequency(effect.params?.frequency ?? 1),
      depth: normalizeDepth(effect.params?.depth ?? 1),
      type: normalizeAutoPannerType(effect.params?.type ?? 'sine'),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createAutoFilterAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'autoFilter',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizeAutoFilterFrequency(effect.params?.frequency ?? 1),
      depth: normalizeDepth(effect.params?.depth ?? 1),
      type: normalizeAutoFilterType(effect.params?.type ?? 'sine'),
      baseFrequency: normalizeAutoFilterBaseFrequency(effect.params?.baseFrequency ?? 200),
      octaves: normalizeAutoFilterOctaves(effect.params?.octaves ?? 2.6),
      filterType: normalizeAutoFilterFilterType(effect.params?.filterType ?? 'lowpass'),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createPitchShiftAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'pitchShift',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      pitch: normalizePitchShiftPitch(effect.params?.pitch ?? 0),
      windowSize: normalizePitchShiftWindowSize(effect.params?.windowSize ?? 0.1),
      feedback: normalizeFeedback(effect.params?.feedback ?? 0),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createPingPongDelayAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'pingPongDelay',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      delayTime: normalizeTime(effect.params?.delayTime ?? 0.25),
      feedback: normalizeFeedback(effect.params?.feedback ?? 0.5),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createTremoloAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'tremolo',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizeTremoloFrequency(effect.params?.frequency ?? 10),
      depth: normalizeDepth(effect.params?.depth ?? 0.5),
      spread: normalizeTremoloSpread(effect.params?.spread ?? 180),
      type: normalizeTremoloType(effect.params?.type ?? 'sine'),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createAutoWahAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'autoWah',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      baseFrequency: normalizeAutoWahBaseFrequency(effect.params?.baseFrequency ?? 100),
      octaves: normalizeAutoWahOctaves(effect.params?.octaves ?? 6),
      sensitivity: normalizeAutoWahSensitivity(effect.params?.sensitivity ?? 0),
      follower: normalizeAutoWahFollower(effect.params?.follower ?? 0.2),
      q: normalizeAutoWahQ(effect.params?.q ?? 2),
      gain: normalizeAutoWahGain(effect.params?.gain ?? 2),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createChebyshevAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'chebyshev',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      order: normalizeOrder(effect.params?.order ?? 50),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createChorusAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'chorus',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizeChorusFrequency(effect.params?.frequency ?? 1.5),
      delayTime: normalizeChorusDelayTime(effect.params?.delayTime ?? 3.5),
      depth: normalizeDepth(effect.params?.depth ?? 0.7),
      feedback: normalizeFeedback(effect.params?.feedback ?? 0),
      wet: normalizeWet(effect.params?.wet ?? 0.5)
    }
  }
}

export function createVibratoAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'vibrato',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      frequency: normalizeVibratoFrequency(effect.params?.frequency ?? 5),
      depth: normalizeDepth(effect.params?.depth ?? 0.1),
      wet: normalizeWet(effect.params?.wet ?? 1)
    }
  }
}

export function createBitCrusherAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'bitCrusher',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      bits: normalizeBits(effect.params?.bits ?? 4),
      wet: normalizeWet(effect.params?.wet ?? 0.5)
    }
  }
}

export function createEqAudioEffect(effect = {}) {
  const { highFrequency, lowFrequency } = normalizeEqFrequencies(
    effect.params?.lowFrequency ?? 400,
    effect.params?.highFrequency ?? 2500
  )

  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'eq',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      low: normalizeDecibels(effect.params?.low ?? 0),
      mid: normalizeDecibels(effect.params?.mid ?? 0),
      high: normalizeDecibels(effect.params?.high ?? 0),
      lowFrequency,
      highFrequency
    }
  }
}

export function createDistortionAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'distortion',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      drive: normalizeDrive(effect.params?.drive ?? effect.params?.distortion ?? 0.4),
      wet: normalizeWet(effect.params?.wet ?? 0.35)
    }
  }
}

export function createStereoWidenerAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'stereoWidener',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      width: normalizeWidth(effect.params?.width ?? 0.5)
    }
  }
}

export function createDelayAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'delay',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      delayTime: normalizeTime(effect.params?.delayTime ?? 0.25),
      feedback: normalizeFeedback(effect.params?.feedback ?? 0.35),
      wet: normalizeWet(effect.params?.wet ?? effect.params?.mix ?? 0.25)
    }
  }
}

export function createCompressorAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'compressor',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      threshold: normalizeThreshold(effect.params?.threshold ?? -24),
      ratio: normalizeRatio(effect.params?.ratio ?? 4),
      attack: normalizeTime(effect.params?.attack ?? 0.003),
      release: normalizeTime(effect.params?.release ?? 0.25),
      knee: normalizeKnee(effect.params?.knee ?? 30)
    }
  }
}

export function createLimiterAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'limiter',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      threshold: normalizeThreshold(effect.params?.threshold ?? -6)
    }
  }
}

export function createReverbAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'reverb',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      decay: normalizeDecay(effect.params?.decay ?? 2.5),
      preDelay: normalizeTime(effect.params?.preDelay ?? 0.02),
      wet: normalizeWet(effect.params?.wet ?? 0.3)
    }
  }
}

export function normalizeMasterGain(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeDecibels(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(24, Math.max(-24, numericValue))
}

export function normalizeFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 400
  }

  return Math.min(12000, Math.max(40, Math.round(numericValue)))
}

export function normalizeThreshold(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return -24
  }

  return Math.min(0, Math.max(-100, numericValue))
}

export function normalizeRatio(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 4
  }

  return Math.min(20, Math.max(1, numericValue))
}

export function normalizeTime(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.003
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeKnee(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 30
  }

  return Math.min(40, Math.max(0, numericValue))
}

export function normalizeDecay(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 2.5
  }

  return Math.min(10, Math.max(0.1, numericValue))
}

export function normalizeWet(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.3
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeFeedback(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.35
  }

  return Math.min(0.95, Math.max(0, numericValue))
}

export function normalizeWidth(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.5
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeDrive(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.4
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeBits(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 4
  }

  return Math.min(16, Math.max(1, Math.round(numericValue)))
}

export function normalizeVibratoFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 5
  }

  return Math.min(20, Math.max(0.1, numericValue))
}

export function normalizeDepth(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.1
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeChorusFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1.5
  }

  return Math.min(20, Math.max(0.1, numericValue))
}

export function normalizeChorusDelayTime(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 3.5
  }

  return Math.min(20, Math.max(2, numericValue))
}

export function normalizeOrder(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 50
  }

  return Math.min(100, Math.max(1, Math.round(numericValue)))
}

export function normalizeAutoWahBaseFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 100
  }

  return Math.min(1000, Math.max(20, numericValue))
}

export function normalizeAutoWahOctaves(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 6
  }

  return Math.min(8, Math.max(0, numericValue))
}

export function normalizeAutoWahSensitivity(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(0, Math.max(-60, numericValue))
}

export function normalizeAutoWahFollower(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.2
  }

  return Math.min(1, Math.max(0.01, numericValue))
}

export function normalizeAutoWahQ(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 2
  }

  return Math.min(10, Math.max(0.1, numericValue))
}

export function normalizeAutoWahGain(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 2
  }

  return Math.min(20, Math.max(0, numericValue))
}

const TREMOLO_TYPES = Object.freeze(['sine', 'square', 'triangle', 'sawtooth'])

export function normalizeTremoloType(value) {
  return TREMOLO_TYPES.includes(value) ? value : 'sine'
}

export function normalizeTremoloFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 10
  }

  return Math.min(20, Math.max(0.1, numericValue))
}

export function normalizeTremoloSpread(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 180
  }

  return Math.min(180, Math.max(0, numericValue))
}

export function normalizePitchShiftPitch(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.round(Math.min(24, Math.max(-24, numericValue)))
}

export function normalizePitchShiftWindowSize(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.1
  }

  return Math.min(0.1, Math.max(0.03, numericValue))
}

export function normalizeFreeverbRoomSize(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.7
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeFreeverbDampening(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 3000
  }

  return Math.min(10000, Math.max(0, numericValue))
}

export function normalizeJCReverbRoomSize(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.5
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeGateThreshold(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return -40
  }

  return Math.min(0, Math.max(-80, numericValue))
}

export function normalizeGateSmoothing(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.1
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizePhaserFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0.5
  }

  return Math.min(20, Math.max(0.01, numericValue))
}

export function normalizePhaserOctaves(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 3
  }

  return Math.min(8, Math.max(0, numericValue))
}

export function normalizePhaserStages(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 10
  }

  return Math.min(20, Math.max(1, Math.round(numericValue)))
}

export function normalizePhaserQ(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 10
  }

  return Math.min(100, Math.max(0.1, numericValue))
}

export function normalizePhaserBaseFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 350
  }

  return Math.min(10000, Math.max(20, numericValue))
}

const AUTO_PANNER_TYPES = Object.freeze(['sine', 'square', 'triangle', 'sawtooth'])

export function normalizeAutoPannerType(value) {
  return AUTO_PANNER_TYPES.includes(value) ? value : 'sine'
}

export function normalizeAutoPannerFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.min(20, Math.max(0.01, numericValue))
}

const AUTO_FILTER_TYPES = Object.freeze(['sine', 'square', 'triangle', 'sawtooth'])
const AUTO_FILTER_FILTER_TYPES = Object.freeze(['lowpass', 'highpass', 'bandpass', 'notch'])

export function normalizeAutoFilterType(value) {
  return AUTO_FILTER_TYPES.includes(value) ? value : 'sine'
}

export function normalizeAutoFilterFilterType(value) {
  return AUTO_FILTER_FILTER_TYPES.includes(value) ? value : 'lowpass'
}

export function normalizeAutoFilterFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.min(20, Math.max(0.01, numericValue))
}

export function normalizeAutoFilterBaseFrequency(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 200
  }

  return Math.min(10000, Math.max(20, numericValue))
}

export function normalizeAutoFilterOctaves(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 2.6
  }

  return Math.min(10, Math.max(0.1, numericValue))
}

function normalizeEqFrequencies(lowFrequency, highFrequency) {
  const nextLowFrequency = normalizeFrequency(lowFrequency)
  const nextHighFrequency = normalizeFrequency(highFrequency)

  if (nextLowFrequency < nextHighFrequency) {
    return {
      lowFrequency: nextLowFrequency,
      highFrequency: nextHighFrequency
    }
  }

  return {
    lowFrequency: Math.max(40, nextHighFrequency - 10),
    highFrequency: Math.min(12000, nextLowFrequency + 10)
  }
}
