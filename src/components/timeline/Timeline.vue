<template>
  <section
    class="flex min-h-[320px] flex-col border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg shadow-black/20"
  >
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Timeline</p>
      </div>

      <div class="text-right text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        <div>{{ samplesPerTick }} samples per tick</div>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="flex-1 overflow-auto border border-zinc-800 bg-zinc-950/80"
    >
      <div class="sticky top-0 z-20 flex min-w-full w-max border-b border-zinc-800 bg-zinc-900/95">
        <div
          class="flex shrink-0 items-center border-r border-zinc-800 px-4 text-[10px] uppercase tracking-[0.3em] text-zinc-500"
          :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
        >
          Tracks
        </div>

        <div class="relative h-11 shrink-0" :style="{ width: timelineWidthStyle }">
          <span class="absolute right-3 top-2 text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Ticks
          </span>

          <div
            v-for="mark in rulerMarks"
            :key="mark"
            class="absolute inset-y-0 border-l border-zinc-800/80"
            :style="{ left: `${ticksToPixels(mark)}px` }"
          >
            <span class="absolute left-2 top-2 text-[10px] text-zinc-500">{{ mark }}</span>
          </div>
        </div>
      </div>

      <div class="relative">
        <Playhead :time="time" :offset="TRACK_LABEL_WIDTH" />

        <TimelineTrack
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :timeline-width="timelineWidthStyle"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Playhead from '@/components/timeline/Playhead.vue'
import TimelineTrack from '@/components/timeline/TimelineTrack.vue'
import { useDawStore } from '@/stores/dawStore'
import {
  DEFAULT_TIMELINE_TICKS,
  TRACK_LABEL_WIDTH,
  getClipEnd,
  getSamplesPerTick,
  ticksToPixels
} from '@/utils/timeUtils'

const AUTO_SCROLL_PADDING = 96

const dawStore = useDawStore()
const { playing, tickSize, time, tracks } = storeToRefs(dawStore)
const scrollContainer = ref(null)

const timelineTicks = computed(() => {
  const maxClipEnd = tracks.value.reduce((largestEnd, track) => {
    const trackEnd = track.clips.reduce((trackLargestEnd, clip) => {
      return Math.max(trackLargestEnd, getClipEnd(clip))
    }, 0)

    return Math.max(largestEnd, trackEnd)
  }, 0)

  return Math.max(DEFAULT_TIMELINE_TICKS, Math.ceil(maxClipEnd + 1))
})

const samplesPerTick = computed(() => getSamplesPerTick(tickSize.value))
const rulerMarks = computed(() => Array.from({ length: timelineTicks.value }, (_, index) => index))
const timelineWidthStyle = computed(() => `${ticksToPixels(timelineTicks.value)}px`)

watch(time, (nextTime) => {
  if (!scrollContainer.value) {
    return
  }

  if (!playing.value && nextTime === 0) {
    scrollContainer.value.scrollLeft = 0
    return
  }

  if (!playing.value) {
    return
  }

  const playheadOffset = TRACK_LABEL_WIDTH + ticksToPixels(nextTime)
  const viewportLeft = scrollContainer.value.scrollLeft
  const viewportRight = viewportLeft + scrollContainer.value.clientWidth

  if (playheadOffset > viewportRight - AUTO_SCROLL_PADDING) {
    scrollContainer.value.scrollLeft = playheadOffset - scrollContainer.value.clientWidth + AUTO_SCROLL_PADDING
  }
})
</script>
