import { tokenizeFormula } from '@/utils/formulaTokenizer'

export function createEvalEffectId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
    nextExpressions[1] = offsetFormulaTime(nextExpressions[1], offset)
    return nextExpressions
  }

  const leftExpression = sourceExpressions[0]

  return [
    leftExpression,
    offsetFormulaTime(leftExpression, offset)
  ]
}

function normalizeOffset(offset) {
  const numericOffset = Number(offset)
  return Number.isFinite(numericOffset) ? numericOffset : 0
}

function offsetFormulaTime(formula, offset) {
  if (typeof formula !== 'string' || !formula.trim()) {
    return formula
  }

  return tokenizeFormula(formula)
    .map((token) => {
      if (token.type === 'var' && token.value === 't') {
        return `(t+${offset})`
      }

      return token.value
    })
    .join('')
}
