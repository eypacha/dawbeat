export function createFormulaId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `formula-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createFormula(formula = {}) {
  return {
    id: formula.id ?? createFormulaId(),
    name: formula.name ?? '',
    code: formula.code ?? ''
  }
}

export function getFormulaById(formulas, formulaId) {
  return formulas.find((formula) => formula.id === formulaId) ?? null
}

export function getFormulaDisplayName(formula) {
  if (!formula) {
    return ''
  }

  const trimmedName = formula.name.trim()
  return trimmedName || formula.code
}

export function resolveClipFormula(clip, formulas, fallback = '') {
  if (typeof clip.formulaId === 'string' && clip.formulaId) {
    return getFormulaById(formulas, clip.formulaId)?.code ?? fallback
  }

  return clip.formula ?? fallback
}
