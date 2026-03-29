export function generateGroupName() {
  return 'Group'
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
