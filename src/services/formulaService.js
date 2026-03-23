export function createFormulaId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `formula-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeFormulaText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeFormulaChannels(source = {}, fieldMap) {
  const stereo = Boolean(source[fieldMap.stereo])
  const monoCode = normalizeFormulaText(
    source[fieldMap.mono],
    normalizeFormulaText(source[fieldMap.left], '')
  )
  const leftCode = normalizeFormulaText(source[fieldMap.left], monoCode)
  const rightCode = normalizeFormulaText(source[fieldMap.right], monoCode)

  return {
    [fieldMap.stereo]: stereo,
    [fieldMap.mono]: stereo ? normalizeFormulaText(source[fieldMap.mono], leftCode) : monoCode,
    [fieldMap.left]: leftCode,
    [fieldMap.right]: rightCode
  }
}

function mergeFormulaChannels(current = {}, updates = {}, fieldMap) {
  const normalizedCurrent = normalizeFormulaChannels(current, fieldMap)
  const hasStereoUpdate = typeof updates[fieldMap.stereo] !== 'undefined'
  const nextStereo = hasStereoUpdate
    ? Boolean(updates[fieldMap.stereo])
    : normalizedCurrent[fieldMap.stereo]
  const nextState = {
    ...normalizedCurrent
  }

  if (typeof updates[fieldMap.mono] === 'string') {
    nextState[fieldMap.mono] = updates[fieldMap.mono]
  }

  if (typeof updates[fieldMap.left] === 'string') {
    nextState[fieldMap.left] = updates[fieldMap.left]
  }

  if (typeof updates[fieldMap.right] === 'string') {
    nextState[fieldMap.right] = updates[fieldMap.right]
  }

  if (hasStereoUpdate && nextStereo !== normalizedCurrent[fieldMap.stereo]) {
    if (nextStereo) {
      if (typeof updates[fieldMap.left] !== 'string') {
        nextState[fieldMap.left] = nextState[fieldMap.mono]
      }

      if (typeof updates[fieldMap.right] !== 'string') {
        nextState[fieldMap.right] = nextState[fieldMap.mono]
      }
    } else {
      if (typeof updates[fieldMap.mono] !== 'string') {
        nextState[fieldMap.mono] = nextState[fieldMap.left]
      }
    }
  }

  nextState[fieldMap.stereo] = nextStereo
  return normalizeFormulaChannels(nextState, fieldMap)
}

function getDisplayCodeFromExpressions(expressions = [], fallback = '') {
  const normalizedExpressions = normalizeExpressionList(expressions)

  if (!normalizedExpressions.length) {
    return fallback
  }

  if (normalizedExpressions.length === 1) {
    return normalizedExpressions[0]
  }

  const [leftExpression, rightExpression = leftExpression] = normalizedExpressions
  return `L: ${leftExpression} | R: ${rightExpression}`
}

const FORMULA_FIELD_MAP = Object.freeze({
  left: 'leftCode',
  mono: 'code',
  right: 'rightCode',
  stereo: 'stereo'
})

const CLIP_FORMULA_FIELD_MAP = Object.freeze({
  left: 'leftFormula',
  mono: 'formula',
  right: 'rightFormula',
  stereo: 'formulaStereo'
})

export function createFormula(formula = {}) {
  const channels = normalizeFormulaChannels(formula, FORMULA_FIELD_MAP)

  return {
    id: formula.id ?? createFormulaId(),
    name: formula.name ?? '',
    ...channels
  }
}

export function getFormulaDisplayName(formula) {
  if (!formula) {
    return ''
  }

  const trimmedName = typeof formula.name === 'string' ? formula.name.trim() : ''
  return trimmedName || getFormulaDisplayCode(formula)
}

export function mergeFormulaUpdates(formula, updates = {}) {
  const nextFormula = {
    ...createFormula(formula),
    ...mergeFormulaChannels(formula, updates, FORMULA_FIELD_MAP)
  }

  if (typeof updates.name === 'string') {
    nextFormula.name = updates.name
  }

  return nextFormula
}

export function getFormulaDisplayCode(formula, fallback = '') {
  return getDisplayCodeFromExpressions(getFormulaExpressions(formula, fallback), fallback)
}

export function getFormulaExpressions(formula, fallback = '') {
  if (!formula) {
    return fallback ? [fallback] : []
  }

  const normalizedFormula = createFormula(formula)

  if (normalizedFormula.stereo) {
    return normalizeExpressionList([
      normalizedFormula.leftCode,
      normalizedFormula.rightCode
    ], fallback)
  }

  return normalizeExpressionList([normalizedFormula.code], fallback)
}

export function createClipFormulaFields(clip = {}) {
  return normalizeFormulaChannels(clip, CLIP_FORMULA_FIELD_MAP)
}

export function mergeClipFormulaFields(clip, updates = {}) {
  return mergeFormulaChannels(clip, updates, CLIP_FORMULA_FIELD_MAP)
}

export function getClipFormulaFieldsFromFormula(formula = {}) {
  const normalizedFormula = createFormula(formula)

  return {
    formula: normalizedFormula.code,
    formulaStereo: normalizedFormula.stereo,
    leftFormula: normalizedFormula.leftCode,
    rightFormula: normalizedFormula.rightCode
  }
}

export function getFormulaFieldsFromClipFormula(clip = {}) {
  const normalizedClipFormula = createClipFormulaFields(clip)

  return {
    code: normalizedClipFormula.formula,
    leftCode: normalizedClipFormula.leftFormula,
    rightCode: normalizedClipFormula.rightFormula,
    stereo: normalizedClipFormula.formulaStereo
  }
}

export function getFormulaFieldsFromDraft(draft = {}) {
  const normalizedDraft = createFormula(draft)

  return {
    code: normalizedDraft.code,
    leftCode: normalizedDraft.leftCode,
    rightCode: normalizedDraft.rightCode,
    stereo: normalizedDraft.stereo
  }
}

export function getClipFormulaFieldsFromDraft(draft = {}) {
  return getClipFormulaFieldsFromFormula(getFormulaFieldsFromDraft(draft))
}

export function getFormulaDraft(formula = {}) {
  const normalizedFormula = createFormula(formula)

  return {
    code: normalizedFormula.code,
    leftCode: normalizedFormula.leftCode,
    rightCode: normalizedFormula.rightCode,
    stereo: normalizedFormula.stereo
  }
}

export function getClipFormulaDraft(clip = {}) {
  const normalizedClipFormula = createClipFormulaFields(clip)

  return {
    code: normalizedClipFormula.formula,
    leftCode: normalizedClipFormula.leftFormula,
    rightCode: normalizedClipFormula.rightFormula,
    stereo: normalizedClipFormula.formulaStereo
  }
}

export function getClipFormulaExpressions(clip, fallback = '') {
  if (!clip) {
    return fallback ? [fallback] : []
  }

  const normalizedClipFormula = createClipFormulaFields(clip)

  if (normalizedClipFormula.formulaStereo) {
    return normalizeExpressionList([
      normalizedClipFormula.leftFormula,
      normalizedClipFormula.rightFormula
    ], fallback)
  }

  return normalizeExpressionList([normalizedClipFormula.formula], fallback)
}

export function resolveClipFormulaExpressions(clip, fallback = '') {
  return getClipFormulaExpressions(clip, fallback)
}

export function resolveClipFormulaDraft(clip) {
  return getClipFormulaDraft(clip)
}

export function resolveClipFormulaPrimaryExpression(clip, fallback = '') {
  return resolveClipFormulaExpressions(clip, fallback)[0] ?? fallback
}

export function resolveClipFormula(clip, fallback = '') {
  return getDisplayCodeFromExpressions(resolveClipFormulaExpressions(clip, fallback), fallback)
}

export function resolveClipFormulaName(clip, fallback = '') {
  return clip.formulaName?.trim() ?? fallback
}

export function hasRenderableFormulaInput(input) {
  return normalizeExpressionList(input).length > 0
}

export function normalizeExpressionList(input, fallback = '') {
  const expressions = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? [input]
      : []
  const normalizedExpressions = expressions
    .filter((expression) => typeof expression === 'string')
    .map((expression) => expression.trim())
    .filter(Boolean)

  if (normalizedExpressions.length) {
    return normalizedExpressions
  }

  return fallback ? [fallback] : []
}
