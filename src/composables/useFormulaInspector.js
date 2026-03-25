import { applyEvalEffects } from '@/services/evalEffectService'
import { detectPeriod, renderSamples } from '@/services/formulaAnalysis/periodAnalyzer'
import { normalizeExpressionList } from '@/services/formulaService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'

const MATH_SCOPE_DECLARATION = Object.getOwnPropertyNames(Math)
  .filter((name) => typeof Math[name] !== 'undefined')
  .map((name) => `${name} = Math.${name}`)
  .join(', ')

const DEFAULT_PERIOD_ANALYSIS_OPTIONS = Object.freeze({
  matchThreshold: 0.99,
  maxPeriod: 4096,
  precheckWindow: 64,
  sampleCount: 8192
})

const EMPTY_ANALYSIS_RESULT = Object.freeze({
  period: null,
  confidence: 0
})

function normalizeFormulaExpressions(expressions) {
  return normalizeExpressionList(expressions)
}

function buildMathScopePrefix() {
  return MATH_SCOPE_DECLARATION ? `var ${MATH_SCOPE_DECLARATION};` : ''
}

export function createFormulaEvaluatorFromExpressions(expressions = []) {
  const normalizedExpressions = normalizeFormulaExpressions(expressions)

  if (!normalizedExpressions.length) {
    return null
  }

  const expressionBody = normalizedExpressions.length > 1
    ? `((${normalizedExpressions[0]}) + (${normalizedExpressions[1]})) * 0.5`
    : `(${normalizedExpressions[0]})`

  try {
    // eslint-disable-next-line no-new-func
    const evaluator = new Function(
      't',
      `${buildMathScopePrefix()}return ${expressionBody}`
    )

    return (t) => {
      try {
        return evaluator(t)
      } catch {
        return 0
      }
    }
  } catch {
    return null
  }
}

export function buildRenderableFormulaExpressions({
  expressions,
  evalEffects = [],
  referenceTick = 0,
  valueTrackerTracks = [],
  variableTracks = []
} = {}) {
  const normalizedExpressions = normalizeFormulaExpressions(expressions)

  if (!normalizedExpressions.length) {
    return []
  }

  const variableDefinitions = getActiveVariableDefinitions(
    referenceTick,
    variableTracks,
    valueTrackerTracks,
    {}
  )
  const expressionsWithVariables = normalizedExpressions.map((expression) =>
    prependVariableDefinitions(expression, variableDefinitions) ?? expression
  )

  return normalizeFormulaExpressions(applyEvalEffects(expressionsWithVariables, evalEffects))
}

export function createFormulaAnalysisCacheKey(expressions = []) {
  const normalizedExpressions = normalizeFormulaExpressions(expressions)

  if (!normalizedExpressions.length) {
    return ''
  }

  return JSON.stringify({
    expressions: normalizedExpressions
  })
}

export function useFormulaInspector() {
  function analyzeFormulaPeriod(formulaEvaluator, options = {}) {
    if (typeof formulaEvaluator !== 'function') {
      return EMPTY_ANALYSIS_RESULT
    }

    const analysisOptions = {
      ...DEFAULT_PERIOD_ANALYSIS_OPTIONS,
      ...options
    }
    const samples = renderSamples(formulaEvaluator, analysisOptions.sampleCount)

    if (!samples.length) {
      return EMPTY_ANALYSIS_RESULT
    }

    return detectPeriod(samples, analysisOptions.maxPeriod, {
      matchThreshold: analysisOptions.matchThreshold,
      precheckWindow: analysisOptions.precheckWindow
    })
  }

  return {
    analyzeFormulaPeriod
  }
}
