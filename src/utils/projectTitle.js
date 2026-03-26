export const DEFAULT_PROJECT_TITLE = 'New Project'

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g

export function normalizeProjectTitle(value, fallback = DEFAULT_PROJECT_TITLE) {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalizedValue = value.replace(/\s+/g, ' ').trim()
  return normalizedValue || fallback
}

export function sanitizeProjectTitleForFilename(value, fallback = DEFAULT_PROJECT_TITLE) {
  const normalizedTitle = normalizeProjectTitle(value, fallback)
  const withoutInvalidChars = normalizedTitle.replace(INVALID_FILENAME_CHARS, ' ').replace(/\s+/g, ' ').trim()
  return withoutInvalidChars || fallback
}

export function createProjectFilenameFromTitle(projectTitle, extension) {
  const normalizedExtension = String(extension || '').replace(/^\.+/, '').toLowerCase()

  if (!normalizedExtension) {
    return sanitizeProjectTitleForFilename(projectTitle)
  }

  return `${sanitizeProjectTitleForFilename(projectTitle)}.${normalizedExtension}`
}