<template>
  <div
    class="timeline-clip absolute inset-y-0 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
    :class="[
      buttonClassName,
      isHiddenByGroupShell ? 'opacity-0 pointer-events-none' : '',
      !isHiddenByGroupShell && isOutsideEditingGroup ? 'opacity-35 pointer-events-none' : '',
      shouldSelectWholeGroup ? 'pointer-events-none' : ''
    ]"
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
    <TimelineClipWaveform
      v-if="showClipWaveforms"
      :duration="clip.duration"
      :expressions="resolvedFormulaExpressions"
      :height="trackHeight"
      :start="clip.start"
      :width="clipWidth"
    />

    <span
      v-if="showResizeHandles"
      class="timeline-clip-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize border-r"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      v-if="showResizeHandles"
      class="timeline-clip-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize border-l"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <div class="relative z-[1] flex items-start gap-1">
      <div class="min-w-0 flex-1">
        <template v-if="showFormulaName">
          <span class="block truncate font-medium">{{ resolvedFormulaName }}</span>
          <span class="mt-1 block truncate text-[10px] opacity-70">{{ resolvedFormula }}</span>
        </template>

        <span v-else class="block truncate font-medium">{{ resolvedFormula }}</span>
      </div>

      <span
        v-if="showLoopPeriodIndicator"
        class="pointer-events-none rounded border border-zinc-300/35 bg-zinc-950/50 px-1 py-0.5 text-[9px] font-semibold leading-none text-zinc-100"
        :title="`Detected period: ${loopPeriod} samples`"
      >
        L{{ loopPeriod }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import TimelineClipWaveform from '@/components/timeline/TimelineClipWaveform.vue'
import {
  buildRenderableFormulaExpressions,
  createFormulaAnalysisCacheKey
} from '@/composables/useFormulaInspector'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import {
  resolveClipFormula,
  resolveClipFormulaExpressions,
  resolveClipFormulaName
} from '@/services/formulaService'
import { createGroupContextMenuItems } from '@/services/groupContextMenuService'
import { getRenderedTimelineClipWidth } from '@/services/timelineClipRenderService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  clip: {
    type: Object,
    required: true
  },
  trackId: {
    type: String,
    required: true
  },
  trackHeight: {
    type: Number,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const {
  editingGroupId,
  editingClipId,
  evalEffects,
  pixelsPerTick,
  selectedClipIds,
  showClipWaveforms,
  tracks,
  valueTrackerTracks,
  variableTracks
} = storeToRefs(dawStore)
const pendingShiftSelectionAction = ref(null)

const resolvedFormula = computed(() => resolveClipFormula(props.clip))
const resolvedFormulaExpressions = computed(() => resolveClipFormulaExpressions(props.clip))
const resolvedFormulaName = computed(() => resolveClipFormulaName(props.clip))
const renderableFormulaExpressions = computed(() =>
  buildRenderableFormulaExpressions({
    expressions: resolvedFormulaExpressions.value,
    evalEffects: evalEffects.value,
    referenceTick: props.clip.start,
    valueTrackerTracks: valueTrackerTracks.value,
    variableTracks: variableTracks.value
  })
)
const formulaAnalysisCacheKey = computed(() =>
  createFormulaAnalysisCacheKey(renderableFormulaExpressions.value)
)
const formulaAnalysis = computed(() => dawStore.getFormulaAnalysisByKey(formulaAnalysisCacheKey.value))
const loopPeriod = computed(() =>
  Number.isFinite(formulaAnalysis.value?.period) ? Number(formulaAnalysis.value.period) : null
)
const showLoopPeriodIndicator = computed(() =>
  loopPeriod.value !== null &&
  loopPeriod.value <= 4096 &&
  Number(formulaAnalysis.value?.confidence) > 0.99
)
const showFormulaName = computed(() => Boolean(resolvedFormulaName.value))
const clipWidth = computed(() => getRenderedTimelineClipWidth(props.clip.duration, pixelsPerTick.value))

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start, pixelsPerTick.value)}px`,
  width: `${clipWidth.value}px`
}))

const isEditing = computed(() => editingClipId.value === props.clip.id)
const isOutsideEditingGroup = computed(() =>
  Boolean(editingGroupId.value) && props.clip.groupId !== editingGroupId.value
)
const isHiddenByGroupShell = computed(() =>
  Boolean(props.clip.groupId) && props.clip.groupId !== editingGroupId.value
)
const shouldSelectWholeGroup = computed(() =>
  Boolean(props.clip.groupId) && !editingGroupId.value
)
const isSelected = computed(() => selectedClipIds.value.includes(props.clip.id))
const showResizeHandles = computed(() => isSelected.value && !isEditing.value && !shouldSelectWholeGroup.value)
const isPartOfMultipleSelection = computed(() => isSelected.value && selectedClipIds.value.length > 1)

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
      dawStore.selectTrack(props.trackId)

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
  dawStore.selectTrack(props.trackId)

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
  clip: props.clip,
  laneId: props.trackId,
  lanes: tracks,
  trackId: props.trackId,
  dawStore,
  editingClipId,
  getLaneId: (trackEntry) => trackEntry.id,
  pixelsPerTick,
  selectedClipIds,
  tracks,
  onSelect: handleSelect
})

function handleClipPointerDown(event) {
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
  if (isEditing.value) {
    return 'timeline-clip--editing'
  }

  if (isDragging.value) {
    if (duplicateDrag.value) {
      return isSelected.value ? 'timeline-clip--selected' : 'timeline-clip--default'
    }

    return 'timeline-clip--dragging'
  }

  if (resizeMode.value) {
    return 'timeline-clip--dragging'
  }

  return isSelected.value ? 'timeline-clip--selected' : 'timeline-clip--default'
})

const clipTitle = computed(() => {
  return resolvedFormula.value
})

function handleEditStart() {
  handleSelect()
  dawStore.handleTimelineClipDoubleClick(props.clip.id)
}

function handleContextMenu(event) {
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

  const items = [
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
      label: 'Edit Clip'
    },
    {
      action: 'open-formula-inspector',
      clipId: props.clip.id,
      label: 'Formula Inspector'
    },
    {
      action: 'add-to-library',
      clipId: props.clip.id,
      clip: props.clip,
      label: 'Add to Library'
    },
    {
      action: 'delete-clip',
      clipId: props.clip.id,
      label: 'Delete Clip'
    }
  ]

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items
  })
}

onBeforeUnmount(() => {
  dawStore.clearClipDragPreview()
  cleanupInteraction()
})
</script>

<style scoped>
.timeline-clip {
  background: color-mix(in srgb, var(--track-color) 78%, transparent);
  border-color: var(--track-color-border);
  cursor: grab;
}

.timeline-clip--default {
  background: color-mix(in srgb, var(--track-color) 84%, transparent);
  border-right-color: rgba(63, 63, 70, 0.5);
}

.timeline-clip--selected,
.timeline-clip--editing {
  background: color-mix(in srgb, var(--track-color-light) 88%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--track-color-light) 70%, white 30%);
}

.timeline-clip--dragging {
  background: color-mix(in srgb, var(--track-color-light) 76%, transparent);
  cursor: grabbing;
}

.timeline-clip-handle {
  background: color-mix(in srgb, var(--track-color-light) 18%, transparent);
  border-color: color-mix(in srgb, var(--track-color-border) 55%, white 45%);
}
</style>
