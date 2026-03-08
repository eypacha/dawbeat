<template>
  <div
    class="pointer-events-none absolute inset-y-0 z-10"
    :style="{ left: `${offset + ticksToPixels(time)}px` }"
  >
    <div class="absolute inset-y-0 w-px bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.45)]" />
    <div class="absolute -left-1 top-0 h-3 w-3 border border-amber-200 bg-amber-300" />
  </div>
</template>

<script setup>
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
</script>
