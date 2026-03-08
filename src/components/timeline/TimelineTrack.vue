<template>
  <div class="flex border-b border-zinc-800 last:border-b-0" @click="dawStore.selectTrack(track.id)">
    <div
      class="flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-4"
      :class="track.id === selectedTrackId ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300'"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
    >
      <span class="text-sm">{{ track.name }}</span>
      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        {{ track.clips.length }} clips
      </span>
    </div>

    <div class="relative h-20 shrink-0" :style="laneStyle">
      <TimelineClip
        v-for="clip in track.clips"
        :key="clip.id"
        :clip="clip"
        :track-id="track.id"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import TimelineClip from '@/components/timeline/TimelineClip.vue'
import { useDawStore } from '@/stores/dawStore'
import { TIMELINE_SCALE, TRACK_LABEL_WIDTH } from '@/utils/timeUtils'

const props = defineProps({
  track: {
    type: Object,
    required: true
  },
  timelineWidth: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
const { selectedTrackId } = storeToRefs(dawStore)

const laneStyle = computed(() => ({
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.5) 1px, transparent 1px)',
  backgroundSize: `${TIMELINE_SCALE}px 100%`
}))
</script>
