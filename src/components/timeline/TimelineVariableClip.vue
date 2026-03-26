<template>
  <div
    class="timeline-variable-clip absolute inset-y-0 box-border overflow-hidden border px-1.5 py-0 text-left text-[10px] text-zinc-50 transition-colors"
    :class="[buttonClassName, isOutsideEditingGroup ? 'opacity-35 pointer-events-none' : '']"
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
    <span
      v-if="isSelected && !isEditing"
      class="timeline-variable-clip-handle absolute inset-y-0 left-0 w-1.5 cursor-ew-resize border-r"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      v-if="isSelected && !isEditing"
      class="timeline-variable-clip-handle absolute inset-y-0 right-0 w-1.5 cursor-ew-resize border-l"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <span class="relative z-[1] block truncate font-medium">{{ clip.formula }}</span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import { createGroupContextMenuItems } from '@/services/groupContextMenuService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  clip: {
    type: Object,
    required: true
  },
  variableTrackName: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { editingClipId, editingGroupId, pixelsPerTick, selectedClipIds, variableTracks } = storeToRefs(dawStore)
const pendingShiftSelectionAction = ref(null)
const MIN_CLIP_RENDER_TICKS = 0.5

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
  Boolean(editingGroupId.value) && props.clip.groupId !== editingGroupId.value
)
const isSelected = computed(() => selectedClipIds.value.includes(props.clip.id))
const isPartOfMultipleSelection = computed(() => isSelected.value && selectedClipIds.value.length > 1)

function handleSelect(payload = {}) {
  if (isOutsideEditingGroup.value) {
    return
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
  dawStore.selectTrack(null)

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
  allowCrossLane: false,
  clip: props.clip,
  dawStore,
  duplicateClipInLane: (laneId, clipId) => dawStore.duplicateVariableClip(laneId, clipId),
  editingClipId,
  getLaneId: (variableTrack) => variableTrack.name,
  laneId: props.variableTrackName,
  lanes: variableTracks,
  moveClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveVariableClip(laneId, clipId, nextStart, shouldSnap),
  moveClipToLane: (laneId, _targetLaneId, clipId, nextStart, shouldSnap) =>
    dawStore.moveVariableClip(laneId, clipId, nextStart, shouldSnap),
  onSelect: handleSelect,
  pixelsPerTick,
  placeClipInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.placeVariableClip(laneId, clipId, nextStart, shouldSnap),
  resizeClipEndInLane: (laneId, clipId, nextEnd, shouldSnap) =>
    dawStore.resizeVariableClipEnd(laneId, clipId, nextEnd, shouldSnap),
  resizeClipStartInLane: (laneId, clipId, nextStart, shouldSnap) =>
    dawStore.resizeVariableClipStart(laneId, clipId, nextStart, shouldSnap),
  selectedClipIds
})

function handleClipPointerDown(event) {
  pendingShiftSelectionAction.value =
    event.shiftKey === true ? (isSelected.value ? 'remove' : 'add') : null
  handlePointerDown(event)
}

const buttonClassName = computed(() => {
  if (isEditing.value) {
    return 'timeline-variable-clip--editing'
  }

  if (isDragging.value || resizeMode.value) {
    return 'timeline-variable-clip--dragging'
  }

  return isSelected.value ? 'timeline-variable-clip--selected' : 'timeline-variable-clip--default'
})

const clipTitle = computed(() => props.clip.formula ?? '0')

function handleEditStart() {
  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function handleContextMenu(event) {
  handleSelect({ preserveMultiSelection: true })
  const clipGroup = props.clip.groupId ? dawStore.getGroupById(props.clip.groupId) : null

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
        action: 'copy-clip',
        clipId: props.clip.id,
        label: 'Copy'
      },
      {
        action: 'edit-clip',
        clipId: props.clip.id,
        label: 'Edit Variable Clip'
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
.timeline-variable-clip {
  background: rgba(228, 228, 231, 0.16);
  border-color: rgba(244, 244, 245, 0.18);
  cursor: grab;
}

.timeline-variable-clip--default {
  background: rgba(228, 228, 231, 0.18);
}

.timeline-variable-clip--selected,
.timeline-variable-clip--editing {
  background: rgba(244, 244, 245, 0.28);
  box-shadow: 0 0 0 1px rgba(244, 244, 245, 0.24);
}

.timeline-variable-clip--dragging {
  background: rgba(244, 244, 245, 0.22);
  cursor: grabbing;
}

.timeline-variable-clip-handle {
  background: rgba(244, 244, 245, 0.08);
  border-color: rgba(244, 244, 245, 0.18);
}
</style>
