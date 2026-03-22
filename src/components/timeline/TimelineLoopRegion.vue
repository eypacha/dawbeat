<template>
  <div
    class="absolute bottom-1 z-20 h-2.5 rounded-sm border transition-opacity"
    :class="loopRegionClassName"
    :style="loopStyle"
    @pointerdown="handleMovePointerDown"
  >
    <span
      class="absolute left-0 top-1/2 h-3.5 w-2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-emerald-200/70 bg-emerald-300"
      @pointerdown.stop="handleStartPointerDown"
    />
    <span
      class="absolute right-0 top-1/2 h-3.5 w-2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-emerald-200/70 bg-emerald-300"
      @pointerdown.stop="handleEndPointerDown"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  loopEnabled: {
    type: Boolean,
    required: true
  },
  loopStart: {
    type: Number,
    required: true
  },
  loopEnd: {
    type: Number,
    required: true
  }
})

const dawStore = useDawStore()
const { pixelsPerTick } = storeToRefs(dawStore)
const interactionMode = ref(null)
const startPointerX = ref(0)
const initialStartTick = ref(0)
const initialEndTick = ref(0)

const loopStyle = computed(() => ({
  left: `${ticksToPixels(props.loopStart, pixelsPerTick.value)}px`,
  width: `${Math.max(ticksToPixels(props.loopEnd - props.loopStart, pixelsPerTick.value), 12)}px`
}))

const loopRegionClassName = computed(() => {
  const toneClassName = props.loopEnabled
    ? 'border-emerald-300/70 bg-emerald-400/20'
    : 'border-zinc-600/80 bg-zinc-700/20 opacity-50'

  const cursorClassName = interactionMode.value === 'move' ? 'cursor-grabbing' : 'cursor-grab'

  return `${toneClassName} ${cursorClassName}`
})

function handleStartPointerDown(event) {
  startInteraction(event, 'start')
}

function handleEndPointerDown(event) {
  startInteraction(event, 'end')
}

function handleMovePointerDown(event) {
  if (event.target !== event.currentTarget) {
    return
  }

  startInteraction(event, 'move')
}

function startInteraction(event, mode) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  interactionMode.value = mode
  startPointerX.value = event.clientX
  initialStartTick.value = props.loopStart
  initialEndTick.value = props.loopEnd

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function handlePointerMove(event) {
  if (!interactionMode.value) {
    return
  }

  const deltaTicks = (event.clientX - startPointerX.value) / pixelsPerTick.value

  if (interactionMode.value === 'start') {
    dawStore.setLoopStart(initialStartTick.value + deltaTicks)
    return
  }

  if (interactionMode.value === 'end') {
    dawStore.setLoopEnd(initialEndTick.value + deltaTicks)
    return
  }

  const duration = initialEndTick.value - initialStartTick.value
  const nextStart = Math.max(0, initialStartTick.value + deltaTicks)
  dawStore.setLoopRange(nextStart, nextStart + duration)
}

function handlePointerUp() {
  interactionMode.value = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

onBeforeUnmount(() => {
  handlePointerUp()
})
</script>
