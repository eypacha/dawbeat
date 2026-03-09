<template>
  <div
    class="timeline-clip absolute top-3 bottom-3 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
    :class="buttonClassName"
    :style="clipStyle"
    :title="clipTitle"
    data-timeline-clip="true"
    @click.stop="handleSelect"
    @contextmenu.stop.prevent="handleContextMenu"
    @dragover.prevent.stop="handleFormulaDragOver"
    @dragleave.stop="handleFormulaDragLeave"
    @drop.prevent.stop="handleFormulaDrop"
    @dblclick.stop="handleEditStart"
    @pointerdown.stop="handlePointerDown"
  >
    <span
      v-if="isSelected && !isEditing"
      class="timeline-clip-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize border-r"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      v-if="isSelected && !isEditing"
      class="timeline-clip-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize border-l"
      data-timeline-resize-handle="true"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <template v-if="showFormulaName">
      <span class="block truncate font-medium">{{ resolvedFormulaName }}</span>
      <span class="mt-1 block truncate text-[10px] opacity-70">{{ resolvedFormula }}</span>
    </template>

    <span v-else class="block truncate font-medium">{{ resolvedFormula }}</span>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
import { resolveClipFormula, resolveClipFormulaName } from '@/services/formulaService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels, ticksToSamples } from '@/utils/timeUtils'

const props = defineProps({
  clip: {
    type: Object,
    required: true
  },
  trackId: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { editingClipId, formulas, pixelsPerTick, selectedClipId, tickSize, tracks } = storeToRefs(dawStore)
const isFormulaDropTarget = ref(false)
const MIN_CLIP_RENDER_TICKS = 0.5

const resolvedFormula = computed(() => resolveClipFormula(props.clip, formulas.value))
const isReferenceClip = computed(() => Boolean(props.clip.formulaId))
const resolvedFormulaName = computed(() => resolveClipFormulaName(props.clip, formulas.value))
const showFormulaName = computed(() => Boolean(resolvedFormulaName.value))

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start, pixelsPerTick.value)}px`,
  width: `${Math.max(
    ticksToPixels(props.clip.duration, pixelsPerTick.value),
    ticksToPixels(MIN_CLIP_RENDER_TICKS, pixelsPerTick.value)
  )}px`
}))

const isEditing = computed(() => editingClipId.value === props.clip.id)
const isSelected = computed(() => selectedClipId.value === props.clip.id)

function handleSelect() {
  if (ignoreNextClick.value) {
    return
  }

  dawStore.selectTrack(props.trackId)
  dawStore.selectClip(props.clip.id)
  dawStore.selectFormula(props.clip.formulaId ?? null)
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
  trackId: props.trackId,
  dawStore,
  editingClipId,
  pixelsPerTick,
  tracks,
  onSelect: handleSelect
})

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

  if (isFormulaDropTarget.value) {
    return 'timeline-clip--drop-target'
  }

  return isSelected.value ? 'timeline-clip--selected' : 'timeline-clip--default'
})

const clipTitle = computed(() => {
  const startSamples = ticksToSamples(props.clip.start, tickSize.value)
  const durationSamples = ticksToSamples(props.clip.duration, tickSize.value)
  const clipKind = isReferenceClip.value ? 'reference' : 'inline'

  return `${resolvedFormula.value} | ${clipKind} | start ${props.clip.start} ticks (${startSamples} samples) | duration ${props.clip.duration} ticks (${durationSamples} samples)`
})

function handleEditStart() {
  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function handleContextMenu(event) {
  handleSelect()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'add-clip-formula-to-library',
        clipId: props.clip.id,
        label: props.clip.formulaId ? 'Show In Library' : 'Add To Library...',
        trackId: props.trackId
      }
    ]
  })
}

function handleFormulaDragOver(event) {
  if (!getDroppedFormulaId(event)) {
    return
  }

  isFormulaDropTarget.value = true
}

function handleFormulaDragLeave() {
  isFormulaDropTarget.value = false
}

function handleFormulaDrop(event) {
  const formulaId = getDroppedFormulaId(event)
  isFormulaDropTarget.value = false

  if (!formulaId) {
    return
  }

  dawStore.assignFormulaToClip(props.trackId, props.clip.id, formulaId)
}

function getDroppedFormulaId(event) {
  const formulaId = event.dataTransfer?.getData('formulaId')

  if (formulaId) {
    return formulaId
  }

  return event.dataTransfer?.getData('text/plain') || ''
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

.timeline-clip--drop-target {
  background: color-mix(in srgb, var(--track-color-light) 92%, white 8%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--track-color-light) 78%, white 22%);
}

.timeline-clip-handle {
  background: color-mix(in srgb, var(--track-color-light) 18%, transparent);
  border-color: color-mix(in srgb, var(--track-color-border) 55%, white 45%);
}
</style>
