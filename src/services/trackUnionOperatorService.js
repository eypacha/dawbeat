export const DEFAULT_TRACK_UNION_OPERATOR = '|'

export const TRACK_UNION_OPERATOR_OPTIONS = [
  { value: '|', label: 'Bitwise OR (|)' },
  { value: '+', label: 'Add (+)' },
  { value: '-', label: 'Subtract (-)' },
  { value: '*', label: 'Multiply (*)' },
  { value: '<<', label: 'Left Shift (<<)' },
  { value: '>>', label: 'Right Shift (>>)' },
  { value: '&', label: 'Bitwise AND (&)' },
  { value: '^', label: 'Bitwise XOR (^)' },
  { value: '%', label: 'Modulo (%)' }
]

const TRACK_UNION_OPERATOR_VALUES = new Set(
  TRACK_UNION_OPERATOR_OPTIONS.map((option) => option.value)
)

export function normalizeTrackUnionOperator(operator, fallback = DEFAULT_TRACK_UNION_OPERATOR) {
  if (typeof operator !== 'string') {
    return fallback
  }

  return TRACK_UNION_OPERATOR_VALUES.has(operator) ? operator : fallback
}

export function getTrackUnionOperatorOption(operator) {
  const normalizedOperator = normalizeTrackUnionOperator(operator)
  return (
    TRACK_UNION_OPERATOR_OPTIONS.find((option) => option.value === normalizedOperator) ??
    TRACK_UNION_OPERATOR_OPTIONS[0]
  )
}
