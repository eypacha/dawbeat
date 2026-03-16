const DOUBLE_OPERATORS = ['>>', '<<']
const SINGLE_OPERATORS = new Set(['+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '=', '<', '>', '?', ':',','])
const PARENTHESES = new Set(['(', ')'])
const FUNCTION_NAMES = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sqrt',
  'abs',
  'floor',
  'ceil',
  'round',
  'log',
  'exp',
  'min',
  'max',
  'pow'
])

export function tokenizeFormula(expression = '') {
  const source = String(expression)
  const tokens = []
  let index = 0

  while (index < source.length) {
    const remaining = source.slice(index)
    const currentChar = source[index]
    const doubleOperator = DOUBLE_OPERATORS.find((operator) => remaining.startsWith(operator))

    if (doubleOperator) {
      tokens.push({ type: 'operator', value: doubleOperator })
      index += doubleOperator.length
      continue
    }

    if (/\d/.test(currentChar)) {
      const endIndex = getNumberEndIndex(source, index)

      tokens.push({
        type: 'number',
        value: source.slice(index, endIndex)
      })
      index = endIndex
      continue
    }

    if (/[a-zA-Z_]/.test(currentChar)) {
      let endIndex = index + 1

      while (endIndex < source.length && /[a-zA-Z0-9_]/.test(source[endIndex])) {
        endIndex += 1
      }

      const identifier = source.slice(index, endIndex)
      let lookaheadIndex = endIndex

      if (identifier === 't') {
        tokens.push({
          type: 'var',
          value: identifier
        })
        index = endIndex
        continue
      }

      while (lookaheadIndex < source.length && /\s/.test(source[lookaheadIndex])) {
        lookaheadIndex += 1
      }

      if (FUNCTION_NAMES.has(identifier) && source[lookaheadIndex] === '(') {
        tokens.push({
          type: 'function',
          value: identifier
        })
      } else {
        tokens.push({
          type: 'invalid',
          value: identifier
        })
      }

      index = endIndex
      continue
    }

    if (SINGLE_OPERATORS.has(currentChar)) {
      tokens.push({ type: 'operator', value: currentChar })
      index += 1
      continue
    }

    if (PARENTHESES.has(currentChar)) {
      tokens.push({ type: 'paren', value: currentChar })
      index += 1
      continue
    }

    if (/\s/.test(currentChar)) {
      let endIndex = index + 1

      while (endIndex < source.length && /\s/.test(source[endIndex])) {
        endIndex += 1
      }

      tokens.push({
        type: 'space',
        value: source.slice(index, endIndex)
      })
      index = endIndex
      continue
    }

    tokens.push({ type: 'invalid', value: currentChar })
    index += 1
  }

  return tokens
}

function getNumberEndIndex(source, startIndex) {
  if (
    source[startIndex] === '0' &&
    (source[startIndex + 1] === 'x' || source[startIndex + 1] === 'X')
  ) {
    let endIndex = startIndex + 2

    while (endIndex < source.length && /[0-9a-fA-F]/.test(source[endIndex])) {
      endIndex += 1
    }

    if (endIndex > startIndex + 2) {
      return endIndex
    }
  }

  let endIndex = startIndex + 1

  while (endIndex < source.length && /\d/.test(source[endIndex])) {
    endIndex += 1
  }

  return endIndex
}

export function renderFormulaTokensToHtml(expression = '') {
  const tokens = tokenizeFormula(expression)

  if (!tokens.length) {
    return ''
  }

  return tokens
    .map((token) => {
      const escapedValue = escapeHtml(token.value)

      if (token.type === 'space') {
        return escapedValue
      }

      return `<span class="token-${token.type}">${escapedValue}</span>`
    })
    .join('')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
