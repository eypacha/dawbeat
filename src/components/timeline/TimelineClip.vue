<template>
  <button
    class="absolute top-3 bottom-3 box-border overflow-hidden border border-blue-400/70 bg-blue-500/80 px-2 py-1 text-left text-xs text-blue-50 transition-colors"
    :class="clip.id === selectedClipId ? 'bg-blue-400 text-zinc-950' : 'hover:bg-blue-400/90'"
    :style="clipStyle"
    :title="clipTitle"
    type="button"
    @click.stop="handleSelect"
  >
    <span class="block truncate font-medium">{{ clip.formula }}</span>
    <span class="mt-1 block text-[10px] uppercase tracking-[0.18em] opacity-70">
      {{ clip.duration }} ticks
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels, ticksToSamples } from '@/utils/timeUtils'

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

const clipStyle = computed(() => ({
  left: `${ticksToPixels(props.clip.start)}px`,
  width: `${Math.max(ticksToPixels(props.clip.duration), 56)}px`
}))

const clipTitle = computed(() => {
  const startSamples = ticksToSamples(props.clip.start, tickSize.value)
  const durationSamples = ticksToSamples(props.clip.duration, tickSize.value)

  return `${props.clip.formula} | start ${props.clip.start} ticks (${startSamples} samples) | duration ${props.clip.duration} ticks (${durationSamples} samples)`
})

function handleSelect() {
  dawStore.selectTrack(props.trackId)
  dawStore.selectClip(props.clip.id)
}
</script>
