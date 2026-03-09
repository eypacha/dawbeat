<template>
  <div
    class="timeline-clip absolute top-3 bottom-3 box-border overflow-hidden border px-2 py-1 text-left text-xs text-zinc-50 transition-colors"
    :class="buttonClassName"
    :style="clipStyle"
    :title="clipTitle"
    data-timeline-clip="true"
    @click.stop="handleSelect"
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

    <input
      v-if="isEditing"
      ref="formulaInput"
      v-model="draftFormula"
      class="timeline-clip-input h-full w-full border px-2 text-xs text-zinc-50 outline-none"
      type="text"
      @blur="saveFormula"
      @keydown.enter.prevent="saveFormula"
      @keydown.esc.prevent="cancelEdit"
    />

    <span v-else class="block truncate font-medium">{{ clip.formula }}</span>
    <span v-if="!isEditing" class="mt-1 block text-[10px] uppercase tracking-[0.18em] opacity-70">
      {{ clip.duration }} ticks
    </span>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTimelineClipInteraction } from '@/composables/useTimelineClipInteraction'
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
const { editingClipId, pixelsPerTick, selectedClipId, tickSize, tracks } = storeToRefs(dawStore)
const draftFormula = ref(props.clip.formula)
const formulaInput = ref(null)

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start, pixelsPerTick.value)}px`,
  width: `${Math.max(ticksToPixels(props.clip.duration, pixelsPerTick.value), 56)}px`
}))

const isEditing = computed(() => editingClipId.value === props.clip.id)
const isSelected = computed(() => selectedClipId.value === props.clip.id)

function handleSelect() {
  if (ignoreNextClick.value) {
    return
  }

  dawStore.selectTrack(props.trackId)
  dawStore.selectClip(props.clip.id)
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

  return isSelected.value ? 'timeline-clip--selected' : 'timeline-clip--default'
})

const clipTitle = computed(() => {
  const startSamples = ticksToSamples(props.clip.start, tickSize.value)
  const durationSamples = ticksToSamples(props.clip.duration, tickSize.value)

  return `${props.clip.formula} | start ${props.clip.start} ticks (${startSamples} samples) | duration ${props.clip.duration} ticks (${durationSamples} samples)`
})

function handleEditStart() {
  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function saveFormula() {
  if (!isEditing.value) {
    return
  }

  dawStore.updateClip(props.trackId, props.clip.id, { formula: draftFormula.value })
  dawStore.setEditingClip(null)
}

function cancelEdit() {
  if (!isEditing.value) {
    return
  }

  draftFormula.value = props.clip.formula
  dawStore.setEditingClip(null)
}

watch(
  isEditing,
  async (editing) => {
    if (!editing) {
      draftFormula.value = props.clip.formula
      return
    }

    draftFormula.value = props.clip.formula
    await nextTick()
    formulaInput.value?.focus()
    formulaInput.value?.select()
  }
)

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

.timeline-clip-input {
  background: color-mix(in srgb, black 72%, var(--track-color) 28%);
  border-color: color-mix(in srgb, var(--track-color-border) 55%, white 45%);
}
</style>
