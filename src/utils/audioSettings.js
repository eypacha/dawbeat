export const DEFAULT_SAMPLE_RATE = 8000
export const MIN_SAMPLE_RATE = 256
export const MAX_SAMPLE_RATE = 44100

export function normalizeSampleRate(value, fallback = DEFAULT_SAMPLE_RATE) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(MAX_SAMPLE_RATE, Math.max(MIN_SAMPLE_RATE, Math.round(numericValue)))
}
