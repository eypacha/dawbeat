import { ANALYSIS_WINDOW } from '@/services/formulaAnalysis/analysisConfig'

function normalizeAnalysisLength(samples, period) {
  const sampleLength = Array.isArray(samples) ? samples.length : 0

  if (sampleLength <= 1) {
    return sampleLength
  }

  const numericPeriod = Number(period)
  const preferredLength = Number.isFinite(numericPeriod) && numericPeriod > 1
    ? Math.floor(numericPeriod)
    : sampleLength

  return Math.max(1, Math.min(preferredLength, sampleLength, ANALYSIS_WINDOW))
}

export function analyzeBitplanes(samples = [], period = null) {
  const analysisLength = normalizeAnalysisLength(samples, period)

  if (analysisLength <= 1) {
    return {
      bits: Array.from({ length: 8 }, (_, offset) => ({
        bit: 7 - offset,
        activity: 0
      }))
    }
  }

  const bits = []
  const denominator = analysisLength - 1

  for (let bit = 7; bit >= 0; bit -= 1) {
    let toggles = 0

    for (let index = 1; index < analysisLength; index += 1) {
      const previousBit = (samples[index - 1] >> bit) & 1
      const currentBit = (samples[index] >> bit) & 1

      if (previousBit !== currentBit) {
        toggles += 1
      }
    }

    bits.push({
      bit,
      activity: toggles / denominator
    })
  }

  return {
    bits
  }
}
