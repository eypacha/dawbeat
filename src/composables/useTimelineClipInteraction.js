import { ref } from 'vue'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { clampClipPlacementStart } from '@/services/timelineService'

const DUPLICATE_DRAG_THRESHOLD_PX = 6

export function useTimelineClipInteraction({
  clip,
  trackId,
  dawStore,
  editingClipId,
  pixelsPerTick,
  selectedClipIds,
  tracks,
  onSelect
}) {
  const isDragging = ref(false)
  const resizeMode = ref(null)
  const duplicateDrag = ref(false)
  const ignoreNextClick = ref(false)

  let dragStartX = 0
  let dragStartY = 0
  let dragStartTick = 0
  let dragDesiredStart = 0
  let dragTargetTrackId = trackId
  let dragClipId = clip.id
  let dragSelectedClipIds = [clip.id]
  let dragSourceTrackId = trackId
  let duplicateDragActivated = false
  let hasActiveHistoryTransaction = false
  let resizeStartTick = 0
  let resizeEndTick = 0

  function handlePointerDown(event) {
    if (!startInteraction(event)) {
      return
    }

    dragClipId = clip.id
    dragSelectedClipIds = selectedClipIds.value.includes(clip.id) ? [...selectedClipIds.value] : [clip.id]
    dragStartTick = clip.start
    dragDesiredStart = clip.start
    dragSourceTrackId = trackId
    dragTargetTrackId = trackId
    duplicateDrag.value = event.altKey === true
    duplicateDragActivated = false

    beginHistoryTransaction(
      duplicateDrag.value
        ? dragSelectedClipIds.length > 1
          ? 'duplicate-selected-clips'
          : 'duplicate-clip'
        : dragSelectedClipIds.length > 1
          ? 'move-selected-clips'
          : 'move-clip'
    )

    if (duplicateDrag.value) {
      ignoreNextClick.value = true
    } else {
      onSelect({ preserveMultiSelection: dragSelectedClipIds.length > 1 })
    }

    isDragging.value = true
  }

  function handleResizeStartPointerDown(event) {
    if (!startInteraction(event)) {
      return
    }

    onSelect()
    resizeMode.value = 'start'
    resizeStartTick = clip.start
    resizeEndTick = clip.start + clip.duration
    beginHistoryTransaction('resize-clip-start')
  }

  function handleResizeEndPointerDown(event) {
    if (!startInteraction(event)) {
      return
    }

    onSelect()
    resizeMode.value = 'end'
    resizeEndTick = clip.start + clip.duration
    beginHistoryTransaction('resize-clip-end')
  }

  function startInteraction(event) {
    if (event.button !== 0 || editingClipId.value) {
      return false
    }

    event.preventDefault()
    dragStartX = event.clientX
    dragStartY = event.clientY

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)

    return true
  }

  function handlePointerMove(event) {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    const dragDistance = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
    const deltaTicks = (event.clientX - dragStartX) / pixelsPerTick.value
    const shouldSnap = shouldSnapFromPointerEvent(event)

    if (isDragging.value) {
      if (duplicateDrag.value && !duplicateDragActivated) {
        if (dragDistance <= DUPLICATE_DRAG_THRESHOLD_PX) {
          return
        }

        duplicateDragActivated = true
      }

      dragDesiredStart = getDraggedTick(dragStartTick + deltaTicks, shouldSnap)
      dragTargetTrackId = dragSelectedClipIds.length > 1 ? dragSourceTrackId : getDragTargetTrackId(event)

      if (dragSelectedClipIds.length > 1) {
        if (!duplicateDrag.value) {
          dawStore.moveSelectedClips(dragClipId, dragDesiredStart, shouldSnap)
        }

        dawStore.clearClipDragPreview()
        return
      }

      if (duplicateDrag.value) {
        syncDragPreview(shouldSnap)
        return
      }

      syncSourceClipPosition(shouldSnap)
      syncDragPreview(shouldSnap)
      return
    }

    if (resizeMode.value === 'start') {
      dawStore.resizeClipStart(trackId, clip.id, resizeStartTick + deltaTicks, shouldSnap)
      return
    }

    dawStore.resizeClipEnd(trackId, clip.id, resizeEndTick + deltaTicks, shouldSnap)
  }

  function handlePointerUp(event) {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    const shouldClearDuplicateClickGuard = ignoreNextClick.value
    const shouldSnap = shouldSnapFromPointerEvent(event)

    if (isDragging.value) {
      if (dragSelectedClipIds.length > 1) {
        if (duplicateDrag.value && duplicateDragActivated) {
          const duplicatedClipIds = dawStore.duplicateSelectedClips(dragClipId)
          const dragClipIndex = dragSelectedClipIds.indexOf(dragClipId)
          const duplicatedAnchorClipId =
            duplicatedClipIds[dragClipIndex] ?? duplicatedClipIds[0] ?? null

          if (duplicatedAnchorClipId) {
            dawStore.moveSelectedClips(duplicatedAnchorClipId, dragDesiredStart, shouldSnap)
          }
        }
      } else if (duplicateDrag.value && duplicateDragActivated) {
        const duplicateClipId = dawStore.duplicateClip(dragSourceTrackId, clip.id)

        if (duplicateClipId) {
          const previewStart = getDuplicatePreviewStart(dragTargetTrackId, shouldSnap)

          if (dragTargetTrackId === dragSourceTrackId) {
            dawStore.placeClip(dragSourceTrackId, duplicateClipId, previewStart, shouldSnap)
          } else {
            dawStore.moveClipToTrack(
              dragSourceTrackId,
              dragTargetTrackId,
              duplicateClipId,
              previewStart,
              shouldSnap
            )
          }
        }
      } else if (!duplicateDrag.value && dragTargetTrackId !== dragSourceTrackId) {
        dawStore.moveClipToTrack(
          dragSourceTrackId,
          dragTargetTrackId,
          dragClipId,
          dragDesiredStart,
          shouldSnap
        )
      }
    }

    dawStore.clearClipDragPreview()
    commitHistoryTransaction()
    cleanupInteraction()

    if (shouldClearDuplicateClickGuard) {
      requestAnimationFrame(() => {
        ignoreNextClick.value = false
      })
    }
  }

  function handlePointerCancel() {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    if (resizeMode.value === 'start') {
      dawStore.updateClip(trackId, clip.id, {
        start: resizeStartTick,
        duration: resizeEndTick - resizeStartTick
      })
    } else if (resizeMode.value === 'end') {
      dawStore.updateClip(trackId, clip.id, {
        duration: resizeEndTick - clip.start
      })
    } else if (isDragging.value && dragSelectedClipIds.length > 1 && !duplicateDrag.value) {
      dawStore.moveSelectedClips(dragClipId, dragStartTick, false)
    } else if (isDragging.value && !duplicateDrag.value) {
      dawStore.moveClip(dragSourceTrackId, dragClipId, dragStartTick, false)
    }

    dawStore.clearClipDragPreview()
    cancelHistoryTransaction()
    cleanupInteraction()

    if (ignoreNextClick.value) {
      requestAnimationFrame(() => {
        ignoreNextClick.value = false
      })
    }
  }

  function cleanupInteraction() {
    isDragging.value = false
    resizeMode.value = null
    duplicateDrag.value = false
    duplicateDragActivated = false
    dragClipId = clip.id
    dragSelectedClipIds = [clip.id]
    dragSourceTrackId = trackId
    dragDesiredStart = clip.start
    dragStartTick = clip.start
    dragTargetTrackId = trackId
    hasActiveHistoryTransaction = false
    removeInteractionListeners()
  }

  function getDragTargetTrackId(event) {
    const targetTrackElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-track-id]')

    if (!(targetTrackElement instanceof HTMLElement)) {
      return trackId
    }

    const nextTrackId = targetTrackElement.dataset.trackId
    const trackExists = tracks.value.some((trackEntry) => trackEntry.id === nextTrackId)

    return trackExists && nextTrackId ? nextTrackId : trackId
  }

  function getDuplicatePreviewStart(targetTrackId, shouldSnap = true) {
    const targetTrack = tracks.value.find((trackEntry) => trackEntry.id === targetTrackId)

    if (!targetTrack) {
      return dragDesiredStart
    }

    return clampClipPlacementStart(
      targetTrack,
      getDraggedTick(dragDesiredStart, shouldSnap),
      clip.duration
    )
  }

  function syncDragPreview(shouldSnap = true) {
    if (duplicateDrag.value) {
      dawStore.setClipDragPreview({
        clipId: `duplicate-preview-${clip.id}`,
        duration: clip.duration,
        sourceTrackId: dragSourceTrackId,
        start: getDuplicatePreviewStart(dragTargetTrackId, shouldSnap),
        targetTrackId: dragTargetTrackId
      })
      return
    }

    if (dragTargetTrackId === dragSourceTrackId) {
      dawStore.clearClipDragPreview()
      return
    }

    const targetTrack = tracks.value.find((trackEntry) => trackEntry.id === dragTargetTrackId)

    if (!targetTrack) {
      dawStore.clearClipDragPreview()
      return
    }

    dawStore.setClipDragPreview({
      clipId: dragClipId,
      duration: clip.duration,
      sourceTrackId: dragSourceTrackId,
      start: clampClipPlacementStart(
        targetTrack,
        getDraggedTick(dragDesiredStart, shouldSnap),
        clip.duration
      ),
      targetTrackId: dragTargetTrackId
    })
  }

  function syncSourceClipPosition(shouldSnap = true) {
    if (dragTargetTrackId === dragSourceTrackId) {
      dawStore.moveClip(dragSourceTrackId, dragClipId, dragDesiredStart, shouldSnap)
      return
    }

    dawStore.moveClip(dragSourceTrackId, dragClipId, dragStartTick, shouldSnap)
  }

  function removeInteractionListeners() {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)
  }

  function beginHistoryTransaction(label) {
    if (hasActiveHistoryTransaction) {
      return
    }

    dawStore.beginHistoryTransaction(label)
    hasActiveHistoryTransaction = Boolean(dawStore.historyTransaction)
  }

  function commitHistoryTransaction() {
    if (!hasActiveHistoryTransaction) {
      return
    }

    dawStore.commitHistoryTransaction()
    hasActiveHistoryTransaction = false
  }

  function cancelHistoryTransaction() {
    if (!hasActiveHistoryTransaction) {
      return
    }

    dawStore.cancelHistoryTransaction()
    hasActiveHistoryTransaction = false
  }

  return {
    duplicateDrag,
    ignoreNextClick,
    isDragging,
    resizeMode,
    cleanupInteraction,
    handlePointerDown,
    handleResizeEndPointerDown,
    handleResizeStartPointerDown
  }
}
