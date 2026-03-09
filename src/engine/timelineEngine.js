import { resolveClipFormula } from '@/services/formulaService'

export function getActiveFormula(timeTicks, tracks, formulas) {
  const activeFormulas = []

  for (const track of tracks) {
    if (track.muted) {
      continue
    }

    for (const clip of track.clips) {
      if (timeTicks >= clip.start && timeTicks < clip.start + clip.duration) {
        const resolvedFormula = resolveClipFormula(clip, formulas)

        if (!resolvedFormula.trim()) {
          continue
        }

        activeFormulas.push(`(${resolvedFormula})`)
      }
    }
  }

  if (!activeFormulas.length) {
    return null
  }

  return activeFormulas.join(' | ')
}
