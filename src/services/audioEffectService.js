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

    default:
      return null
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
