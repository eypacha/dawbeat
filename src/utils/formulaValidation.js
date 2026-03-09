export function validateFormula(code) {
  try {
    // Validate both parse time and a minimal runtime execution so
    // references like `ty` are rejected before reaching the engine.
    // eslint-disable-next-line no-new-func
    const evaluator = new Function('t', `return (${code})`)
    evaluator(0)
    return true
  } catch {
    return false
  }
}
