<template>
  <div
    class="pointer-events-none absolute top-3 bottom-3 box-border border border-dashed border-blue-200/60 bg-blue-300/20"
    :style="previewStyle"
  />
</template>

<script setup>
import { computed } from 'vue'
import { ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  start: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
})

const previewStyle = computed(() => ({
  left: `${ticksToPixels(props.start)}px`,
  width: `${Math.max(ticksToPixels(props.duration), 56)}px`
}))
</script>
