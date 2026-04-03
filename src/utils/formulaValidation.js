import { MATH_SCOPE_DECLARATION } from '@/utils/mathScope'

export function validateFormula(code) {
  return validateFormulaWithOptions(code)
}

export function validateFormulaWithOptions(code, options = {}) {
  const allowedIdentifiersDeclaration = Array.isArray(options.allowedIdentifiers)
    ? options.allowedIdentifiers
        .filter((identifier) => typeof identifier === 'string' && identifier)
        .map((identifier) => `${identifier} = 0`)
        .join(', ')
    : ''
  const scopeDeclaration = [MATH_SCOPE_DECLARATION, allowedIdentifiersDeclaration]
    .filter(Boolean)
    .join(', ')

  try {
    // Validate both parse time and a minimal runtime execution so
    // references like `ty` are rejected before reaching the engine.
    // Mirror ByteBeat.js by exposing Math globals without `Math.` prefix.
    // eslint-disable-next-line no-new-func
    const evaluator = new Function(
      't',
      `${scopeDeclaration ? `var ${scopeDeclaration}; ` : ''}return (${code})`
    )
    evaluator(0)
    return true
  } catch {
    return false
  }
}
