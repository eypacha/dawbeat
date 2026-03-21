<template>
  <div
    class="timeline-value-tracker-clip absolute inset-y-0 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
    :class="buttonClassName"
    :style="clipStyle"
    :title="clipTitle"
    :data-clip-id="clip.id"
    data-context-menu-enabled="true"
    data-timeline-clip="true"
    @click.stop="handleSelect"
    @contextmenu.stop.prevent="handleContextMenu"
    @dblclick.stop="handleEditStart"
    @pointerdown.stop="handleClipPointerDown"
  >
    <div class="pointer-events-none absolute inset-0 flex items-end gap-px px-2 pb-1 pt-2 opacity-60">
      <span
        v-for="bar in previewBars"
        :key="`${clip.id}:${bar.index}`"
        class="bg-amber-200/70"
        :style="{
          height: `${bar.heightPercent}%`,
          opacity: bar.value === null ? 0 : 1,
          width: `${100 / previewBars.length}%`
        }"
      />
    </div>

    <span
      v-if="isSelected && !isEditing"
      class="timeline-value-tracker-clip-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize border-r"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      v-if="isSelected && !isEditing"
      class="timeline-value-tracker-clip-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize border-l"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <div class="pointer-events-none absolute left-2 right-2 top-1.5 z-[1]">
      <span class="block truncate text-[11px] font-medium leading-none">Value Tracker</span>
      <span class="mt-0.5 block truncate text-[9px] leading-none opacity-80">{{ eventCount }} sets</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import {
  getValueTrackerEventCount,
  getValueTrackerResolvedValues,
  getValueTrackerValueAtTime
} from '@/services/valueTrackerService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const MAX_PREVIEW_BARS = 32
const MIN_CLIP_RENDER_TICKS = 0.5

const props = defineProps({
  clip: {
    type: Object,
    required: true
  },
  valueTrackerTrackId: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { editingClipId, pixelsPerTick, selectedClipIds, valueTrackerTracks } = storeToRefs(dawStore)
const pendingShiftSelectionAction = ref(null)

const clipWidth = computed(() =>
  Math.max(
    ticksToPixels(props.clip.duration, pixelsPerTick.value),
    ticksToPixels(MIN_CLIP_RENDER_TICKS, pixelsPerTick.value)
  )
)

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start, pixelsPerTick.value)}px`,
  width: `${clipWidth.value}px`
}))

const isEditing = computed(() => editingClipId.value === props.clip.id)
const isSelected = computed(() => selectedClipIds.value.includes(props.clip.id))
const isPartOfMultipleSelection = computed(() => isSelected.value && selectedClipIds.value.length > 1)
const stepCount = computed(() => Array.isArray(props.clip.values) ? props.clip.values.length : 0)
const eventCount = computed(() => getValueTrackerEventCount(props.clip.values))
const valueTrackerTrack = computed(() =>
  valueTrackerTracks.value.find((track) => track.id === props.valueTrackerTrackId) ?? null
)
const resolvedValues = computed(() =>
  getValueTrackerResolvedValues(
    props.clip.values,
    valueTrackerTrack.value
      ? getValueTrackerValueAtTime(props.clip.start, valueTrackerTrack.value, null)
      : null
  )
)
const previewValueRange = computed(() => {
  const numericValues = resolvedValues.value
    .filter((value) => value !== null)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (!numericValues.length) {
    return {
      max: null,
      min: null
    }
  }

  return {
    max: Math.max(...numericValues),
    min: Math.min(...numericValues)
  }
})
const previewBars = computed(() => {
  const values = resolvedValues.value
  const { max: maxValue, min: minValue } = previewValueRange.value

  if (!values.length) {
    return [{ heightPercent: 0, index: 0, value: null }]
  }

  const barCount = Math.min(values.length, MAX_PREVIEW_BARS)
  const sliceSize = values.length / barCount

  return Array.from({ length: barCount }, (_entry, index) => {
    const start = Math.floor(index * sliceSize)
    const end = Math.max(start + 1, Math.floor((index + 1) * sliceSize))
    const slice = values.slice(start, end)
    const numericValues = slice.filter((value) => value !== null)
    const average = numericValues.length
      ? numericValues.reduce((sum, value) => sum + Number(value || 0), 0) / numericValues.length
      : null

    return {
      heightPercent: getPreviewBarHeightPercent(average, minValue, maxValue),
      index,
      value: average
    }
  })
})

function getPreviewBarHeightPercent(value, minValue, maxValue) {
  if (value === null || minValue === null || maxValue === null) {
    return 0
  }

  if (maxValue <= minValue) {
    return 100
  }

  return Math.max(8, ((value - minValue) / (maxValue - minValue)) * 100)
}

function handleSelect(payload = {}) {
  if (ignoreNextClick.value) {
    return
  }

  const preserveMultiSelection = payload?.preserveMultiSelection === true
  const shiftSelectionAction =
    payload?.shiftKey === true && payload?.disableShiftToggle !== true
      ? pendingShiftSelectionAction.value ?? (isSelected.value ? 'remove' : 'add')
      : null

  pendingShiftSelectionAction.value = null

  if (shiftSelectionAction === 'remove') {
    dawStore.removeSelectedClip(props.clip.id)
    dawStore.selectFormula(null)
    return
  }

  if (shiftSelectionAction === 'add') {
    dawStore.addSelectedClip(props.clip.id)
    dawStore.selectFormula(null)
    return
  }

  if (!preserveMultiSelection || !isPartOfMultipleSelection.value) {
    dawStore.selectClip(props.clip.id)
  }

  dawStore.selectFormula(null)
}

const {
  duplicateDrag,
  ignoreNextClick,
  isDragging,
  resizeMode,
  cleanupInteraction,
  handlePointerDown,
  handleResizeEndPointerDown,
  handleResizeStartPointerDown
} = useTimelineClipInteraction({
  clip: props.clip,
  dawStore,
  duplicateClipInLane: (laneId, clipId) => dawStore.duplicateValueTrackerClip(laneId, clipId),
  editingClipId,
  getLaneId: (valueTrackerTrack) => valueTrackerTrack.id,
  laneId: props.valueTrackerTrackId,
  lanes: valueTrackerTracks,
  moveClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveValueTrackerClip(laneId, clipId, nextStart, shouldSnap),
  moveClipToLane: (laneId, targetLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveValueTrackerClipToTrack(laneId, targetLaneId, clipId, nextStart, shouldSnap),
  onSelect: handleSelect,
  pixelsPerTick,
  placeClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.placeValueTrackerClip(laneId, clipId, nextStart, shouldSnap),
  resizeClipEndInLane: (laneId, clipId, nextEnd, shouldSnap) =>
    dawStore.resizeValueTrackerClipEnd(laneId, clipId, nextEnd, shouldSnap),
  resizeClipStartInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.resizeValueTrackerClipStart(laneId, clipId, nextStart, shouldSnap),
  selectedClipIds
})

function handleClipPointerDown(event) {
  pendingShiftSelectionAction.value =
    event.shiftKey === true ? (isSelected.value ? 'remove' : 'add') : null
  handlePointerDown(event)
}

const buttonClassName = computed(() => {
  if (isEditing.value) {
    return 'timeline-value-tracker-clip--editing'
  }

  if (isDragging.value || resizeMode.value) {
    if (duplicateDrag.value && isSelected.value) {
      return 'timeline-value-tracker-clip--selected'
    }

    return 'timeline-value-tracker-clip--dragging'
  }

  return isSelected.value
    ? 'timeline-value-tracker-clip--selected'
    : 'timeline-value-tracker-clip--default'
})

const clipTitle = computed(() => `Value Tracker · ${eventCount.value} sets · ${stepCount.value} steps`)

function handleEditStart() {
  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function handleContextMenu(event) {
  handleSelect({ preserveMultiSelection: true })

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'edit-clip',
        clipId: props.clip.id,
        label: 'Hex Editor'
      },
      {
        action: 'copy-clip',
        clipId: props.clip.id,
        label: 'Copy'
      },
      {
        action: 'delete-clip',
        clipId: props.clip.id,
        label: 'Delete Clip'
      }
    ]
  })
}

onBeforeUnmount(() => {
  dawStore.clearClipDragPreview()
  cleanupInteraction()
})
</script>

<style scoped>
.timeline-value-tracker-clip {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.26);
  cursor: grab;
}

.timeline-value-tracker-clip--default {
  background: rgba(251, 191, 36, 0.16);
}

.timeline-value-tracker-clip--selected,
.timeline-value-tracker-clip--editing {
  background: rgba(251, 191, 36, 0.24);
  box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.28);
}

.timeline-value-tracker-clip--dragging {
  background: rgba(251, 191, 36, 0.2);
  cursor: grabbing;
}

.timeline-value-tracker-clip-handle {
  background: rgba(253, 224, 71, 0.08);
  border-color: rgba(253, 224, 71, 0.16);
}
</style>
