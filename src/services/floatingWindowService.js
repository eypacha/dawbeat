import { computed, ref } from 'vue'

const BASE_WINDOW_Z_INDEX = 50
const openWindowOrder = ref([])

let nextWindowId = 0

export function createFloatingWindowId() {
  nextWindowId += 1
  return `floating-window-${nextWindowId}`
}

export function useFloatingWindowStack(windowId) {
  const isTopmostWindow = computed(() => openWindowOrder.value.at(-1) === windowId)
  const zIndex = computed(() => {
    const windowIndex = openWindowOrder.value.indexOf(windowId)

    if (windowIndex === -1) {
      return BASE_WINDOW_Z_INDEX
    }

    return BASE_WINDOW_Z_INDEX + windowIndex
  })

  function activateWindow() {
    openWindowOrder.value = [
      ...openWindowOrder.value.filter((entry) => entry !== windowId),
      windowId
    ]
  }

  function removeWindow() {
    if (!openWindowOrder.value.includes(windowId)) {
      return
    }

    openWindowOrder.value = openWindowOrder.value.filter((entry) => entry !== windowId)
  }

  return {
    activateWindow,
    isTopmostWindow,
    removeWindow,
    zIndex
  }
}
