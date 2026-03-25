import { applyEvalEffects } from '@/services/evalEffectService'
import {
  ANALYSIS_WINDOW,
  MAX_PERIOD_FOR_OPTIMIZED_ANALYSIS
} from '@/services/formulaAnalysis/analysisConfig'
import { analyzeActivity } from '@/services/formulaAnalysis/activityAnalyzer'
import { analyzeBitplanes } from '@/services/formulaAnalysis/bitplaneAnalyzer'
import { detectPeriod, renderSamples } from '@/services/formulaAnalysis/periodAnalyzer'
import { detectPitch } from '@/services/formulaAnalysis/pitchAnalyzer'
import { analyzeRange } from '@/services/formulaAnalysis/rangeAnalyzer'
import { normalizeExpressionList } from '@/services/formulaService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'
import { DEFAULT_SAMPLE_RATE } from '@/utils/audioSettings'

const MATH_SCOPE_DECLARATION = Object.getOwnPropertyNames(Math)
  .filter((name) => typeof Math[name] !== 'undefined')
  .map((name) => `${name} = Math.${name}`)
  .join(', ')

const DEFAULT_PERIOD_ANALYSIS_OPTIONS = Object.freeze({
  matchThreshold: 0.99,
  maxPeriod: ANALYSIS_WINDOW - 1,
  maxPeriodForOptimizedAnalysis: MAX_PERIOD_FOR_OPTIMIZED_ANALYSIS,
  precheckWindow: 64,
  sampleCount: ANALYSIS_WINDOW,
  sampleRate: DEFAULT_SAMPLE_RATE
})

const EMPTY_ANALYSIS_RESULT = Object.freeze({
  period: null,
  confidence: 0,
  min: null,
  max: null,
  range: null,
  width: null,
  normalizedRange: null,
  pitch: Object.freeze({
    freq: null,
    note: null,
    confidence: 0
  }),
  activity: Object.freeze({
    value: 0,
    normalized: 0,
    level: 'low'
  }),
  bitplanes: Object.freeze({
    bits: Object.freeze(
      Array.from({ length: 8 }, (_, offset) => ({
        bit: 7 - offset,
        activity: 0
      }))
    )
  })
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
  function analyzeFormula(formulaEvaluator, options = {}) {
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

    const periodResult = detectPeriod(samples, analysisOptions.maxPeriod, {
      matchThreshold: analysisOptions.matchThreshold,
      precheckWindow: analysisOptions.precheckWindow
    })
    const rangeResult = analyzeRange(
      samples,
      Number.isFinite(periodResult.period) && periodResult.period <= analysisOptions.maxPeriodForOptimizedAnalysis
        ? periodResult.period
        : null
    )
    const pitchResult = detectPitch(samples, analysisOptions.sampleRate)
    const activityResult = analyzeActivity(samples, periodResult.period)
    const bitplaneResult = analyzeBitplanes(samples, periodResult.period)

    return {
      ...EMPTY_ANALYSIS_RESULT,
      ...periodResult,
      ...rangeResult,
      pitch: pitchResult,
      activity: activityResult,
      bitplanes: bitplaneResult
    }
  }

  function analyzeFormulaPeriod(formulaEvaluator, options = {}) {
    return analyzeFormula(formulaEvaluator, options)
  }

  return {
    analyzeFormula,
    analyzeFormulaPeriod
  }
}
