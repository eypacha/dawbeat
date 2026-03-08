export function getActiveFormula(timeTicks, tracks) {
  const activeFormulas = []

  for (const track of tracks) {
    for (const clip of track.clips) {
      if (timeTicks >= clip.start && timeTicks < clip.start + clip.duration) {
        activeFormulas.push(`(${clip.formula})`)
      }
    }
  }

  if (!activeFormulas.length) {
    return null
  }

  return activeFormulas.join(' | ')
}
