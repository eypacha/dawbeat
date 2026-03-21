<template>
  <div
    class="timeline-clip-preview pointer-events-none absolute box-border border border-dashed"
    :style="previewStyle"
  />
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const props = defineProps({
  start: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const dawStore = useDawStore()
const { pixelsPerTick } = storeToRefs(dawStore)
const MIN_CLIP_RENDER_TICKS = 0.5

const previewStyle = computed(() => ({
  bottom: '0',
  left: `${ticksToPixels(props.start, pixelsPerTick.value)}px`,
  top: '0',
  width: `${Math.max(
    ticksToPixels(props.duration, pixelsPerTick.value),
    ticksToPixels(MIN_CLIP_RENDER_TICKS, pixelsPerTick.value)
  )}px`
}))
</script>

<style scoped>
.timeline-clip-preview {
  background: color-mix(in srgb, var(--track-color) 24%, transparent);
  border-color: color-mix(in srgb, var(--track-color-border) 70%, white 30%);
}
</style>
