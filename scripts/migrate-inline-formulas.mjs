import { readFileSync, writeFileSync } from 'node:fs'

const paths = [
  'src/data/demo.json',
  'src/data/demo-boss-level.json',
  'src/data/demo-stereo-madness.json'
]

function applyFormulaToClip(clip, formula) {
  if (!formula) {
    return
  }

  clip.formula = typeof formula.code === 'string' ? formula.code : ''
  clip.formulaStereo = Boolean(formula.stereo)
  clip.leftFormula = typeof formula.leftCode === 'string' ? formula.leftCode : clip.formula
  clip.rightFormula = typeof formula.rightCode === 'string' ? formula.rightCode : clip.formula

  if (typeof formula.name === 'string' && formula.name.trim()) {
    clip.formulaName = formula.name
  }
}

for (const path of paths) {
  const raw = readFileSync(path, 'utf8')
  const project = JSON.parse(raw)
  const formulas = Array.isArray(project.formulas) ? project.formulas : []
  const formulasById = new Map(formulas.map((formula) => [formula.id, formula]))

  for (const track of Array.isArray(project.tracks) ? project.tracks : []) {
    for (const clip of Array.isArray(track.clips) ? track.clips : []) {
      const referencedFormula =
        typeof clip.formulaId === 'string' && clip.formulaId
          ? formulasById.get(clip.formulaId) ?? null
          : null

      applyFormulaToClip(clip, referencedFormula)
      delete clip.formulaId
    }
  }

  delete project.formulas
  writeFileSync(path, `${JSON.stringify(project, null, 2)}\n`, 'utf8')
}
