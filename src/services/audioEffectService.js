export function createAudioEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `audio-fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAudioEffect(effect = {}) {
  switch (effect.type) {
    case 'bitcrusher':
      return createBitCrusherAudioEffect(effect)

    case 'eq':
      return createEqAudioEffect(effect)

    case 'delay':
    default:
      return createDelayAudioEffect(effect)
  }
}

export function createDelayAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'delay',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      delayTime: normalizeDelayTime(effect.params?.delayTime ?? 0.18),
      feedback: normalizeMixValue(effect.params?.feedback ?? 0.35),
      mix: normalizeMixValue(effect.params?.mix ?? 0.5)
    }
  }
}

export function createEqAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'eq',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      bass: normalizeDecibels(effect.params?.bass ?? 0),
      mid: normalizeDecibels(effect.params?.mid ?? 0),
      treble: normalizeDecibels(effect.params?.treble ?? 0)
    }
  }
}

export function createBitCrusherAudioEffect(effect = {}) {
  return {
    id: effect.id ?? createAudioEffectId(),
    type: 'bitcrusher',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      bits: normalizeUnitValue(effect.params?.bits ?? 0.45)
    }
  }
}

export function normalizeDelayTime(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeMixValue(value) {
  return normalizeUnitValue(value)
}

export function normalizeUnitValue(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
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
