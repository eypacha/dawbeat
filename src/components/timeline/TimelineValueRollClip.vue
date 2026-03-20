<template>
  <div
    class="timeline-value-roll-clip absolute top-2 bottom-2 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
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
    <div class="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex items-end gap-px px-2 pb-2 pt-7 opacity-55">
      <span
        v-for="bar in previewBars"
        :key="`${clip.id}:${bar.index}`"
        class="bg-amber-200/70"
        :style="{
          height: `${bar.value === null ? 0 : Math.max(8, (bar.value / 255) * 100)}%`,
          opacity: bar.value === null ? 0 : 1,
          width: `${100 / previewBars.length}%`
        }"
      />
    </div>

    <span
      v-if="isSelected && !isEditing"
      class="timeline-value-roll-clip-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize border-r"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      v-if="isSelected && !isEditing"
      class="timeline-value-roll-clip-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize border-l"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <div class="relative z-[1]">
      <span class="block truncate font-medium">Value Roll</span>
      <span class="mt-1 block truncate text-[10px] opacity-75">{{ eventCount }} sets</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import {
  getValueRollEventCount,
  getValueRollResolvedValues,
  getValueRollValueAtTime
} from '@/services/valueRollService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const MAX_PREVIEW_BARS = 32
const MIN_CLIP_RENDER_TICKS = 0.5

const props = defineProps({
  clip: {
    type: Object,
    required: true
  },
  valueRollTrackId: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { editingClipId, pixelsPerTick, selectedClipIds, valueRollTracks } = storeToRefs(dawStore)
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
const eventCount = computed(() => getValueRollEventCount(props.clip.values))
const valueRollTrack = computed(() =>
  valueRollTracks.value.find((track) => track.id === props.valueRollTrackId) ?? null
)
const resolvedValues = computed(() =>
  getValueRollResolvedValues(
    props.clip.values,
    valueRollTrack.value
      ? getValueRollValueAtTime(props.clip.start, valueRollTrack.value, null)
      : null
  )
)
const previewBars = computed(() => {
  const values = resolvedValues.value

  if (!values.length) {
    return [{ index: 0, value: null }]
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
      index,
      value: average
    }
  })
})

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
  dawStore.selectTrack(null)

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
  duplicateClipInLane: (laneId, clipId) => dawStore.duplicateValueRollClip(laneId, clipId),
  editingClipId,
  getLaneId: (valueRollTrack) => valueRollTrack.id,
  laneId: props.valueRollTrackId,
  lanes: valueRollTracks,
  moveClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveValueRollClip(laneId, clipId, nextStart, shouldSnap),
  moveClipToLane: (laneId, targetLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveValueRollClipToTrack(laneId, targetLaneId, clipId, nextStart, shouldSnap),
  onSelect: handleSelect,
  pixelsPerTick,
  placeClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.placeValueRollClip(laneId, clipId, nextStart, shouldSnap),
  resizeClipEndInLane: (laneId, clipId, nextEnd, shouldSnap) =>
    dawStore.resizeValueRollClipEnd(laneId, clipId, nextEnd, shouldSnap),
  resizeClipStartInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.resizeValueRollClipStart(laneId, clipId, nextStart, shouldSnap),
  selectedClipIds
})

function handleClipPointerDown(event) {
  pendingShiftSelectionAction.value =
    event.shiftKey === true ? (isSelected.value ? 'remove' : 'add') : null
  handlePointerDown(event)
}

const buttonClassName = computed(() => {
  if (isEditing.value) {
    return 'timeline-value-roll-clip--editing'
  }

  if (isDragging.value || resizeMode.value) {
    if (duplicateDrag.value && isSelected.value) {
      return 'timeline-value-roll-clip--selected'
    }

    return 'timeline-value-roll-clip--dragging'
  }

  return isSelected.value
    ? 'timeline-value-roll-clip--selected'
    : 'timeline-value-roll-clip--default'
})

const clipTitle = computed(() => `Value Roll · ${eventCount.value} sets · ${stepCount.value} steps`)

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
        action: 'copy-clip',
        clipId: props.clip.id,
        label: 'Copy'
      },
      {
        action: 'edit-clip',
        clipId: props.clip.id,
        label: 'Edit Value Roll'
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
.timeline-value-roll-clip {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.26);
  cursor: grab;
}

.timeline-value-roll-clip--default {
  background: rgba(251, 191, 36, 0.16);
}

.timeline-value-roll-clip--selected,
.timeline-value-roll-clip--editing {
  background: rgba(251, 191, 36, 0.24);
  box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.28);
}

.timeline-value-roll-clip--dragging {
  background: rgba(251, 191, 36, 0.2);
  cursor: grabbing;
}

.timeline-value-roll-clip-handle {
  background: rgba(253, 224, 71, 0.08);
  border-color: rgba(253, 224, 71, 0.16);
}
</style>
