import { ANALYSIS_WINDOW } from '@/services/formulaAnalysis/analysisConfig'

function normalizeAnalysisLength(samples, period) {
  const sampleLength = Array.isArray(samples) ? samples.length : 0

  if (sampleLength <= 1) {
    return sampleLength
  }

  const numericPeriod = Number(period)
  const baseLength = Number.isFinite(numericPeriod) && numericPeriod > 1
    ? Math.floor(numericPeriod)
    : sampleLength

  return Math.max(1, Math.min(baseLength, sampleLength, ANALYSIS_WINDOW))
}

function resolveActivityLevel(normalizedActivity) {
  if (normalizedActivity < 0.1) {
    return 'low'
  }

  if (normalizedActivity < 0.3) {
    return 'medium'
  }

  return 'high'
}

export function analyzeActivity(samples = [], period = null) {
  const analysisLength = normalizeAnalysisLength(samples, period)

  if (analysisLength <= 1) {
    return {
      value: 0,
      normalized: 0,
      level: 'low'
    }
  }

  let sum = 0

  for (let index = 1; index < analysisLength; index += 1) {
    sum += Math.abs(samples[index] - samples[index - 1])
  }

  const value = sum / (analysisLength - 1)
  const normalized = value / 255

  return {
    value,
    normalized,
    level: resolveActivityLevel(normalized)
  }
}
