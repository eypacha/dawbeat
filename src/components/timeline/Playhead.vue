<template>
  <div
    class="absolute inset-y-0 z-[15] w-4 -translate-x-1/2 cursor-grab"
    :style="{ left: `${offset + ticksToPixels(time, pixelsPerTick)}px` }"
    @pointerdown.stop="emit('pointerdown', $event)"
  >
    <div class="absolute left-1/2 inset-y-0 w-px -translate-x-1/2 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.45)]" />
    <div class="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 border border-amber-200 bg-amber-300" />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

defineProps({
  time: {
    type: Number,
    required: true
  },
  offset: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['pointerdown'])

const dawStore = useDawStore()
const { pixelsPerTick } = storeToRefs(dawStore)
</script>
