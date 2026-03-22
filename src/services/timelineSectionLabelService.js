export const DEFAULT_TIMELINE_SECTION_LABEL_NAME_PREFIX = 'Section'

export function createTimelineSectionLabelId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `timeline-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeTimelineSectionLabelName(
  value,
  fallback = DEFAULT_TIMELINE_SECTION_LABEL_NAME_PREFIX
) {
  const trimmedValue = typeof value === 'string' ? value.trim() : ''
  return trimmedValue || fallback
}

export function getNextTimelineSectionLabelName(timelineSectionLabels = []) {
  const usedNames = new Set(
    Array.isArray(timelineSectionLabels)
      ? timelineSectionLabels
          .map((label) => normalizeTimelineSectionLabelName(label?.name, ''))
          .filter(Boolean)
      : []
  )

  let index = 1

  while (usedNames.has(`${DEFAULT_TIMELINE_SECTION_LABEL_NAME_PREFIX} ${index}`)) {
    index += 1
  }

  return `${DEFAULT_TIMELINE_SECTION_LABEL_NAME_PREFIX} ${index}`
}

export function createTimelineSectionLabel(label = {}) {
  return {
    id: typeof label.id === 'string' && label.id ? label.id : createTimelineSectionLabelId(),
    name: normalizeTimelineSectionLabelName(label.name),
    time: normalizeTimelineSectionLabelTime(label.time)
  }
}

export function normalizeTimelineSectionLabelTime(value, fallback = 0) {
  const numericValue = Number(value)
  const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : 0
  return Math.max(0, Number.isFinite(numericValue) ? numericValue : fallbackValue)
}

export function normalizeTimelineSectionLabels(timelineSectionLabels = []) {
  if (!Array.isArray(timelineSectionLabels)) {
    return []
  }

  return timelineSectionLabels
    .filter((label) => label && typeof label === 'object' && !Array.isArray(label))
    .map((label) => createTimelineSectionLabel(label))
    .sort((leftLabel, rightLabel) => leftLabel.time - rightLabel.time)
}

export function sortTimelineSectionLabels(timelineSectionLabels = []) {
  timelineSectionLabels.sort((leftLabel, rightLabel) => leftLabel.time - rightLabel.time)
  return timelineSectionLabels
}

export function getTimelineSectionLabelById(timelineSectionLabels = [], labelId) {
  if (typeof labelId !== 'string' || !labelId) {
    return null
  }

  return timelineSectionLabels.find((label) => label?.id === labelId) ?? null
}
