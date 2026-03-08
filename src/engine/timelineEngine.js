export function getActiveFormula(timeTicks, tracks) {
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (timeTicks >= clip.start && timeTicks < clip.start + clip.duration) {
        return clip.formula
      }
    }
  }

  return null
}
