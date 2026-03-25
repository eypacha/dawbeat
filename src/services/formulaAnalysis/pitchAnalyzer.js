const MIN_PITCH_CONFIDENCE = 0.25
const MIN_FREQUENCY = 20
const MAX_FREQUENCY = 2000
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function normalizeSampleRate(sampleRate) {
  const numericSampleRate = Number(sampleRate)

  if (!Number.isFinite(numericSampleRate) || numericSampleRate <= 0) {
    return 0
  }

  return numericSampleRate
}

function formatNoteName(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return null
  }

  const midi = Math.round(69 + (12 * Math.log2(frequency / 440)))
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1

  return `${noteName}${octave}`
}

export function detectPitch(samples = [], sampleRate = 0) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  const normalizedSampleRate = normalizeSampleRate(sampleRate)

  if (!normalizedSampleRate) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  const minLag = Math.max(1, Math.floor(normalizedSampleRate / MAX_FREQUENCY))
  const maxLag = Math.min(samples.length - 1, Math.ceil(normalizedSampleRate / MIN_FREQUENCY))

  if (minLag > maxLag) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  const centeredSamples = new Int16Array(samples.length)
  let zeroLagCorrelation = 0

  for (let index = 0; index < samples.length; index += 1) {
    const centeredValue = (samples[index] & 255) - 128
    centeredSamples[index] = centeredValue
    zeroLagCorrelation += centeredValue * centeredValue
  }

  if (zeroLagCorrelation <= 0) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  let bestLag = null
  let bestCorrelation = -Infinity

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0

    for (let index = 0; index < centeredSamples.length - lag; index += 1) {
      correlation += centeredSamples[index] * centeredSamples[index + lag]
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  if (!Number.isFinite(bestCorrelation) || bestLag === null || bestCorrelation <= 0) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  const confidence = Math.max(0, Math.min(1, bestCorrelation / zeroLagCorrelation))

  if (confidence < MIN_PITCH_CONFIDENCE) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  const frequency = normalizedSampleRate / bestLag

  if (!Number.isFinite(frequency) || frequency <= 0) {
    return {
      freq: null,
      note: null,
      confidence: 0
    }
  }

  return {
    freq: frequency,
    note: formatNoteName(frequency),
    confidence
  }
}
