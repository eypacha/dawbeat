const DEFAULT_SAMPLE_COUNT = 8192
const DEFAULT_MAX_PERIOD = 4096
const DEFAULT_MATCH_THRESHOLD = 0.99
const DEFAULT_PRECHECK_WINDOW = 64

function normalizeSampleCount(sampleCount = DEFAULT_SAMPLE_COUNT) {
  const numericSampleCount = Number(sampleCount)

  if (!Number.isFinite(numericSampleCount) || numericSampleCount < 2) {
    return DEFAULT_SAMPLE_COUNT
  }

  return Math.max(2, Math.floor(numericSampleCount))
}

function normalizeByteSample(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return (numericValue | 0) & 255
}

function normalizeMaxPeriod(maxPeriod = DEFAULT_MAX_PERIOD, sampleLength = 0) {
  const numericMaxPeriod = Number(maxPeriod)
  const fallbackMaxPeriod = Math.max(1, Math.min(DEFAULT_MAX_PERIOD, sampleLength - 1))

  if (!Number.isFinite(numericMaxPeriod)) {
    return fallbackMaxPeriod
  }

  return Math.max(1, Math.min(Math.floor(numericMaxPeriod), sampleLength - 1))
}

function normalizeThreshold(matchThreshold = DEFAULT_MATCH_THRESHOLD) {
  const numericThreshold = Number(matchThreshold)

  if (!Number.isFinite(numericThreshold)) {
    return DEFAULT_MATCH_THRESHOLD
  }

  return Math.max(0, Math.min(1, numericThreshold))
}

function normalizePrecheckWindow(precheckWindow = DEFAULT_PRECHECK_WINDOW) {
  const numericPrecheckWindow = Number(precheckWindow)

  if (!Number.isFinite(numericPrecheckWindow)) {
    return DEFAULT_PRECHECK_WINDOW
  }

  return Math.max(1, Math.floor(numericPrecheckWindow))
}

function getMatchRatio(samples, period, totalComparisons) {
  let matches = 0

  for (let index = 0; index < totalComparisons; index += 1) {
    if (samples[index] === samples[index + period]) {
      matches += 1
    }
  }

  return totalComparisons > 0 ? matches / totalComparisons : 0
}

function collectSampleStats(samples = []) {
  const uniqueSamples = new Set()
  let saturatedHighCount = 0

  for (const sample of samples) {
    uniqueSamples.add(sample)

    if (sample === 255) {
      saturatedHighCount += 1
    }
  }

  return {
    saturatedHighRatio: samples.length ? saturatedHighCount / samples.length : 0,
    uniqueCount: uniqueSamples.size
  }
}

export function renderSamples(formulaEvaluator, sampleCount = DEFAULT_SAMPLE_COUNT) {
  if (typeof formulaEvaluator !== 'function') {
    return []
  }

  const normalizedSampleCount = normalizeSampleCount(sampleCount)
  const samples = new Array(normalizedSampleCount)

  for (let t = 0; t < normalizedSampleCount; t += 1) {
    let value = 0

    try {
      value = formulaEvaluator(t)
    } catch {
      value = 0
    }

    samples[t] = normalizeByteSample(value)
  }

  return samples
}

export function detectPeriod(samples = [], maxPeriod = DEFAULT_MAX_PERIOD, options = {}) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return {
      period: null,
      confidence: 0
    }
  }

  const normalizedMatchThreshold = normalizeThreshold(options.matchThreshold)
  const normalizedPrecheckWindow = normalizePrecheckWindow(options.precheckWindow)
  const normalizedMaxPeriod = normalizeMaxPeriod(maxPeriod, samples.length)
  const sampleStats = collectSampleStats(samples)

  for (let period = 1; period <= normalizedMaxPeriod; period += 1) {
    const totalComparisons = samples.length - period

    if (totalComparisons <= 0) {
      continue
    }

    const precheckComparisons = Math.min(normalizedPrecheckWindow, totalComparisons)
    const precheckMatchRatio = getMatchRatio(samples, period, precheckComparisons)

    if (!(precheckMatchRatio > normalizedMatchThreshold)) {
      continue
    }

    const matchRatio = getMatchRatio(samples, period, totalComparisons)

    if (matchRatio > normalizedMatchThreshold) {
      return {
        period,
        confidence: matchRatio
      }
    }
  }

  // Saturation-aware fallback:
  // Some formulas become clamp-dominated near 255, which can hide strict equality periods.
  // In that case, use the unique 8-bit cycle length as a conservative approximation.
  if (
    sampleStats.saturatedHighRatio >= 0.2 &&
    sampleStats.saturatedHighRatio < 0.95 &&
    sampleStats.uniqueCount > 1 &&
    sampleStats.uniqueCount <= normalizedMaxPeriod
  ) {
    return {
      period: sampleStats.uniqueCount,
      confidence: normalizedMatchThreshold
    }
  }

  return {
    period: null,
    confidence: 0
  }
}
