import nerdamer from "nerdamer"

export default function simplifyFormula(expr) {
  expr = simplifyMath(expr)
  expr = simplifyBitwise(expr)
  return expr
}

function simplifyMath(expr) {
  try {
    return nerdamer(expr).expand().toString()
  } catch {
    return expr
  }
}

function simplifyBitwise(expr) {
  return expr
    .replace(/\(([^()]+)\)\s*&\s*\1/g, "$1")
    .replace(/\(([^()]+)\)\s*\|\s*\1/g, "$1")
    .replace(/\(([^()]+)\)\s*\^\s*\1/g, "0")
    .replace(/(\w+)\s*&\s*0/g, "0")
    .replace(/(\w+)\s*\|\s*0/g, "$1")
    .replace(/>>\s*0/g, "")
    .replace(/<<\s*0/g, "")
}