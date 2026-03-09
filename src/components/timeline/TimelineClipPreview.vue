<template>
  <div
    class="pointer-events-none absolute top-3 bottom-3 box-border border border-dashed border-blue-200/60 bg-blue-300/20"
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
  }
})

const dawStore = useDawStore()
const { pixelsPerTick } = storeToRefs(dawStore)

const previewStyle = computed(() => ({
  left: `${ticksToPixels(props.start, pixelsPerTick.value)}px`,
  width: `${Math.max(ticksToPixels(props.duration, pixelsPerTick.value), 56)}px`
}))
</script>
