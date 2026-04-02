export const BYTEBEAT_TYPE_BYTEBEAT = 0
export const BYTEBEAT_TYPE_FLOATBEAT = 1
export const BYTEBEAT_TYPE_SIGNED_BYTEBEAT = 2
export const DEFAULT_BYTEBEAT_TYPE = BYTEBEAT_TYPE_BYTEBEAT

const VALID_BYTEBEAT_TYPES = new Set([
  BYTEBEAT_TYPE_BYTEBEAT,
  BYTEBEAT_TYPE_FLOATBEAT,
  BYTEBEAT_TYPE_SIGNED_BYTEBEAT
])
const signedBytebeatSample = new Int8Array(1)

export const BYTEBEAT_TYPE_OPTIONS = Object.freeze([
  {
    label: 'ByteBeat',
    value: BYTEBEAT_TYPE_BYTEBEAT
  },
  {
    label: 'FloatBeat',
    value: BYTEBEAT_TYPE_FLOATBEAT
  },
  {
    label: 'Signed ByteBeat',
    value: BYTEBEAT_TYPE_SIGNED_BYTEBEAT
  }
])

export function normalizeBytebeatType(value, fallback = DEFAULT_BYTEBEAT_TYPE) {
  const normalizedFallback = VALID_BYTEBEAT_TYPES.has(Number(fallback))
    ? Number(fallback)
    : DEFAULT_BYTEBEAT_TYPE
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return normalizedFallback
  }

  const normalizedValue = Math.trunc(numericValue)
  return VALID_BYTEBEAT_TYPES.has(normalizedValue) ? normalizedValue : normalizedFallback
}

export function coerceBytebeatSampleValue(value, bytebeatType = DEFAULT_BYTEBEAT_TYPE) {
  const numericValue = Array.isArray(value) ? value[0] : value

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  const normalizedType = normalizeBytebeatType(bytebeatType)

  if (normalizedType === BYTEBEAT_TYPE_FLOATBEAT) {
    return numericValue
  }

  if (normalizedType === BYTEBEAT_TYPE_SIGNED_BYTEBEAT) {
    signedBytebeatSample[0] = numericValue
    return signedBytebeatSample[0] / 128
  }

  return ((numericValue & 255) / 127) - 1
}
