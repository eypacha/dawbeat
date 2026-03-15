import { tokenizeFormula } from '@/utils/formulaTokenizer'

export function createEvalEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEvalEffect(effect = {}) {
  switch (effect.type) {
    case 'tReplacement':
      return createTReplacementEvalEffect(effect)

    case 'stereoOffset':
    default:
      return createStereoOffsetEvalEffect(effect)
  }
}

export function createStereoOffsetEvalEffect(effect = {}) {
  return {
    id: effect.id ?? createEvalEffectId(),
    type: 'stereoOffset',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      offset: effect.params?.offset ?? 128
    }
  }
}

export function createTReplacementEvalEffect(effect = {}) {
  return {
    id: effect.id ?? createEvalEffectId(),
    type: 'tReplacement',
    enabled: effect.enabled ?? true,
    expanded: effect.expanded ?? false,
    params: {
      stereo: Boolean(effect.params?.stereo),
      expression: typeof effect.params?.expression === 'string' ? effect.params.expression : 't',
      leftExpression:
        typeof effect.params?.leftExpression === 'string' ? effect.params.leftExpression : 't',
      rightExpression:
        typeof effect.params?.rightExpression === 'string' ? effect.params.rightExpression : 't'
    }
  }
}

export function mergeTReplacementParams(currentParams = {}, updates = {}) {
  const normalizedCurrentParams = createTReplacementEvalEffect({ params: currentParams }).params
  const nextParams = {
    ...normalizedCurrentParams
  }
  const currentStereo = Boolean(normalizedCurrentParams.stereo)
  const hasStereoUpdate = typeof updates.stereo !== 'undefined'
  const nextStereo = hasStereoUpdate ? Boolean(updates.stereo) : currentStereo

  if (typeof updates.expression === 'string') {
    nextParams.expression = updates.expression
  }

  if (typeof updates.leftExpression === 'string') {
    nextParams.leftExpression = updates.leftExpression
  }

  if (typeof updates.rightExpression === 'string') {
    nextParams.rightExpression = updates.rightExpression
  }

  if (hasStereoUpdate && currentStereo !== nextStereo) {
    if (nextStereo) {
      nextParams.leftExpression = nextParams.expression
      nextParams.rightExpression = nextParams.expression
    } else {
      nextParams.expression = nextParams.leftExpression
    }
  }

  nextParams.stereo = nextStereo
  return nextParams
}

export function applyEvalEffects(formula, evalEffects = []) {
  let expressions = [formula]

  for (const effect of evalEffects) {
    if (!effect?.enabled) {
      continue
    }

    expressions = applyEvalEffect(expressions, effect)
  }

  return expressions
}

export function applyEvalEffect(expressions, effect) {
  switch (effect?.type) {
    case 'stereoOffset':
      return stereoOffsetEffect(expressions, effect.params)

    case 'tReplacement':
      return tReplacementEffect(expressions, effect.params)

    default:
      return expressions
  }
}

export function stereoOffsetEffect(expressions, params = {}) {
  const sourceExpressions = Array.isArray(expressions) ? expressions : []
  const offset = normalizeOffset(params.offset)

  if (!sourceExpressions.length || !sourceExpressions[0]) {
    return sourceExpressions
  }

  if (sourceExpressions.length >= 2) {
    const nextExpressions = [...sourceExpressions]
    nextExpressions[1] = replaceFormulaTime(nextExpressions[1], `t+${offset}`)
    return nextExpressions
  }

  const leftExpression = sourceExpressions[0]

  return [
    leftExpression,
    replaceFormulaTime(leftExpression, `t+${offset}`)
  ]
}

export function tReplacementEffect(expressions, params = {}) {
  const sourceExpressions = Array.isArray(expressions) ? expressions : []

  if (!sourceExpressions.length || !sourceExpressions[0]) {
    return sourceExpressions
  }

  const replacement = normalizeReplacementExpression(params.expression)

  if (!params.stereo) {
    return sourceExpressions.map((expression) => replaceFormulaTime(expression, replacement))
  }

  const leftReplacement = normalizeReplacementExpression(params.leftExpression, replacement)
  const rightReplacement = normalizeReplacementExpression(params.rightExpression, replacement)

  if (sourceExpressions.length >= 2) {
    return [
      replaceFormulaTime(sourceExpressions[0], leftReplacement),
      replaceFormulaTime(sourceExpressions[1], rightReplacement)
    ]
  }

  const sourceExpression = sourceExpressions[0]

  return [
    replaceFormulaTime(sourceExpression, leftReplacement),
    replaceFormulaTime(sourceExpression, rightReplacement)
  ]
}

function normalizeOffset(offset) {
  const numericOffset = Number(offset)
  return Number.isFinite(numericOffset) ? numericOffset : 0
}

function normalizeReplacementExpression(expression, fallback = 't') {
  if (typeof expression !== 'string') {
    return fallback
  }

  const trimmedExpression = expression.trim()
  return trimmedExpression || fallback
}

function replaceFormulaTime(formula, nextTimeExpression) {
  if (typeof formula !== 'string' || !formula.trim()) {
    return formula
  }

  const replacementExpression = normalizeReplacementExpression(nextTimeExpression)

  return tokenizeFormula(formula)
    .map((token) => {
      if (token.type === 'var' && token.value === 't') {
        return `(${replacementExpression})`
      }

      return token.value
    })
    .join('')
}
