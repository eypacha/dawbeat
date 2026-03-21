<template>
  <div class="relative flex min-w-full w-max border-b border-zinc-800 bg-zinc-950/45">
    <div
      class="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-2 transition-colors"
      data-context-menu-enabled="true"
      :class="selectedHeaderClassName"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
      @contextmenu="handleContextMenu"
    >
      <span class="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80">[AUT]</span>
      <span class="mt-1 truncate text-sm text-zinc-100">{{ laneLabel }}</span>
    </div>

    <div
      ref="laneElement"
      class="relative shrink-0 overflow-hidden"
      data-automation-lane="true"
      :style="laneStyle"
      @pointerdown="handleLanePointerDown"
    >
      <svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          v-if="pathData"
          :d="pathData"
          fill="none"
          stroke="rgba(52, 211, 153, 0.9)"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>

      <button
        v-for="point in renderedPoints"
        :key="`${lane.id}:${point.index}`"
        class="absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors"
        :class="point.index === selectedPointIndex ? selectedPointClassName : unselectedPointClassName"
        :style="{
          left: `${point.x}px`,
          top: `${point.y}px`
        }"
        :title="`${point.point.time.toFixed(2)} / ${Number(point.point.value ?? 0).toFixed(2)}`"
        data-automation-point="true"
        type="button"
        @pointerdown.stop="handlePointPointerDown($event, point)"
      />
    </div>

    <button
      class="absolute inset-x-0 bottom-0 z-30 h-2 cursor-row-resize"
      title="Resize automation lane height"
      type="button"
      @pointerdown.stop="handleResizePointerDown"
    >
      <span class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-zinc-700/80" />
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineLaneResize } from '@/composables/useTimelineLaneResize'
import { getAutomationLaneConfig } from '@/services/automationService'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_LABEL_WIDTH, clamp, getVisibleTimelineTickStep, pixelsToTicks, ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  lane: {
    type: Object,
    required: true
  },
  timelineWidth: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { pixelsPerTick, selectedAutomationPoint } = storeToRefs(dawStore)
const laneElement = ref(null)

let dragPointerId = null
let dragHistoryActive = false
let dragPointIndex = -1
let dragStartPoint = null

const laneConfig = computed(() => getAutomationLaneConfig(props.lane))
const laneHeight = computed(() => props.lane.height)
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))
const laneLabel = computed(() => laneConfig.value?.label ?? props.lane.id)
const laneStyle = computed(() => ({
  width: props.timelineWidth,
  height: `${laneHeight.value}px`,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.4) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))
const timelineWidthPx = computed(() => Number.parseFloat(props.timelineWidth) || 0)
const selectedPointIndex = computed(() =>
  selectedAutomationPoint.value?.laneId === props.lane.id ? selectedAutomationPoint.value.index : -1
)
const selectedHeaderClassName = computed(() =>
  selectedPointIndex.value >= 0 ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300'
)
const selectedPointClassName =
  'border-emerald-200 bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
const unselectedPointClassName =
  'border-emerald-400/70 bg-zinc-950 text-emerald-200 hover:border-emerald-300 hover:bg-zinc-900'

const { cleanupResize, handleResizePointerDown } = useTimelineLaneResize({
  dawStore,
  getHeight: () => laneHeight.value,
  historyLabel: 'resize-automation-lane-height',
  setHeight: (height) => {
    dawStore.setAutomationLaneHeight(props.lane.id, height)
  }
})

const renderedPoints = computed(() =>
  (props.lane.points ?? [])
    .map((point, index) => ({
      index,
      point,
      x: ticksToPixels(point.time, pixelsPerTick.value),
      y: valueToY(point.value)
    }))
    .sort((leftPoint, rightPoint) => leftPoint.point.time - rightPoint.point.time)
)
const pathData = computed(() => {
  if (!renderedPoints.value.length) {
    return ''
  }

  const pathSegments = renderedPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  const lastPoint = renderedPoints.value[renderedPoints.value.length - 1]

  if (timelineWidthPx.value <= lastPoint.x) {
    return pathSegments.join(' ')
  }

  pathSegments.push(`L ${timelineWidthPx.value} ${lastPoint.y}`)
  return pathSegments.join(' ')
})

function handleLanePointerDown(event) {
  if (event.button !== 0 || !laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-automation-point="true"]')) {
    return
  }

  event.preventDefault()
  dawStore.addAutomationPoint(props.lane.id, getPointFromEvent(event))
}

function handleContextMenu(event) {
  event.preventDefault()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'delete-automation-lane',
        label: 'Delete Automation',
        laneId: props.lane.id
      }
    ]
  })
}

function handlePointPointerDown(event, point) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  dawStore.selectAutomationPoint(props.lane.id, point.index)

  dragPointerId = event.pointerId
  dragHistoryActive = false
  dragPointIndex = point.index
  dragStartPoint = { ...point.point }

  window.addEventListener('pointermove', handlePointPointerMove)
  window.addEventListener('pointerup', handlePointPointerUp)
  window.addEventListener('pointercancel', handlePointPointerCancel)
}

function handlePointPointerMove(event) {
  if (dragPointerId !== event.pointerId || dragPointIndex === -1) {
    return
  }

  if (!dragHistoryActive) {
    dawStore.beginHistoryTransaction('move-automation-point')
    dragHistoryActive = Boolean(dawStore.historyTransaction)
  }

  dawStore.updateAutomationPoint(props.lane.id, dragPointIndex, getPointFromEvent(event))
}

function handlePointPointerUp(event) {
  if (dragPointerId !== event.pointerId) {
    return
  }

  if (dragHistoryActive) {
    dawStore.commitHistoryTransaction()
  }

  cleanupPointDrag()
}

function handlePointPointerCancel(event) {
  if (dragPointerId !== event.pointerId) {
    return
  }

  if (dragHistoryActive && dragStartPoint) {
    dawStore.updateAutomationPoint(props.lane.id, dragPointIndex, dragStartPoint)
    dawStore.cancelHistoryTransaction()
  }

  cleanupPointDrag()
}

function cleanupPointDrag() {
  dragPointerId = null
  dragHistoryActive = false
  dragPointIndex = -1
  dragStartPoint = null
  window.removeEventListener('pointermove', handlePointPointerMove)
  window.removeEventListener('pointerup', handlePointPointerUp)
  window.removeEventListener('pointercancel', handlePointPointerCancel)
}

function getPointFromEvent(event) {
  const laneRect = laneElement.value.getBoundingClientRect()
  const relativeX = Math.max(0, event.clientX - laneRect.left)
  const normalizedLaneHeight = laneHeight.value
  const relativeY = clamp(event.clientY - laneRect.top, 0, normalizedLaneHeight)
  const minValue = laneConfig.value?.min ?? 0
  const maxValue = laneConfig.value?.max ?? 1
  const valueRange = Math.max(0.0001, maxValue - minValue)

  return {
    time: getDraggedTick(
      pixelsToTicks(relativeX, pixelsPerTick.value),
      shouldSnapFromPointerEvent(event)
    ),
    value: clamp(minValue + (1 - relativeY / normalizedLaneHeight) * valueRange, minValue, maxValue)
  }
}

function valueToY(value) {
  const minValue = laneConfig.value?.min ?? 0
  const maxValue = laneConfig.value?.max ?? 1
  const valueRange = Math.max(0.0001, maxValue - minValue)
  const normalizedLaneHeight = laneHeight.value
  return clamp((1 - (value - minValue) / valueRange) * normalizedLaneHeight, 0, normalizedLaneHeight)
}

onBeforeUnmount(() => {
  cleanupPointDrag()
  cleanupResize()
})
</script>
