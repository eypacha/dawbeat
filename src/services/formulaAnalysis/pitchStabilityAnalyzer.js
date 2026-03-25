import { ANALYSIS_WINDOW } from '@/services/formulaAnalysis/analysisConfig'
import { detectPitch } from '@/services/formulaAnalysis/pitchAnalyzer'

const WINDOW_SIZE = 256
const MIN_WINDOWS = 4
const MIN_PITCH_CONFIDENCE = 0.2

function normalizeAnalysisLength(samples) {
  const sampleLength = Array.isArray(samples) ? samples.length : 0

  if (sampleLength <= 0) {
    return 0
  }

  return Math.min(sampleLength, ANALYSIS_WINDOW)
}

function classifyStability(normalizedVariance) {
  if (normalizedVariance < 0.02) {
    return 'high'
  }

  if (normalizedVariance < 0.1) {
    return 'medium'
  }

  return 'low'
}

export function analyzePitchStability(samples = [], sampleRate = 0) {
  const analysisLength = normalizeAnalysisLength(samples)

  if (analysisLength < WINDOW_SIZE * MIN_WINDOWS) {
    return {
      stability: 'low',
      variance: 0,
      samplesAnalyzed: analysisLength
    }
  }

  const frequencies = []
  const windowCount = Math.floor(analysisLength / WINDOW_SIZE)

  for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
    const start = windowIndex * WINDOW_SIZE
    const end = start + WINDOW_SIZE
    const windowSamples = samples.slice(start, end)
    const pitch = detectPitch(windowSamples, sampleRate)

    if (!Number.isFinite(pitch?.freq) || pitch.confidence < MIN_PITCH_CONFIDENCE) {
      continue
    }

    frequencies.push(pitch.freq)
  }

  if (frequencies.length < 2) {
    return {
      stability: 'low',
      variance: 0,
      samplesAnalyzed: analysisLength
    }
  }

  const meanPitch = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length

  if (!Number.isFinite(meanPitch) || meanPitch <= 0) {
    return {
      stability: 'low',
      variance: 0,
      samplesAnalyzed: analysisLength
    }
  }

  const variance = frequencies.reduce((sum, value) => {
    const delta = value - meanPitch
    return sum + (delta * delta)
  }, 0) / frequencies.length
  const normalizedVariance = variance / meanPitch

  return {
    stability: classifyStability(normalizedVariance),
    variance: normalizedVariance,
    samplesAnalyzed: analysisLength
  }
}
