import { ref } from 'vue'
import { usePointerEdgeAutoScroll } from '@/composables/usePointerEdgeAutoScroll'
import { getDraggedTick } from '@/services/snapService'
import { clampClipPlacementStart } from '@/services/timelineService'

const DUPLICATE_DRAG_THRESHOLD_PX = 6
const DRAG_SELECTION_THRESHOLD_PX = 3

export function useTimelineClipInteraction({
  allowCrossLane = true,
  clip,
  dawStore,
  editingClipId,
  getLaneId = (lane) => lane?.id,
  laneId,
  lanes,
  onSelect,
  pixelsPerTick,
  selectedClipIds,
  trackId,
  tracks,
  duplicateClipInLane = (currentLaneId, clipId) => dawStore.duplicateClip(currentLaneId, clipId),
  duplicateSelectedClips = (anchorClipId) => dawStore.duplicateSelectedClips(anchorClipId),
  moveClipInLane = (currentLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveClip(currentLaneId, clipId, nextStart, shouldSnap),
  moveClipToLane = (sourceLaneId, targetLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveClipToTrack(sourceLaneId, targetLaneId, clipId, nextStart, shouldSnap),
  moveSelectedClips = (anchorClipId, nextStart, shouldSnap) =>
    dawStore.moveSelectedClips(anchorClipId, nextStart, shouldSnap),
  placeClipInLane = (currentLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.placeClip(currentLaneId, clipId, nextStart, shouldSnap),
  resizeClipEndInLane = (currentLaneId, clipId, nextEnd, shouldSnap) =>
    dawStore.resizeClipEnd(currentLaneId, clipId, nextEnd, shouldSnap),
  resizeClipStartInLane = (currentLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.resizeClipStart(currentLaneId, clipId, nextStart, shouldSnap)
}) {
  const resolvedLaneId = laneId ?? trackId
  const resolvedLanes = lanes ?? tracks
  const isDragging = ref(false)
  const resizeMode = ref(null)
  const duplicateDrag = ref(false)
  const ignoreNextClick = ref(false)

  let dragStartX = 0
  let dragStartY = 0
  let dragStartTick = 0
  let dragDesiredStart = 0
  let dragTargetLaneId = resolvedLaneId
  let dragClipId = clip.id
  let dragSelectedClipIds = [clip.id]
  let dragSourceLaneId = resolvedLaneId
  let interactionScrollContainer = null
  let interactionStartScrollLeft = 0
  let deferSelectionOnPointerDown = false
  let duplicateDragActivated = false
  let hasActiveHistoryTransaction = false
  let clipWasSelectedOnPointerDown = false
  let resizeStartTick = 0
  let resizeEndTick = 0
  const { startAutoScroll, stopAutoScroll, updateAutoScroll } = usePointerEdgeAutoScroll({
    onScroll: syncInteractionFromPointerState
  })

  function handlePointerDown(event) {
    if (!startInteraction(event, { horizontal: true, vertical: true })) {
      return
    }

    dragClipId = clip.id
    clipWasSelectedOnPointerDown = selectedClipIds.value.includes(clip.id)
    dragSelectedClipIds = clipWasSelectedOnPointerDown ? [...selectedClipIds.value] : [clip.id]
    dragStartTick = clip.start
    dragDesiredStart = clip.start
    dragSourceLaneId = resolvedLaneId
    dragTargetLaneId = resolvedLaneId
    duplicateDrag.value = event.altKey === true
    duplicateDragActivated = false
    deferSelectionOnPointerDown = event.shiftKey === true

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
    } else if (!deferSelectionOnPointerDown) {
      onSelect({ preserveMultiSelection: dragSelectedClipIds.length > 1 })
    }

    isDragging.value = true
  }

  function handleResizeStartPointerDown(event) {
    if (!startInteraction(event, { horizontal: true, vertical: false })) {
      return
    }

    onSelect()
    resizeMode.value = 'start'
    resizeStartTick = clip.start
    resizeEndTick = clip.start + clip.duration
    beginHistoryTransaction('resize-clip-start')
  }

  function handleResizeEndPointerDown(event) {
    if (!startInteraction(event, { horizontal: true, vertical: false })) {
      return
    }

    onSelect()
    resizeMode.value = 'end'
    resizeEndTick = clip.start + clip.duration
    beginHistoryTransaction('resize-clip-end')
  }

  function startInteraction(event, autoScrollAxes) {
    if (event.button !== 0 || editingClipId.value) {
      return false
    }

    event.preventDefault()
    dragStartX = event.clientX
    dragStartY = event.clientY
    interactionScrollContainer = getInteractionScrollContainer(event)
    interactionStartScrollLeft = interactionScrollContainer?.scrollLeft ?? 0

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    startAutoScroll(event, interactionScrollContainer, autoScrollAxes)

    return true
  }

  function handlePointerMove(event) {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    syncInteractionFromPointerState(event)
    updateAutoScroll(event)
  }

  function handlePointerUp(event) {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    const shouldClearDuplicateClickGuard = ignoreNextClick.value
    const shouldSnap = event.shiftKey !== true

    if (isDragging.value) {
      if (dragSelectedClipIds.length > 1) {
        if (duplicateDrag.value && duplicateDragActivated) {
          const duplicatedClipIds = duplicateSelectedClips(dragClipId)
          const dragClipIndex = dragSelectedClipIds.indexOf(dragClipId)
          const duplicatedAnchorClipId =
            duplicatedClipIds[dragClipIndex] ?? duplicatedClipIds[0] ?? null

          if (duplicatedAnchorClipId) {
            moveSelectedClips(duplicatedAnchorClipId, dragDesiredStart, shouldSnap)
          }
        }
      } else if (duplicateDrag.value && duplicateDragActivated) {
        const duplicateClipId = duplicateClipInLane(dragSourceLaneId, clip.id)

        if (duplicateClipId) {
          const previewStart = getDuplicatePreviewStart(dragTargetLaneId, shouldSnap)

          if (dragTargetLaneId === dragSourceLaneId) {
            placeClipInLane(dragSourceLaneId, duplicateClipId, previewStart, shouldSnap)
          } else {
            moveClipToLane(
              dragSourceLaneId,
              dragTargetLaneId,
              duplicateClipId,
              previewStart,
              shouldSnap
            )
          }
        }
      } else if (dragTargetLaneId !== dragSourceLaneId) {
        moveClipToLane(dragSourceLaneId, dragTargetLaneId, dragClipId, dragDesiredStart, shouldSnap)
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
      resizeClipStartInLane(resolvedLaneId, clip.id, resizeStartTick, false)
    } else if (resizeMode.value === 'end') {
      resizeClipEndInLane(resolvedLaneId, clip.id, resizeEndTick, false)
    } else if (isDragging.value && dragSelectedClipIds.length > 1 && !duplicateDrag.value) {
      moveSelectedClips(dragClipId, dragStartTick, false)
    } else if (isDragging.value && !duplicateDrag.value) {
      moveClipInLane(dragSourceLaneId, dragClipId, dragStartTick, false)
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
    dragSourceLaneId = resolvedLaneId
    dragDesiredStart = clip.start
    dragStartTick = clip.start
    dragTargetLaneId = resolvedLaneId
    interactionScrollContainer = null
    interactionStartScrollLeft = 0
    deferSelectionOnPointerDown = false
    hasActiveHistoryTransaction = false
    clipWasSelectedOnPointerDown = false
    stopAutoScroll()
    removeInteractionListeners()
  }

  function syncInteractionFromPointerState(pointerState) {
    if (!isDragging.value && !resizeMode.value) {
      return
    }

    const deltaX = getHorizontalPointerDelta(pointerState.clientX)
    const dragDistance = Math.hypot(deltaX, pointerState.clientY - dragStartY)
    const deltaTicks = deltaX / pixelsPerTick.value
    const shouldSnap = pointerState.shiftKey !== true

    if (isDragging.value) {
      if (deferSelectionOnPointerDown && dragDistance > DRAG_SELECTION_THRESHOLD_PX) {
        if (!clipWasSelectedOnPointerDown) {
          onSelect({ disableShiftToggle: true })
        }

        deferSelectionOnPointerDown = false
      }

      if (duplicateDrag.value && !duplicateDragActivated) {
        if (dragDistance <= DUPLICATE_DRAG_THRESHOLD_PX) {
          return
        }

        duplicateDragActivated = true
      }

      dragDesiredStart = getDraggedTick(dragStartTick + deltaTicks, shouldSnap)
      dragTargetLaneId =
        dragSelectedClipIds.length > 1 ? dragSourceLaneId : getDragTargetLaneId(pointerState)

      if (dragSelectedClipIds.length > 1) {
        if (!duplicateDrag.value) {
          moveSelectedClips(dragClipId, dragDesiredStart, shouldSnap)
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
      resizeClipStartInLane(resolvedLaneId, clip.id, resizeStartTick + deltaTicks, shouldSnap)
      return
    }

    resizeClipEndInLane(resolvedLaneId, clip.id, resizeEndTick + deltaTicks, shouldSnap)
  }

  function getHorizontalPointerDelta(clientX) {
    const scrollLeft = interactionScrollContainer?.scrollLeft ?? interactionStartScrollLeft
    return clientX - dragStartX + (scrollLeft - interactionStartScrollLeft)
  }

  function getInteractionScrollContainer(event) {
    const target = event.target instanceof Element ? event.target : null
    const scrollContainer = target?.closest('[data-timeline-scroll-container="true"]')

    return scrollContainer instanceof HTMLElement ? scrollContainer : null
  }

  function getDragTargetLaneId(event) {
    if (!allowCrossLane) {
      return resolvedLaneId
    }

    const targetLaneElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-clip-lane-id]')

    if (!(targetLaneElement instanceof HTMLElement)) {
      return resolvedLaneId
    }

    const nextLaneId = targetLaneElement.dataset.clipLaneId
    const laneExists = resolvedLanes.value.some((laneEntry) => getLaneId(laneEntry) === nextLaneId)

    return laneExists && nextLaneId ? nextLaneId : resolvedLaneId
  }

  function getDuplicatePreviewStart(targetLaneId, shouldSnap = true) {
    const targetLane = resolvedLanes.value.find((laneEntry) => getLaneId(laneEntry) === targetLaneId)

    if (!targetLane) {
      return dragDesiredStart
    }

    return clampClipPlacementStart(
      targetLane,
      getDraggedTick(dragDesiredStart, shouldSnap),
      clip.duration
    )
  }

  function syncDragPreview(shouldSnap = true) {
    if (duplicateDrag.value) {
      dawStore.setClipDragPreview({
        clipId: `duplicate-preview-${clip.id}`,
        duration: clip.duration,
        sourceLaneId: dragSourceLaneId,
        sourceTrackId: dragSourceLaneId,
        start: getDuplicatePreviewStart(dragTargetLaneId, shouldSnap),
        targetLaneId: dragTargetLaneId,
        targetTrackId: dragTargetLaneId
      })
      return
    }

    if (dragTargetLaneId === dragSourceLaneId) {
      dawStore.clearClipDragPreview()
      return
    }

    const targetLane = resolvedLanes.value.find((laneEntry) => getLaneId(laneEntry) === dragTargetLaneId)

    if (!targetLane) {
      dawStore.clearClipDragPreview()
      return
    }

    dawStore.setClipDragPreview({
      clipId: dragClipId,
      duration: clip.duration,
      sourceLaneId: dragSourceLaneId,
      sourceTrackId: dragSourceLaneId,
      start: clampClipPlacementStart(
        targetLane,
        getDraggedTick(dragDesiredStart, shouldSnap),
        clip.duration
      ),
      targetLaneId: dragTargetLaneId,
      targetTrackId: dragTargetLaneId
    })
  }

  function syncSourceClipPosition(shouldSnap = true) {
    if (dragTargetLaneId === dragSourceLaneId) {
      moveClipInLane(dragSourceLaneId, dragClipId, dragDesiredStart, shouldSnap)
      return
    }

    moveClipInLane(dragSourceLaneId, dragClipId, dragStartTick, shouldSnap)
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
