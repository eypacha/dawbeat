export function createAudioEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `audio-fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAudioEffect(effect = {}) {
  if (effect.type !== 'eq') {
    return null
  }

  return createEqAudioEffect(effect)
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

export function normalizeMasterGain(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.min(1.5, Math.max(0, numericValue))
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
