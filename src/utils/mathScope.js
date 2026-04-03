const mathPropertyNames = Object.getOwnPropertyNames(Math)
  .filter((name) => typeof Math[name] !== 'undefined')

export const MATH_SCOPE_DECLARATION = mathPropertyNames
  .map((name) => `${name} = Math.${name}`)
  .join(', ')

export const MATH_FUNCTION_NAMES = Object.freeze(
  mathPropertyNames.filter((name) => typeof Math[name] === 'function')
)

export const MATH_VALUE_NAMES = Object.freeze(
  mathPropertyNames.filter((name) => typeof Math[name] !== 'function')
)
