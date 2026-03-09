export function createAudioEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `audio-fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

export function normalizeDelayTime(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(1, Math.max(0, numericValue))
}

export function normalizeMixValue(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.min(1, Math.max(0, numericValue))
}
