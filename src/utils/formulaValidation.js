const MATH_SCOPE_DECLARATION = Object.getOwnPropertyNames(Math)
  .filter((name) => typeof Math[name] !== 'undefined')
  .map((name) => `${name} = Math.${name}`)
  .join(', ')

export function validateFormula(code) {
  try {
    // Validate both parse time and a minimal runtime execution so
    // references like `ty` are rejected before reaching the engine.
    // Mirror ByteBeat.js by exposing Math globals without `Math.` prefix.
    // eslint-disable-next-line no-new-func
    const evaluator = new Function(
      't',
      `var ${MATH_SCOPE_DECLARATION}; return (${code})`
    )
    evaluator(0)
    return true
  } catch {
    return false
  }
}
