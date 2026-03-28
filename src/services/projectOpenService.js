import { importProjectFile } from '@/services/projectPersistence'

export function hasFileDragPayload(dataTransfer) {
  if (!dataTransfer?.types) {
    return false
  }

  return Array.from(dataTransfer.types).includes('Files')
}

export function getFirstDraggedFile(dataTransfer) {
  return dataTransfer?.files?.[0] ?? null
}

export async function replaceCurrentProject({ dawStore, project, stopPlayback } = {}) {
  if (!dawStore || typeof dawStore.applyProject !== 'function') {
    throw new Error('A valid DawBeat store instance is required to replace the current project.')
  }

  if (typeof stopPlayback === 'function') {
    await stopPlayback()
  }

  dawStore.applyProject(project)
  return project
}

export async function openProjectFile({ dawStore, file, stopPlayback } = {}) {
  let project = null

  try {
    project = await importProjectFile(file)
  } catch (error) {
    const importError = new Error('Invalid project file')
    importError.code = 'invalid-project-file'
    importError.cause = error
    throw importError
  }

  try {
    await replaceCurrentProject({
      dawStore,
      project,
      stopPlayback
    })
  } catch (error) {
    const openError = new Error('Could not open the project.')
    openError.code = 'project-open-failed'
    openError.cause = error
    throw openError
  }

  return project
}
