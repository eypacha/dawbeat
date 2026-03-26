export function generateGroupName(groups = []) {
  let nextIndex = 1

  while ((Array.isArray(groups) ? groups : []).some((group) => group?.name === `Group ${nextIndex}`)) {
    nextIndex += 1
  }

  return `Group ${nextIndex}`
}

export function normalizeClipGroupId(groupId) {
  return typeof groupId === 'string' && groupId ? groupId : null
}

export function createGroupId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
