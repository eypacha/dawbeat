import { onBeforeUnmount } from 'vue'

const EDGE_PADDING_PX = 72
const MIN_SCROLL_STEP_PX = 4
const MAX_SCROLL_STEP_PX = 28

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getScrollStep(distanceToEdge) {
  const clampedDistance = clamp(distanceToEdge, 0, EDGE_PADDING_PX)
  const intensity = (EDGE_PADDING_PX - clampedDistance) / EDGE_PADDING_PX

  if (intensity <= 0) {
    return 0
  }

  return MIN_SCROLL_STEP_PX + (MAX_SCROLL_STEP_PX - MIN_SCROLL_STEP_PX) * intensity * intensity
}

function getAxisDelta(pointerPosition, startEdge, endEdge) {
  if (pointerPosition <= startEdge + EDGE_PADDING_PX) {
    return -getScrollStep(pointerPosition - startEdge)
  }

  if (pointerPosition >= endEdge - EDGE_PADDING_PX) {
    return getScrollStep(endEdge - pointerPosition)
  }

  return 0
}

function extractPointerState(event) {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: event.shiftKey === true
  }
}

export function usePointerEdgeAutoScroll({ onScroll } = {}) {
  let active = false
  let container = null
  let frameId = null
  let pointerState = null
  let axes = { horizontal: true, vertical: true }

  function startAutoScroll(event, nextContainer, nextAxes = { horizontal: true, vertical: true }) {
    stopAutoScroll()

    if (!(nextContainer instanceof HTMLElement)) {
      return
    }

    active = true
    container = nextContainer
    axes = {
      horizontal: nextAxes.horizontal !== false,
      vertical: nextAxes.vertical !== false
    }
    pointerState = extractPointerState(event)
    ensureFrame()
  }

  function updateAutoScroll(event) {
    if (!active) {
      return
    }

    pointerState = extractPointerState(event)
    ensureFrame()
  }

  function stopAutoScroll() {
    active = false
    container = null
    pointerState = null
    axes = { horizontal: true, vertical: true }

    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  function ensureFrame() {
    if (!active || frameId !== null) {
      return
    }

    frameId = requestAnimationFrame(runFrame)
  }

  function runFrame() {
    frameId = null

    if (!active || !(container instanceof HTMLElement) || !pointerState) {
      return
    }

    const rect = container.getBoundingClientRect()
    const horizontalDelta = axes.horizontal ? getAxisDelta(pointerState.clientX, rect.left, rect.right) : 0
    const verticalDelta = axes.vertical ? getAxisDelta(pointerState.clientY, rect.top, rect.bottom) : 0

    if (horizontalDelta === 0 && verticalDelta === 0) {
      return
    }

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const nextScrollLeft = clamp(container.scrollLeft + horizontalDelta, 0, maxScrollLeft)
    const nextScrollTop = clamp(container.scrollTop + verticalDelta, 0, maxScrollTop)
    const scrollChanged = nextScrollLeft !== container.scrollLeft || nextScrollTop !== container.scrollTop

    if (scrollChanged) {
      container.scrollLeft = nextScrollLeft
      container.scrollTop = nextScrollTop
      onScroll?.(pointerState)
    }

    if (scrollChanged) {
      ensureFrame()
    }
  }

  onBeforeUnmount(() => {
    stopAutoScroll()
  })

  return {
    startAutoScroll,
    stopAutoScroll,
    updateAutoScroll
  }
}
