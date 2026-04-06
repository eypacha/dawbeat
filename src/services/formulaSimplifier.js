import nerdamer from "nerdamer"
import "nerdamer/Solve"

export default function simplifyFormula(expr) {
  let prev

  do {
    prev = expr
    expr = simplifyMath(expr)
    expr = simplifyBitwise(expr)
    expr = foldConstants(expr)
  } while (expr !== prev)

  return expr
}

function simplifyMath(expr) {
  try {
    return nerdamer(expr).simplify().toString()
  } catch {
    return expr
  }
}

function simplifyBitwise(expr) {
  return expr

    // x & x -> x
    .replace(/\b([a-zA-Z_]\w*)\s*&\s*\1\b/g, "$1")

    // x | x -> x
    .replace(/\b([a-zA-Z_]\w*)\s*\|\s*\1\b/g, "$1")

    // x ^ x -> 0
    .replace(/\b([a-zA-Z_]\w*)\s*\^\s*\1\b/g, "0")

    // x & 0 -> 0
    .replace(/\b([a-zA-Z_]\w*)\s*&\s*0\b/g, "0")
    .replace(/\b0\s*&\s*([a-zA-Z_]\w*)\b/g, "0")

    // x | 0 -> x
    .replace(/\b([a-zA-Z_]\w*)\s*\|\s*0\b/g, "$1")
    .replace(/\b0\s*\|\s*([a-zA-Z_]\w*)\b/g, "$1")

    // x ^ 0 -> x
    .replace(/\b([a-zA-Z_]\w*)\s*\^\s*0\b/g, "$1")
    .replace(/\b0\s*\^\s*([a-zA-Z_]\w*)\b/g, "$1")

    // >>0  <<0
    .replace(/>>\s*0\b/g, "")
    .replace(/<<\s*0\b/g, "")

    // (expr)&expr
    .replace(/\(([^()]+)\)\s*&\s*\1/g, "$1")

    // (expr)|expr
    .replace(/\(([^()]+)\)\s*\|\s*\1/g, "$1")

    // (expr)^expr
    .replace(/\(([^()]+)\)\s*\^\s*\1/g, "0")

    // (t>>a)>>b  -> t>>(a+b)
    .replace(/\(?(t)\s*>>\s*(\d+)\)?\s*>>\s*(\d+)/g, (_, t, a, b) => {
      return `${t}>>${Number(a) + Number(b)}`
    })

    // (t>>a)&255 -> t>>a
    .replace(/\(?(t\s*>>\s*\d+)\)?\s*&\s*255\b/g, "$1")

    // (t>>a)%256 -> t>>a
    .replace(/\(?(t\s*>>\s*\d+)\)?\s*%\s*256\b/g, "$1")
}

function foldConstants(expr) {

  // bitwise
  expr = expr.replace(/\b(\d+)\s*&\s*(\d+)\b/g, (_, a, b) => Number(a) & Number(b))
  expr = expr.replace(/\b(\d+)\s*\|\s*(\d+)\b/g, (_, a, b) => Number(a) | Number(b))
  expr = expr.replace(/\b(\d+)\s*\^\s*(\d+)\b/g, (_, a, b) => Number(a) ^ Number(b))

  // shifts
  expr = expr.replace(/\b(\d+)\s*>>\s*(\d+)\b/g, (_, a, b) => Number(a) >> Number(b))
  expr = expr.replace(/\b(\d+)\s*<<\s*(\d+)\b/g, (_, a, b) => Number(a) << Number(b))

  // arithmetic
  expr = expr.replace(/\b(\d+)\s*\+\s*(\d+)\b/g, (_, a, b) => Number(a) + Number(b))
  expr = expr.replace(/\b(\d+)\s*-\s*(\d+)\b/g, (_, a, b) => Number(a) - Number(b))
  expr = expr.replace(/\b(\d+)\s*\*\s*(\d+)\b/g, (_, a, b) => Number(a) * Number(b))

  expr = expr.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_, a, b) => {
    const res = Number(a) / Number(b)
    return Number.isInteger(res) ? res : `${a}/${b}`
  })

  expr = expr.replace(/\b(\d+)\s*%\s*(\d+)\b/g, (_, a, b) => Number(a) % Number(b))

  return expr
}