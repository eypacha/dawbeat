import { computed, onBeforeUnmount, ref } from 'vue'

function getSelectionRect(startX, startY, currentX, currentY) {
  return {
    left: Math.min(startX, currentX),
    top: Math.min(startY, currentY),
    right: Math.max(startX, currentX),
    bottom: Math.max(startY, currentY)
  }
}

function intersectsSelectionRect(selectionRect, targetRect) {
  return !(
    selectionRect.right < targetRect.left ||
    selectionRect.left > targetRect.right ||
    selectionRect.bottom < targetRect.top ||
    selectionRect.top > targetRect.bottom
  )
}

export function useTimelineMarqueeSelection({
  dawStore,
  editingClipId,
  timelineSurfaceElement
}) {
  const active = ref(false)
  const rect = ref(null)

  let startClientX = 0
  let startClientY = 0
  let startSurfaceX = 0
  let startSurfaceY = 0

  const marqueeStyle = computed(() => {
    if (!rect.value) {
      return null
    }

    return {
      left: `${rect.value.x}px`,
      top: `${rect.value.y}px`,
      width: `${Math.max(1, rect.value.width)}px`,
      height: `${Math.max(1, rect.value.height)}px`,
      backgroundColor: 'rgba(56, 189, 248, 0.18)',
      border: '1px solid rgba(56, 189, 248, 0.95)',
      boxShadow: '0 0 0 1px rgba(186, 230, 253, 0.35) inset'
    }
  })

  function handleSurfacePointerDown(event) {
    if (
      event.button !== 0 ||
      !event.shiftKey ||
      editingClipId.value ||
      !timelineSurfaceElement.value
    ) {
      return false
    }

    const laneElement = event.target instanceof Element
      ? event.target.closest('[data-timeline-track-lane="true"]')
      : null
    const clipElement = event.target instanceof Element
      ? event.target.closest('[data-timeline-clip="true"]')
      : null

    if (!(laneElement instanceof HTMLElement) || clipElement) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()

    const surfaceRect = timelineSurfaceElement.value.getBoundingClientRect()
    startClientX = event.clientX
    startClientY = event.clientY
    startSurfaceX = event.clientX - surfaceRect.left
    startSurfaceY = event.clientY - surfaceRect.top

    active.value = true
    rect.value = {
      x: startSurfaceX,
      y: startSurfaceY,
      width: 0,
      height: 0
    }

    dawStore.setSelectedClips([])
    updateSelection(event)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return true
  }

  function handlePointerMove(event) {
    if (!active.value || !timelineSurfaceElement.value) {
      return
    }

    updateSelection(event)
  }

  function handlePointerUp(event) {
    if (!active.value) {
      return
    }

    updateSelection(event)
    cleanupSelection()
  }

  function handlePointerCancel() {
    if (!active.value) {
      return
    }

    cleanupSelection()
  }

  function updateSelection(event) {
    if (!timelineSurfaceElement.value) {
      return
    }

    const surfaceRect = timelineSurfaceElement.value.getBoundingClientRect()
    const currentSurfaceX = event.clientX - surfaceRect.left
    const currentSurfaceY = event.clientY - surfaceRect.top
    const selectionRect = getSelectionRect(startClientX, startClientY, event.clientX, event.clientY)

    rect.value = {
      x: Math.min(startSurfaceX, currentSurfaceX),
      y: Math.min(startSurfaceY, currentSurfaceY),
      width: Math.abs(currentSurfaceX - startSurfaceX),
      height: Math.abs(currentSurfaceY - startSurfaceY)
    }

    const selectedClipIds = [...timelineSurfaceElement.value.querySelectorAll('[data-timeline-clip="true"][data-clip-id]')]
      .filter((clipElement) => intersectsSelectionRect(selectionRect, clipElement.getBoundingClientRect()))
      .map((clipElement) => clipElement.dataset.clipId)
      .filter(Boolean)

    dawStore.setSelectedClips(selectedClipIds)
  }

  function cleanupSelection() {
    active.value = false
    rect.value = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)
  }

  onBeforeUnmount(() => {
    cleanupSelection()
  })

  return {
    active,
    handleSurfacePointerDown,
    marqueeStyle,
  }
}
