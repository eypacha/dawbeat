<template>
  <div
    class="timeline-value-tracker-clip absolute inset-y-0 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
    :class="[buttonClassName, props.preview ? 'pointer-events-none' : '', isOutsideEditingGroup ? 'opacity-35 pointer-events-none' : '']"
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
      <span v-if="displayName" class="block truncate text-[11px] font-medium leading-none">{{ displayName }}</span>
      <span class="block truncate text-[9px] leading-none opacity-80" :class="displayName ? 'mt-0.5' : ''">{{ eventCount }} sets</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import { createGroupContextMenuItems } from '@/services/groupContextMenuService'
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
  preview: {
    type: Boolean,
    default: false
  },
  valueTrackerTrackId: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { editingClipId, editingGroupId, pixelsPerTick, selectedClipIds, valueTrackerTracks } = storeToRefs(dawStore)
const pendingShiftSelectionAction = ref(null)
let duplicateDrag = ref(false)
let ignoreNextClick = ref(false)
let isDragging = ref(false)
let resizeMode = ref(null)

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
const isOutsideEditingGroup = computed(() =>
  !props.preview && Boolean(editingGroupId.value) && props.clip.groupId !== editingGroupId.value
)
const shouldSelectWholeGroup = computed(() =>
  !props.preview && Boolean(props.clip.groupId) && !editingGroupId.value
)
const isSelected = computed(() => selectedClipIds.value.includes(props.clip.id))
const isPartOfMultipleSelection = computed(() => isSelected.value && selectedClipIds.value.length > 1)
const stepCount = computed(() => Array.isArray(props.clip.values) ? props.clip.values.length : 0)
const eventCount = computed(() => getValueTrackerEventCount(props.clip.values))
const valueTrackerTrack = computed(() =>
  valueTrackerTracks.value.find((track) => track.id === props.valueTrackerTrackId) ?? null
)
const displayName = computed(() => '')
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

function getClipGroupClipIds() {
  if (!props.clip.groupId) {
    return []
  }

  const clipGroup = dawStore.getGroupById(props.clip.groupId)
  return Array.isArray(clipGroup?.clips)
    ? clipGroup.clips.map((entry) => entry?.clipId).filter(Boolean)
    : []
}

function isClipGroupFullySelected() {
  const clipGroupIds = getClipGroupClipIds()
  return Boolean(clipGroupIds.length) && clipGroupIds.every((clipId) => selectedClipIds.value.includes(clipId))
}

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
  if (isOutsideEditingGroup.value) {
    return
  }

  if (shouldSelectWholeGroup.value) {
    const clipGroupIds = getClipGroupClipIds()
    const preserveMultiSelection = payload?.preserveMultiSelection === true
    const groupIsFullySelected = isClipGroupFullySelected()
    const shiftSelectionAction = payload?.shiftKey === true && payload?.disableShiftToggle !== true
      ? pendingShiftSelectionAction.value ?? (groupIsFullySelected ? 'remove' : 'add')
      : null

    pendingShiftSelectionAction.value = null

    if (clipGroupIds.length) {
      if (shiftSelectionAction === 'remove') {
        dawStore.removeSelectedClipIds(clipGroupIds)
        return
      }

      if (shiftSelectionAction === 'add') {
        dawStore.addSelectedClips(clipGroupIds)
        return
      }

      if (!preserveMultiSelection || !groupIsFullySelected || selectedClipIds.value.length === clipGroupIds.length) {
        dawStore.setSelectedClips(clipGroupIds)
      }

      return
    }
  }

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
    return
  }

  if (shiftSelectionAction === 'add') {
    dawStore.addSelectedClip(props.clip.id)
    return
  }

  if (!preserveMultiSelection || !isPartOfMultipleSelection.value) {
    dawStore.selectClip(props.clip.id)
  }
}

let cleanupInteraction = () => {}
let handlePointerDown = () => {}
let handleResizeEndPointerDown = () => {}
let handleResizeStartPointerDown = () => {}

if (!props.preview) {
  const interaction = useTimelineClipInteraction({
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

  duplicateDrag = interaction.duplicateDrag
  ignoreNextClick = interaction.ignoreNextClick
  isDragging = interaction.isDragging
  resizeMode = interaction.resizeMode
  cleanupInteraction = interaction.cleanupInteraction
  handlePointerDown = interaction.handlePointerDown
  handleResizeEndPointerDown = interaction.handleResizeEndPointerDown
  handleResizeStartPointerDown = interaction.handleResizeStartPointerDown
}

function handleClipPointerDown(event) {
  if (props.preview) {
    return
  }

  if (isOutsideEditingGroup.value) {
    return
  }

  if (shouldSelectWholeGroup.value) {
    const clipGroupIds = getClipGroupClipIds()

    if (clipGroupIds.length) {
      handleSelect({ preserveMultiSelection: true, shiftKey: event.shiftKey })
    }

    pendingShiftSelectionAction.value = null
    handlePointerDown(event)
    return
  }

  pendingShiftSelectionAction.value =
    event.shiftKey === true ? (isSelected.value ? 'remove' : 'add') : null
  handlePointerDown(event)
}

const buttonClassName = computed(() => {
  if (props.preview) {
    return 'timeline-value-tracker-clip--recording'
  }

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

const clipTitle = computed(() =>
  props.preview
    ? `Recording · ${eventCount.value} sets · ${stepCount.value} steps`
    : [
        'Value Tracker',
        `${eventCount.value} sets`,
        `${stepCount.value} steps`
      ].join(' · ')
)

function handleEditStart() {
  if (props.preview) {
    return
  }

  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function handleContextMenu(event) {
  if (props.preview) {
    return
  }

  handleSelect({ preserveMultiSelection: true })
  const clipGroup = !editingGroupId.value && props.clip.groupId ? dawStore.getGroupById(props.clip.groupId) : null

  if (clipGroup) {
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: createGroupContextMenuItems(clipGroup)
    })
    return
  }

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      ...(selectedClipIds.value.length > 1
        ? [
            {
              action: 'create-group-from-selection',
              label: 'Group Selected Clips'
            }
          ]
        : []),
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

.timeline-value-tracker-clip--recording {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(253, 224, 71, 0.4);
  box-shadow: 0 0 0 1px rgba(253, 224, 71, 0.18);
}

.timeline-value-tracker-clip-handle {
  background: rgba(253, 224, 71, 0.08);
  border-color: rgba(253, 224, 71, 0.16);
}
</style>
