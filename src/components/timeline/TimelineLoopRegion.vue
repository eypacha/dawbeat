<template>
  <div
    class="absolute bottom-1 h-3 rounded-sm border transition-opacity"
    :class="loopEnabled ? 'border-emerald-300/70 bg-emerald-400/20' : 'border-zinc-600/80 bg-zinc-700/20 opacity-50'"
    :style="loopStyle"
  >
    <span
      class="absolute inset-y-0 left-0 w-2 -translate-x-1/2 cursor-ew-resize rounded-sm border border-emerald-200/70 bg-emerald-300"
      @pointerdown.stop="handleStartPointerDown"
    />
    <span
      class="absolute inset-y-0 right-0 w-2 translate-x-1/2 cursor-ew-resize rounded-sm border border-emerald-200/70 bg-emerald-300"
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
const resizeMode = ref(null)
const startPointerX = ref(0)
const initialTick = ref(0)

const loopStyle = computed(() => ({
  left: `${ticksToPixels(props.loopStart, pixelsPerTick.value)}px`,
  width: `${Math.max(ticksToPixels(props.loopEnd - props.loopStart, pixelsPerTick.value), 12)}px`
}))

function handleStartPointerDown(event) {
  startResize(event, 'start', props.loopStart)
}

function handleEndPointerDown(event) {
  startResize(event, 'end', props.loopEnd)
}

function startResize(event, mode, tick) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  resizeMode.value = mode
  startPointerX.value = event.clientX
  initialTick.value = tick

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function handlePointerMove(event) {
  if (!resizeMode.value) {
    return
  }

  const deltaTicks = (event.clientX - startPointerX.value) / pixelsPerTick.value

  if (resizeMode.value === 'start') {
    dawStore.setLoopStart(initialTick.value + deltaTicks)
    return
  }

  dawStore.setLoopEnd(initialTick.value + deltaTicks)
}

function handlePointerUp() {
  resizeMode.value = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

onBeforeUnmount(() => {
  handlePointerUp()
})
</script>
