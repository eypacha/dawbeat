import {
  ANALYSIS_WINDOW,
  MAX_PERIOD_FOR_OPTIMIZED_ANALYSIS
} from '@/services/formulaAnalysis/analysisConfig'

function normalizeAnalysisLength(samples, period) {
  const sampleLength = Array.isArray(samples) ? samples.length : 0

  if (sampleLength <= 0) {
    return 0
  }

  const numericPeriod = Number(period)
  const preferredLength =
    Number.isFinite(numericPeriod) && numericPeriod > 0 && numericPeriod <= MAX_PERIOD_FOR_OPTIMIZED_ANALYSIS
      ? Math.floor(numericPeriod)
      : ANALYSIS_WINDOW

  return Math.max(1, Math.min(preferredLength, ANALYSIS_WINDOW, sampleLength))
}

export function analyzeRange(samples = [], period = null) {
  const analysisLength = normalizeAnalysisLength(samples, period)

  if (analysisLength <= 0) {
    return {
      min: null,
      max: null,
      range: null,
      width: null,
      normalizedRange: null
    }
  }

  let min = 255
  let max = 0

  for (let index = 0; index < analysisLength; index += 1) {
    const sample = samples[index]

    if (sample < min) {
      min = sample
    }

    if (sample > max) {
      max = sample
    }
  }

  const range = max - min
  const width = range + 1

  return {
    min,
    max,
    range,
    width,
    normalizedRange: width / 256
  }
}
