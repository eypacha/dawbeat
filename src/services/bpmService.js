export const DEFAULT_BPM_MEASURE = 't >> 4'

const BYTEBEAT_CYCLE_STEPS = 256
const BPM_DIVIDE_PATTERN = /^t\s*\/\s*(\d+(?:\.\d+)?)$/i
const BPM_SHIFT_PATTERN = /^t\s*>>\s*(\d+)$/i
const MAX_SAFE_SHIFT = 52

export function parseBpmMeasureExpression(expression) {
  const normalizedExpression = typeof expression === 'string' ? expression.trim() : ''

  if (!normalizedExpression) {
    return null
  }

  const divideMatch = normalizedExpression.match(BPM_DIVIDE_PATTERN)

  if (divideMatch) {
    const divisor = Number(divideMatch[1])

    if (!Number.isFinite(divisor) || divisor <= 0) {
      return null
    }

    return {
      cycleSamples: divisor * BYTEBEAT_CYCLE_STEPS,
      divisor,
      normalizedExpression: `t / ${formatDivisor(divisor)}`,
      type: 'divide'
    }
  }

  const shiftMatch = normalizedExpression.match(BPM_SHIFT_PATTERN)

  if (!shiftMatch) {
    return null
  }

  const shift = Number(shiftMatch[1])

  if (!Number.isInteger(shift) || shift < 0 || shift > MAX_SAFE_SHIFT) {
    return null
  }

  return {
    cycleSamples: (2 ** shift) * BYTEBEAT_CYCLE_STEPS,
    divisor: 2 ** shift,
    normalizedExpression: `t >> ${shift}`,
    shift,
    type: 'shift'
  }
}

export function normalizeBpmMeasureExpression(expression, fallback = DEFAULT_BPM_MEASURE) {
  const parsedExpression = parseBpmMeasureExpression(expression)

  if (parsedExpression) {
    return parsedExpression.normalizedExpression
  }

  return parseBpmMeasureExpression(fallback)?.normalizedExpression ?? DEFAULT_BPM_MEASURE
}

export function isBpmMeasureExpressionValid(expression) {
  return Boolean(parseBpmMeasureExpression(expression))
}

export function getBpmFromSampleRate(sampleRate, measureExpression = DEFAULT_BPM_MEASURE) {
  const parsedExpression = parseBpmMeasureExpression(measureExpression)
  const normalizedSampleRate = Number(sampleRate)

  if (!parsedExpression || !Number.isFinite(normalizedSampleRate) || normalizedSampleRate <= 0) {
    return null
  }

  return (normalizedSampleRate * 60) / parsedExpression.cycleSamples
}

export function getSampleRateFromBpm(bpmValue, measureExpression = DEFAULT_BPM_MEASURE) {
  const parsedExpression = parseBpmMeasureExpression(measureExpression)
  const normalizedBpmValue = Number(bpmValue)

  if (!parsedExpression || !Number.isFinite(normalizedBpmValue) || normalizedBpmValue <= 0) {
    return null
  }

  return (normalizedBpmValue * parsedExpression.cycleSamples) / 60
}

export function formatBpmValue(value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return '0'
  }

  if (normalizedValue >= 1000) {
    return Math.round(normalizedValue).toString()
  }

  if (normalizedValue >= 100) {
    return normalizedValue.toFixed(1).replace(/\.0$/, '')
  }

  return normalizedValue
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}

function formatDivisor(value) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/\.?0+$/, '')
}
