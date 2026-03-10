export function hasSoloTracks(tracks) {
  return tracks.some((track) => Boolean(track.soloed))
}

export function isTrackAudible(track, tracks) {
  if (!track || track.muted) {
    return false
  }

  if (!hasSoloTracks(tracks)) {
    return true
  }

  return Boolean(track.soloed)
}
