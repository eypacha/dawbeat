<template>
  <button
    class="absolute top-3 bottom-3 box-border overflow-hidden border border-blue-400/70 bg-blue-500/80 px-2 py-1 text-left text-xs text-blue-50 transition-colors"
    :class="buttonClassName"
    :style="clipStyle"
    :title="clipTitle"
    type="button"
    @click.stop="handleSelect"
    @pointerdown.stop="handlePointerDown"
  >
    <span
      class="absolute inset-y-0 left-0 w-2 cursor-ew-resize border-r border-blue-200/30 bg-blue-100/10"
      @pointerdown.stop="handleResizeStartPointerDown"
    />
    <span
      class="absolute inset-y-0 right-0 w-2 cursor-ew-resize border-l border-blue-200/30 bg-blue-100/10"
      @pointerdown.stop="handleResizeEndPointerDown"
    />

    <span class="block truncate font-medium">{{ clip.formula }}</span>
    <span class="mt-1 block text-[10px] uppercase tracking-[0.18em] opacity-70">
      {{ clip.duration }} ticks
    </span>
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDawStore } from '@/stores/dawStore'
import { TIMELINE_SCALE, ticksToPixels, ticksToSamples } from '@/utils/timeUtils'

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
const { selectedClipId, tickSize } = storeToRefs(dawStore)
const isDragging = ref(false)
const resizeMode = ref(null)

let dragStartX = 0
let dragStartTick = 0
let resizeStartTick = 0
let resizeEndTick = 0

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start)}px`,
  width: `${Math.max(ticksToPixels(props.clip.duration), 56)}px`
}))

const buttonClassName = computed(() => {
  if (isDragging.value) {
    return 'cursor-grabbing bg-blue-300 text-zinc-950'
  }

  if (resizeMode.value) {
    return 'bg-blue-300 text-zinc-950'
  }

  return props.clip.id === selectedClipId.value
    ? 'cursor-grab bg-blue-400 text-zinc-950'
    : 'cursor-grab hover:bg-blue-400/90'
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

function handlePointerDown(event) {
  if (!startInteraction(event)) {
    return
  }

  dragStartTick = props.clip.start
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
  if (event.button !== 0) {
    return false
  }

  event.preventDefault()
  dragStartX = event.clientX

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

  const deltaTicks = (event.clientX - dragStartX) / TIMELINE_SCALE

  if (isDragging.value) {
    dawStore.moveClip(props.trackId, props.clip.id, dragStartTick + deltaTicks)
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

  isDragging.value = false
  resizeMode.value = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

onBeforeUnmount(() => {
  handlePointerUp()
})
</script>
