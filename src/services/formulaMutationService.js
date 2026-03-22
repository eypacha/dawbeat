import { tokenizeFormula, tokenizeFormulaWithOptions } from '@/utils/formulaTokenizer'
import { validateFormulaWithOptions } from '@/utils/formulaValidation'

const SHIFT_MIN = 0
const SHIFT_MAX = 31
const CONSTANT_MIN = 0
const CONSTANT_MAX = 255
const MAX_MUTATION_ATTEMPTS = 12
const OPERATOR_POOL = ['|', '^', '&', '+', '-', '%']
const TERM_POOL = ['t>>3', 't>>4', 't>>5', 't>>6', 't>>7', '(t>>3)&1', '(t>>5)&3']
const BIT_MASK_POOL = [1, 3, 7, 15, 31, 63, 127, 255]
const MUTATION_TYPES = ['bitShift', 'constant', 'operator', 'termInjection', 'bitMask']
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

export function mutateFormula(code) {
  const source = typeof code === 'string' ? code.trim() : ''

  if (!source) {
    return null
  }

  const allowedIdentifiers = collectAllowedIdentifiers(source)
  const tokens = tokenizeFormulaWithOptions(source, { allowedIdentifiers })

  if (!tokens.length) {
    return null
  }

  for (let index = 0; index < MAX_MUTATION_ATTEMPTS; index += 1) {
    const mutationType = pickRandom(MUTATION_TYPES)
    const mutated = mutateByType(mutationType, source, tokens)

    if (!mutated || mutated === source) {
      continue
    }

    if (validateFormulaWithOptions(mutated, { allowedIdentifiers })) {
      return mutated
    }
  }

  return null
}

function mutateByType(mutationType, source, tokens) {
  if (mutationType === 'bitShift') {
    return mutateBitShift(tokens)
  }

  if (mutationType === 'constant') {
    return mutateConstant(tokens)
  }

  if (mutationType === 'operator') {
    return mutateOperator(tokens)
  }

  if (mutationType === 'termInjection') {
    return mutateByTermInjection(source)
  }

  if (mutationType === 'bitMask') {
    return mutateBitMask(tokens)
  }

  return null
}

function mutateBitShift(tokens) {
  const shiftIndexes = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token?.type !== 'operator' || (token.value !== '>>' && token.value !== '<<')) {
      continue
    }

    const numberIndex = getNextTokenIndexByType(tokens, index + 1, 'number')

    if (numberIndex !== -1) {
      shiftIndexes.push(numberIndex)
    }
  }

  if (!shiftIndexes.length) {
    return null
  }

  const numberIndex = pickRandom(shiftIndexes)
  const currentValue = toNumericLiteral(tokens[numberIndex]?.value)

  if (!Number.isFinite(currentValue)) {
    return null
  }

  const delta = randomInt(1, 3) * pickRandom([-1, 1])
  let nextValue = clamp(Math.trunc(currentValue + delta), SHIFT_MIN, SHIFT_MAX)

  if (nextValue === currentValue) {
    nextValue = currentValue <= SHIFT_MIN ? SHIFT_MIN + 1 : currentValue - 1
  }

  return replaceTokenValue(tokens, numberIndex, String(nextValue))
}

function mutateConstant(tokens) {
  const numberIndexes = []

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index]?.type === 'number') {
      numberIndexes.push(index)
    }
  }

  if (!numberIndexes.length) {
    return null
  }

  const numberIndex = pickRandom(numberIndexes)
  const currentValue = toNumericLiteral(tokens[numberIndex]?.value)

  if (!Number.isFinite(currentValue)) {
    return null
  }

  const delta = randomInt(1, 24) * pickRandom([-1, 1])
  let nextValue = clamp(Math.trunc(currentValue + delta), CONSTANT_MIN, CONSTANT_MAX)

  if (nextValue === currentValue) {
    nextValue = currentValue <= CONSTANT_MIN ? CONSTANT_MIN + 1 : currentValue - 1
  }

  return replaceTokenValue(tokens, numberIndex, String(nextValue))
}

function mutateOperator(tokens) {
  const operatorIndexes = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token?.type === 'operator' && OPERATOR_POOL.includes(token.value)) {
      operatorIndexes.push(index)
    }
  }

  if (!operatorIndexes.length) {
    return null
  }

  const operatorIndex = pickRandom(operatorIndexes)
  const currentOperator = tokens[operatorIndex]?.value
  const nextOperators = OPERATOR_POOL.filter((operator) => operator !== currentOperator)

  if (!nextOperators.length) {
    return null
  }

  return replaceTokenValue(tokens, operatorIndex, pickRandom(nextOperators))
}

function mutateByTermInjection(source) {
  if (!source) {
    return null
  }

  const term = pickRandom(TERM_POOL)

  if (!term) {
    return null
  }

  return `(${source}) + (${term})`
}

function mutateBitMask(tokens) {
  const maskIndexes = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token?.type !== 'operator' || token.value !== '&') {
      continue
    }

    const numberIndex = getNextTokenIndexByType(tokens, index + 1, 'number')

    if (numberIndex !== -1) {
      maskIndexes.push(numberIndex)
    }
  }

  if (!maskIndexes.length) {
    return null
  }

  const numberIndex = pickRandom(maskIndexes)
  const currentValue = toNumericLiteral(tokens[numberIndex]?.value)

  if (!Number.isFinite(currentValue)) {
    return null
  }

  let nextMask = pickRandom(BIT_MASK_POOL)

  if (nextMask === currentValue) {
    nextMask = BIT_MASK_POOL.find((mask) => mask !== currentValue) ?? null
  }

  if (!Number.isFinite(nextMask)) {
    return null
  }

  return replaceTokenValue(tokens, numberIndex, String(nextMask))
}

function replaceTokenValue(tokens, tokenIndex, nextValue) {
  if (tokenIndex < 0 || tokenIndex >= tokens.length) {
    return null
  }

  const nextTokens = tokens.map((token, index) => {
    if (index !== tokenIndex) {
      return token
    }

    return {
      ...token,
      value: nextValue
    }
  })

  return nextTokens.map((token) => token.value).join('')
}

function getNextTokenIndexByType(tokens, startIndex, type) {
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token?.type === 'space') {
      continue
    }

    return token?.type === type ? index : -1
  }

  return -1
}

function toNumericLiteral(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return NaN
  }

  return Math.trunc(numericValue)
}

function collectAllowedIdentifiers(expression) {
  const identifierMatches = String(expression).match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []
  const allowedIdentifiers = new Set()

  for (const identifier of identifierMatches) {
    if (identifier === 't' || FUNCTION_NAMES.has(identifier)) {
      continue
    }

    allowedIdentifiers.add(identifier)
  }

  const tokens = tokenizeFormula(expression)

  for (const token of tokens) {
    if (token?.type === 'identifier') {
      allowedIdentifiers.add(token.value)
    }
  }

  return [...allowedIdentifiers]
}

function randomInt(min, max) {
  if (max <= min) {
    return min
  }

  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom(values) {
  if (!Array.isArray(values) || !values.length) {
    return null
  }

  return values[Math.floor(Math.random() * values.length)]
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}