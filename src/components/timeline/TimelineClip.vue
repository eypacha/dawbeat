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
import { clampClipPlacementStart } from '@/services/timelineService'
import { useDawStore } from '@/stores/dawStore'
import { snapTicks, ticksToPixels, ticksToSamples } from '@/utils/timeUtils'

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
const isDragging = ref(false)
const resizeMode = ref(null)
const draftFormula = ref(props.clip.formula)
const formulaInput = ref(null)

let dragStartX = 0
let dragStartTick = 0
let dragDesiredStart = 0
let dragTargetTrackId = props.trackId
let resizeStartTick = 0
let resizeEndTick = 0

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start, pixelsPerTick.value)}px`,
  width: `${Math.max(ticksToPixels(props.clip.duration, pixelsPerTick.value), 56)}px`
}))

const isEditing = computed(() => editingClipId.value === props.clip.id)
const isSelected = computed(() => selectedClipId.value === props.clip.id)

const buttonClassName = computed(() => {
  if (isEditing.value) {
    return 'timeline-clip--editing'
  }

  if (isDragging.value) {
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

function handleSelect() {
  dawStore.selectTrack(props.trackId)
  dawStore.selectClip(props.clip.id)
}

function handleEditStart() {
  handleSelect()
  dawStore.setEditingClip(props.clip.id)
}

function handlePointerDown(event) {
  if (!startInteraction(event)) {
    return
  }

  dragStartTick = props.clip.start
  dragDesiredStart = props.clip.start
  isDragging.value = true
}

function handleResizeStartPointerDown(event) {
  if (!startInteraction(event)) {
    return
  }

  resizeMode.value = 'start'
  resizeStartTick = props.clip.start
}

function handleResizeEndPointerDown(event) {
  if (!startInteraction(event)) {
    return
  }

  resizeMode.value = 'end'
  resizeEndTick = props.clip.start + props.clip.duration
}

function startInteraction(event) {
  if (event.button !== 0 || editingClipId.value) {
    return false
  }

  event.preventDefault()
  dragStartX = event.clientX
  dragDesiredStart = props.clip.start
  dragTargetTrackId = props.trackId

  handleSelect()

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)

  return true
}

function handlePointerMove(event) {
  if (!isDragging.value && !resizeMode.value) {
    return
  }

  const deltaTicks = (event.clientX - dragStartX) / pixelsPerTick.value

  if (isDragging.value) {
    dragDesiredStart = snapTicks(Math.max(0, dragStartTick + deltaTicks))
    dragTargetTrackId = getDragTargetTrackId(event)
    syncSourceClipPosition()
    syncDragPreview()
    return
  }

  if (resizeMode.value === 'start') {
    dawStore.resizeClipStart(props.trackId, props.clip.id, resizeStartTick + deltaTicks)
    return
  }

  dawStore.resizeClipEnd(props.trackId, props.clip.id, resizeEndTick + deltaTicks)
}

function handlePointerUp() {
  if (!isDragging.value && !resizeMode.value) {
    return
  }

  if (isDragging.value && dragTargetTrackId !== props.trackId) {
    dawStore.moveClipToTrack(props.trackId, dragTargetTrackId, props.clip.id, dragDesiredStart)
  }

  dawStore.clearClipDragPreview()
  isDragging.value = false
  resizeMode.value = null
  dragDesiredStart = props.clip.start
  dragTargetTrackId = props.trackId
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

function getDragTargetTrackId(event) {
  const targetTrackElement = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-track-id]')

  if (!(targetTrackElement instanceof HTMLElement)) {
    return props.trackId
  }

  const nextTrackId = targetTrackElement.dataset.trackId
  const trackExists = tracks.value.some((track) => track.id === nextTrackId)

  return trackExists && nextTrackId ? nextTrackId : props.trackId
}

function syncDragPreview() {
  if (dragTargetTrackId === props.trackId) {
    dawStore.clearClipDragPreview()
    return
  }

  const targetTrack = tracks.value.find((track) => track.id === dragTargetTrackId)

  if (!targetTrack) {
    dawStore.clearClipDragPreview()
    return
  }

  dawStore.setClipDragPreview({
    clipId: props.clip.id,
    duration: props.clip.duration,
    sourceTrackId: props.trackId,
    start: clampClipPlacementStart(targetTrack, dragDesiredStart, props.clip.duration),
    targetTrackId: dragTargetTrackId
  })
}

function syncSourceClipPosition() {
  if (dragTargetTrackId === props.trackId) {
    dawStore.moveClip(props.trackId, props.clip.id, dragDesiredStart)
    return
  }

  dawStore.moveClip(props.trackId, props.clip.id, dragStartTick)
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
  handlePointerUp()
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
