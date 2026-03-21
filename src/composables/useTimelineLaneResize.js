import { onBeforeUnmount } from 'vue'

export function useTimelineLaneResize({
  dawStore,
  getHeight,
  historyLabel = 'resize-timeline-lane',
  setHeight
}) {
  let resizePointerId = null
  let resizeHistoryActive = false
  let resizeStartClientY = 0
  let resizeStartHeight = 0
  let resizeInitialHeight = 0

  function handleResizePointerDown(event) {
    if (event.button !== 0 || typeof setHeight !== 'function' || typeof getHeight !== 'function') {
      return
    }

    event.preventDefault()

    resizePointerId = event.pointerId
    resizeStartClientY = event.clientY
    resizeStartHeight = Number(getHeight()) || 0
    resizeInitialHeight = resizeStartHeight

    dawStore.beginHistoryTransaction(historyLabel)
    resizeHistoryActive = Boolean(dawStore.historyTransaction)

    window.addEventListener('pointermove', handleResizePointerMove)
    window.addEventListener('pointerup', handleResizePointerUp)
    window.addEventListener('pointercancel', handleResizePointerCancel)
  }

  function handleResizePointerMove(event) {
    if (resizePointerId !== event.pointerId) {
      return
    }

    setHeight(resizeStartHeight + (event.clientY - resizeStartClientY))
  }

  function handleResizePointerUp(event) {
    if (resizePointerId !== event.pointerId) {
      return
    }

    if (resizeHistoryActive) {
      dawStore.commitHistoryTransaction()
    }

    cleanupResize()
  }

  function handleResizePointerCancel(event) {
    if (resizePointerId !== event.pointerId) {
      return
    }

    setHeight(resizeInitialHeight)

    if (resizeHistoryActive) {
      dawStore.cancelHistoryTransaction()
    }

    cleanupResize()
  }

  function cleanupResize() {
    resizePointerId = null
    resizeHistoryActive = false
    resizeStartClientY = 0
    resizeStartHeight = 0
    resizeInitialHeight = 0
    window.removeEventListener('pointermove', handleResizePointerMove)
    window.removeEventListener('pointerup', handleResizePointerUp)
    window.removeEventListener('pointercancel', handleResizePointerCancel)
  }

  onBeforeUnmount(() => {
    cleanupResize()
  })

  return {
    cleanupResize,
    handleResizePointerDown
  }
}
