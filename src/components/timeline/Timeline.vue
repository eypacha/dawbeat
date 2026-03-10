<template>
  <Panel class="flex min-h-[320px] flex-col">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Timeline</p>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="flex-1 overflow-auto border border-zinc-800 bg-zinc-950/80"
      @wheel="handleWheel"
    >
      <div class="sticky top-0 z-20 flex min-w-full w-max border-b border-zinc-800 bg-zinc-900/95">
        <div
          class="sticky left-0 z-30 flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-4 text-[10px] uppercase tracking-[0.3em] text-zinc-500"
          :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
        >
          Tracks
        </div>

        <div class="relative h-11 shrink-0" :style="{ width: timelineWidthStyle }">
          <span class="absolute right-3 top-2 text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Ticks
          </span>

          <TimelineLoopRegion
            :loop-enabled="loopEnabled"
            :loop-start="loopStart"
            :loop-end="loopEnd"
          />

          <div
            v-for="mark in rulerMarks"
            :key="mark"
            class="absolute inset-y-0 border-l border-zinc-800/80"
            :style="{ left: `${ticksToPixels(mark, pixelsPerTick)}px` }"
          >
            <span class="absolute left-2 top-2 text-[10px] text-zinc-500">{{ mark }}</span>
          </div>

          <button
            class="absolute inset-0 z-10 cursor-grab"
            type="button"
            @pointerdown="handleScrubPointerDown"
          />
        </div>
      </div>

      <div
        ref="timelineSurfaceElement"
        class="relative"
        @pointerdown.capture="handleTimelineSurfacePointerDownCapture"
      >
        <Playhead
          :time="time"
          :offset="TRACK_LABEL_WIDTH"
          @pointerdown="handleScrubPointerDown"
        />

        <div
          v-if="marqueeSelectionActive && marqueeSelectionStyle"
          class="pointer-events-none absolute z-20"
          :style="marqueeSelectionStyle"
        />

        <TimelineTrack
          v-for="(track, index) in tracks"
          :key="track.id"
          :track-index="index"
          :track="track"
          :timeline-width="timelineWidthStyle"
        />

        <TimelineAddTrackRow :timeline-width="timelineWidthStyle" />
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Panel from '@/components/ui/Panel.vue'
import Playhead from '@/components/timeline/Playhead.vue'
import TimelineAddTrackRow from '@/components/timeline/TimelineAddTrackRow.vue'
import TimelineLoopRegion from '@/components/timeline/TimelineLoopRegion.vue'
import TimelineTrack from '@/components/timeline/TimelineTrack.vue'
import { useTimelineMarqueeSelection } from '@/composables/useTimelineMarqueeSelection'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import {
  TRACK_LABEL_WIDTH,
  getSamplesPerTick,
  pixelsToTicks,
  ticksToPixels
} from '@/utils/timeUtils'

const AUTO_SCROLL_PADDING = 96
const FIXED_TIMELINE_TICKS = 256

const dawStore = useDawStore()
const { seekToTime } = useTransportPlayback()
const { editingClipId, loopEnabled, loopEnd, loopStart, pixelsPerTick, playing, tickSize, time, tracks } =
  storeToRefs(dawStore)
const scrollContainer = ref(null)
const timelineSurfaceElement = ref(null)
let scrubPointerId = null

const {
  active: marqueeSelectionActive,
  handleSurfacePointerDown,
  marqueeStyle: marqueeSelectionStyle
} = useTimelineMarqueeSelection({
  dawStore,
  editingClipId,
  timelineSurfaceElement
})

const samplesPerTick = computed(() => getSamplesPerTick(tickSize.value))
const rulerMarks = computed(() => Array.from({ length: FIXED_TIMELINE_TICKS }, (_, index) => index))
const timelineWidthStyle = computed(() => `${ticksToPixels(FIXED_TIMELINE_TICKS, pixelsPerTick.value)}px`)

function handleWheel(event) {
  if ((!event.ctrlKey && !event.metaKey) || !scrollContainer.value) {
    return
  }

  event.preventDefault()

  const viewportLeft = scrollContainer.value.scrollLeft
  const viewportRight = viewportLeft + scrollContainer.value.clientWidth
  const previousPixelsPerTick = pixelsPerTick.value
  const previousPlayheadOffset = TRACK_LABEL_WIDTH + ticksToPixels(time.value, previousPixelsPerTick)
  const playheadWasVisible =
    previousPlayheadOffset >= viewportLeft && previousPlayheadOffset <= viewportRight
  const containerRect = scrollContainer.value.getBoundingClientRect()
  const pointerOffsetX = event.clientX - containerRect.left
  const timelineX = scrollContainer.value.scrollLeft + pointerOffsetX - TRACK_LABEL_WIDTH
  const anchorTick = Math.max(0, timelineX / previousPixelsPerTick)

  dawStore.adjustZoom(event.deltaY)

  const nextTimelineX = anchorTick * pixelsPerTick.value
  const nextScrollLeft = nextTimelineX - pointerOffsetX + TRACK_LABEL_WIDTH
  scrollContainer.value.scrollLeft = Math.max(0, nextScrollLeft)

  if (!playheadWasVisible) {
    return
  }

  const nextPlayheadOffset = TRACK_LABEL_WIDTH + ticksToPixels(time.value, pixelsPerTick.value)
  const nextViewportLeft = scrollContainer.value.scrollLeft
  const nextViewportRight = nextViewportLeft + scrollContainer.value.clientWidth

  if (nextPlayheadOffset < nextViewportLeft + AUTO_SCROLL_PADDING) {
    scrollContainer.value.scrollLeft = Math.max(0, nextPlayheadOffset - AUTO_SCROLL_PADDING)
    return
  }

  if (nextPlayheadOffset > nextViewportRight - AUTO_SCROLL_PADDING) {
    scrollContainer.value.scrollLeft = Math.max(
      0,
      nextPlayheadOffset - scrollContainer.value.clientWidth + AUTO_SCROLL_PADDING
    )
  }
}

function handleTimelineSurfacePointerDownCapture(event) {
  handleSurfacePointerDown(event)
}

function handleScrubPointerDown(event) {
  if (!scrollContainer.value || event.button !== 0) {
    return
  }

  scrubPointerId = event.pointerId
  void scrubToClientX(event.clientX)
  window.addEventListener('pointermove', handleScrubPointerMove)
  window.addEventListener('pointerup', handleScrubPointerEnd)
  window.addEventListener('pointercancel', handleScrubPointerEnd)
}

function handleScrubPointerMove(event) {
  if (scrubPointerId !== event.pointerId) {
    return
  }

  void scrubToClientX(event.clientX)
}

function handleScrubPointerEnd(event) {
  if (scrubPointerId !== event.pointerId) {
    return
  }

  scrubPointerId = null
  window.removeEventListener('pointermove', handleScrubPointerMove)
  window.removeEventListener('pointerup', handleScrubPointerEnd)
  window.removeEventListener('pointercancel', handleScrubPointerEnd)
}

async function scrubToClientX(clientX) {
  if (!scrollContainer.value) {
    return
  }

  const containerRect = scrollContainer.value.getBoundingClientRect()
  const timelineX = scrollContainer.value.scrollLeft + clientX - containerRect.left - TRACK_LABEL_WIDTH
  const nextTime = Math.min(
    FIXED_TIMELINE_TICKS,
    Math.max(0, pixelsToTicks(timelineX, pixelsPerTick.value))
  )

  await seekToTime(nextTime)
}

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

  const playheadOffset = TRACK_LABEL_WIDTH + ticksToPixels(nextTime, pixelsPerTick.value)
  const viewportLeft = scrollContainer.value.scrollLeft
  const viewportRight = viewportLeft + scrollContainer.value.clientWidth

  if (playheadOffset < viewportLeft + AUTO_SCROLL_PADDING) {
    scrollContainer.value.scrollLeft = Math.max(0, playheadOffset - AUTO_SCROLL_PADDING)
    return
  }

  if (playheadOffset > viewportRight - AUTO_SCROLL_PADDING) {
    scrollContainer.value.scrollLeft = playheadOffset - scrollContainer.value.clientWidth + AUTO_SCROLL_PADDING
  }
})

onBeforeUnmount(() => {
  scrubPointerId = null
  window.removeEventListener('pointermove', handleScrubPointerMove)
  window.removeEventListener('pointerup', handleScrubPointerEnd)
  window.removeEventListener('pointercancel', handleScrubPointerEnd)
})
</script>
