export function validateFormula(code) {
  try {
    // Parse the expression in a minimal bytebeat-like function context.
    // We only care about syntax validity here.
    // eslint-disable-next-line no-new-func
    new Function('t', `return ${code}`)
    return true
  } catch {
    return false
  }
}
