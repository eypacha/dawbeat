const PROJECT_STORAGE_KEY = 'dawbeat-project'
const PROJECT_VERSION = 1
const SAVE_DEBOUNCE_MS = 400

export function saveProject(state) {
  if (typeof localStorage === 'undefined') {
    return
  }

  const project = {
    version: PROJECT_VERSION,
    tracks: state.tracks,
    formulas: state.formulas,
    zoom: state.zoom,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
    loopEnabled: state.loopEnabled
  }

  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
}

export function loadProject() {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const rawProject = localStorage.getItem(PROJECT_STORAGE_KEY)

  if (!rawProject) {
    return null
  }

  try {
    const project = JSON.parse(rawProject)

    if (!isProjectPayload(project)) {
      return null
    }

    return project
  } catch {
    return null
  }
}

export function setupProjectPersistence(store) {
  let saveTimeoutId = 0

  store.$subscribe(
    (_mutation, state) => {
      window.clearTimeout(saveTimeoutId)
      saveTimeoutId = window.setTimeout(() => {
        saveProject(state)
      }, SAVE_DEBOUNCE_MS)
    },
    { detached: true }
  )
}

function isProjectPayload(project) {
  return (
    project &&
    typeof project === 'object' &&
    project.version === PROJECT_VERSION &&
    Array.isArray(project.tracks) &&
    Array.isArray(project.formulas) &&
    typeof project.zoom === 'number' &&
    typeof project.loopStart === 'number' &&
    typeof project.loopEnd === 'number' &&
    typeof project.loopEnabled === 'boolean'
  )
}
