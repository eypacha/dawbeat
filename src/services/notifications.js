import { reactive } from 'vue'

const DEFAULT_VARIANT = 'info'
const DEFAULT_DURATION = 3000
const VALID_VARIANTS = new Set(['info', 'success', 'warning', 'error'])

export const notifications = reactive([])

export function enqueueSnackbar(message, options = {}) {
  const persistent = options.duration === null
  const notification = {
    id: createNotificationId(),
    message: typeof message === 'string' ? message : String(message ?? ''),
    variant: VALID_VARIANTS.has(options.variant) ? options.variant : DEFAULT_VARIANT,
    persistent,
    duration: persistent ? null : normalizeDuration(options.duration)
  }

  notifications.push(notification)

  if (!persistent) {
    window.setTimeout(() => {
      removeSnackbar(notification.id)
    }, notification.duration)
  }

  return notification.id
}

export function removeSnackbar(notificationId) {
  const index = notifications.findIndex((notification) => notification.id === notificationId)

  if (index === -1) {
    return
  }

  notifications.splice(index, 1)
}

function normalizeDuration(duration) {
  const numericDuration = Number(duration)

  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    return DEFAULT_DURATION
  }

  return numericDuration
}

function createNotificationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `snackbar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
