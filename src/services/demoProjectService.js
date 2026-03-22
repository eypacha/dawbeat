const demoProjectModules = import.meta.glob('../data/*.json', {
  eager: true,
  import: 'default'
})

const DEMO_PROJECT_ENTRIES = Object.entries(demoProjectModules)
  .map(([path, project]) => {
    const filename = path.split('/').pop() ?? ''
    const id = filename.replace(/\.json$/i, '')

    return {
      id,
      name: formatDemoProjectName(id),
      path,
      project
    }
  })
  .sort((leftEntry, rightEntry) => {
    if (leftEntry.id === 'demo') {
      return -1
    }

    if (rightEntry.id === 'demo') {
      return 1
    }

    return leftEntry.name.localeCompare(rightEntry.name)
  })

export function getDemoProjectEntries() {
  return DEMO_PROJECT_ENTRIES
}

export function getDefaultDemoProjectEntry() {
  return DEMO_PROJECT_ENTRIES[0] ?? null
}

export function getRandomDemoProjectEntry({ excludeId = null } = {}) {
  const entries = typeof excludeId === 'string' && DEMO_PROJECT_ENTRIES.length > 1
    ? DEMO_PROJECT_ENTRIES.filter((entry) => entry.id !== excludeId)
    : DEMO_PROJECT_ENTRIES

  if (!entries.length) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * entries.length)
  return entries[randomIndex] ?? null
}

function formatDemoProjectName(id = '') {
  const normalizedId = typeof id === 'string' ? id.replace(/^demo-?/i, '') : ''

  if (!normalizedId) {
    return 'Demo'
  }

  return normalizedId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
