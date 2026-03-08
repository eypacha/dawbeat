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

let dragStartX = 0
let dragStartTick = 0

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start)}px`,
  width: `${Math.max(ticksToPixels(props.clip.duration), 56)}px`
}))

const buttonClassName = computed(() => {
  if (isDragging.value) {
    return 'cursor-grabbing bg-blue-300 text-zinc-950'
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
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  dragStartX = event.clientX
  dragStartTick = props.clip.start
  isDragging.value = true

  handleSelect()

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function handlePointerMove(event) {
  if (!isDragging.value) {
    return
  }

  const deltaTicks = (event.clientX - dragStartX) / TIMELINE_SCALE
  dawStore.moveClip(props.trackId, props.clip.id, dragStartTick + deltaTicks)
}

function handlePointerUp() {
  if (!isDragging.value) {
    return
  }

  isDragging.value = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

onBeforeUnmount(() => {
  handlePointerUp()
})
</script>
