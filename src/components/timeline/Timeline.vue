<template>
  <Panel class="flex min-h-[320px] flex-col">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Timeline</p>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          class="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-50"
          type="button"
          @click="dawStore.addTrack()"
        >
          + Formula
        </button>

        <button
          class="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-50"
          type="button"
          @click="dawStore.addVariableTrack()"
        >
          + Variable
        </button>

        <button
          class="rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-700 hover:text-zinc-50"
          type="button"
          @click="dawStore.addValueTrackerTrack()"
        >
          + Value
        </button>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="flex-1 overflow-auto border border-zinc-800 bg-zinc-950/80"
      data-timeline-scroll-container="true"
      @wheel="handleWheel"
    >
      <div class="sticky top-0 z-20 flex min-w-full w-max border-b border-zinc-800 bg-zinc-900/95">
        <div
          class="sticky left-0 z-30 flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-4 text-[10px] uppercase tracking-[0.3em] text-zinc-500"
          :style="{ width: `${trackLabelWidth}px` }"
        >
          Timeline
        </div>

        <div class="relative h-16 shrink-0" :style="rulerStyle">
          <TimelineLoopRegion
            :loop-enabled="loopEnabled"
            :loop-start="loopStart"
            :loop-end="loopEnd"
          />

          <TimelineSectionLabels
            :timeline-width="timelineWidthStyle"
            @scrub-pointerdown="handleScrubPointerDown"
          />

          <span
            v-for="mark in rulerMarks"
            :key="mark"
            class="absolute top-8 text-[10px] text-zinc-500"
            :style="{ left: `${ticksToPixels(mark, pixelsPerTick)}px`, transform: 'translateX(8px)' }"
          >
            {{ mark }}
          </span>

          <button
            class="absolute inset-0 z-10 cursor-grab"
            data-context-menu-enabled="true"
            type="button"
            @contextmenu="handleRulerContextMenu"
            @pointerdown="handleScrubPointerDown"
          />
        </div>
      </div>

      <div
        ref="timelineSurfaceElement"
        class="relative"
        @pointerdown.capture="handleTimelineSurfacePointerDownCapture"
      >
        <div class="pointer-events-none absolute inset-0 z-10">
          <div
            v-for="timelineSectionLabel in timelineSectionLabels"
            :key="timelineSectionLabel.id"
            class="absolute inset-y-0 w-px border-l border-dashed border-sky-400/20"
            :style="{ left: `${trackLabelWidth + ticksToPixels(timelineSectionLabel.time, pixelsPerTick)}px` }"
          />
        </div>

        <Playhead
          :time="time"
          :offset="trackLabelWidth"
          @pointerdown="handleScrubPointerDown"
        />

        <div
          v-if="marqueeSelectionActive && marqueeSelectionStyle"
          class="pointer-events-none absolute z-20"
          :style="marqueeSelectionStyle"
        />

        <TimelineVariableTrack
          v-for="variableTrack in variableTracks"
          :key="variableTrack.name"
          :track-label-width="trackLabelWidth"
          :timeline-width="timelineWidthStyle"
          :variable-track="variableTrack"
        />

        <TimelineValueTrackerTrack
          v-for="valueTrackerTrack in valueTrackerTracks"
          :key="valueTrackerTrack.id"
          :track-label-width="trackLabelWidth"
          :timeline-width="timelineWidthStyle"
          :value-tracker-track="valueTrackerTrack"
        />
        
        <TimelineTrack
          v-for="(track, index) in tracks"
          :key="track.id"
          :is-track-reorder-source="draggingTrackId === track.id"
          :track-label-width="trackLabelWidth"
          :track-index="index"
          :track-reorder-active="trackDropTarget?.trackId === track.id"
          :track-reorder-color="draggingTrackColor"
          :track-reorder-placement="
            trackDropTarget?.trackId === track.id ? trackDropTarget.placement : null
          "
          :track="track"
          :timeline-width="timelineWidthStyle"
          @track-reorder-drop="handleTrackReorderDrop"
          @track-reorder-end="handleTrackReorderEnd"
          @track-reorder-over="handleTrackReorderOver"
          @track-reorder-start="handleTrackReorderStart"
        />

        <TimelineAutomationLane
          v-for="lane in automationLanes"
          :key="lane.id"
          :lane="lane"
          :track-label-width="trackLabelWidth"
          :timeline-width="timelineWidthStyle"
        />
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getPlaybackEndTick } from '@/engine/timelineEngine'
import Panel from '@/components/ui/Panel.vue'
import TimelineAutomationLane from '@/components/timeline/TimelineAutomationLane.vue'
import Playhead from '@/components/timeline/Playhead.vue'
import TimelineLoopRegion from '@/components/timeline/TimelineLoopRegion.vue'
import TimelineSectionLabels from '@/components/timeline/TimelineSectionLabels.vue'
import TimelineTrack from '@/components/timeline/TimelineTrack.vue'
import TimelineVariableTrack from '@/components/timeline/TimelineVariableTrack.vue'
import TimelineValueTrackerTrack from '@/components/timeline/TimelineValueTrackerTrack.vue'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineMarqueeSelection } from '@/composables/useTimelineMarqueeSelection'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { getTimelineTrackLabelWidth } from '@/services/timelineHeaderWidthService'
import { getDraggedTick, resolvePointerEventSnap, shouldSnapFromPointerEvent } from '@/services/snapService'
import { useDawStore } from '@/stores/dawStore'
import {
  BASE_PIXELS_PER_TICK,
  getVisibleTimelineTickStep,
  getSamplesPerTick,
  pixelsToTicks,
  snapTicks,
  ticksToPixels
} from '@/utils/timeUtils'

const AUTO_SCROLL_PADDING = 96
const FIXED_TIMELINE_TICKS = 256

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { seekToTime } = useTransportPlayback()
const { automationLanes, editingClipId, loopEnabled, loopEnd, loopStart, pixelsPerTick, playing, tickSize, time, timelineAutoscrollEnabled, timelineSectionLabels, tracks, valueTrackerTracks, variableTracks } =
  storeToRefs(dawStore)
const scrollContainer = ref(null)
const timelineSurfaceElement = ref(null)
const draggingTrackId = ref(null)
const trackDropTarget = ref(null)
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
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))
const rulerMarks = computed(() => {
  const marks = []

  for (let tick = 0; tick < FIXED_TIMELINE_TICKS; tick += visibleTickStep.value) {
    marks.push(tick)
  }

  return marks
})
const trackLabelWidth = computed(() =>
  getTimelineTrackLabelWidth({
    automationLanes: automationLanes.value,
    tracks: tracks.value,
    valueTrackerTracks: valueTrackerTracks.value,
    variableTracks: variableTracks.value
  })
)
const timelineWidthStyle = computed(() => `${ticksToPixels(FIXED_TIMELINE_TICKS, pixelsPerTick.value)}px`)
const draggingTrackColor = computed(
  () => tracks.value.find((track) => track.id === draggingTrackId.value)?.color ?? null
)
const rulerStyle = computed(() => ({
  width: timelineWidthStyle.value,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.5) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))

function getPlayheadOffset(timeTicks, pixelsPerTickValue = pixelsPerTick.value) {
  return trackLabelWidth.value + ticksToPixels(timeTicks, pixelsPerTickValue)
}

function getVisibleTimelineBounds(scrollLeft = scrollContainer.value?.scrollLeft ?? 0) {
  const clientWidth = scrollContainer.value?.clientWidth ?? 0

  return {
    left: scrollLeft + trackLabelWidth.value,
    right: scrollLeft + clientWidth
  }
}

function scrollOffsetIntoView(contentOffset, padding = AUTO_SCROLL_PADDING) {
  if (!scrollContainer.value) {
    return
  }

  const { left, right } = getVisibleTimelineBounds(scrollContainer.value.scrollLeft)

  if (contentOffset < left + padding) {
    scrollContainer.value.scrollLeft = Math.max(
      0,
      contentOffset - trackLabelWidth.value - padding
    )
    return
  }

  if (contentOffset > right - padding) {
    scrollContainer.value.scrollLeft = Math.max(
      0,
      contentOffset - scrollContainer.value.clientWidth + padding
    )
  }
}

function handleWheel(event) {
  if ((!event.ctrlKey && !event.metaKey) || !scrollContainer.value) {
    return
  }

  event.preventDefault()

  const previousPixelsPerTick = pixelsPerTick.value
  const previousPlayheadOffset = getPlayheadOffset(time.value, previousPixelsPerTick)
  const previousVisibleBounds = getVisibleTimelineBounds(scrollContainer.value.scrollLeft)
  const playheadWasVisible =
    previousPlayheadOffset >= previousVisibleBounds.left && previousPlayheadOffset <= previousVisibleBounds.right
  const containerRect = scrollContainer.value.getBoundingClientRect()
  const pointerOffsetX = event.clientX - containerRect.left
  const timelineX = scrollContainer.value.scrollLeft + pointerOffsetX - trackLabelWidth.value
  const anchorTick = Math.max(0, timelineX / previousPixelsPerTick)

  dawStore.adjustZoom(event.deltaY)

  const nextTimelineX = anchorTick * pixelsPerTick.value
  const nextScrollLeft = nextTimelineX - pointerOffsetX + trackLabelWidth.value
  scrollContainer.value.scrollLeft = Math.max(0, nextScrollLeft)

  if (!playheadWasVisible) {
    return
  }

  const nextPlayheadOffset = getPlayheadOffset(time.value)
  scrollOffsetIntoView(nextPlayheadOffset)
}

function handleTimelineSurfacePointerDownCapture(event) {
  dawStore.clearTimelineSectionLabelSelection()
  handleSurfacePointerDown(event)
}

function handleTrackReorderStart(trackId) {
  draggingTrackId.value = trackId
  trackDropTarget.value = null
}

function handleTrackReorderOver(target) {
  if (!draggingTrackId.value || !target?.trackId || draggingTrackId.value === target.trackId) {
    trackDropTarget.value = null
    return
  }

  trackDropTarget.value = target
}

function handleTrackReorderDrop(target) {
  if (!draggingTrackId.value || !target?.trackId || draggingTrackId.value === target.trackId) {
    cleanupTrackReorder()
    return
  }

  dawStore.reorderTrack(draggingTrackId.value, target.trackId, target.placement)
  cleanupTrackReorder()
}

function handleTrackReorderEnd() {
  cleanupTrackReorder()
}

function handleScrubPointerDown(event) {
  if (!scrollContainer.value || event.button !== 0) {
    return
  }

  dawStore.clearTimelineSectionLabelSelection()
  scrubPointerId = event.pointerId
  void scrubToClientX(event.clientX)
  window.addEventListener('pointermove', handleScrubPointerMove)
  window.addEventListener('pointerup', handleScrubPointerEnd)
  window.addEventListener('pointercancel', handleScrubPointerEnd)
}

function handleRulerContextMenu(event) {
  if (!scrollContainer.value) {
    return
  }

  event.preventDefault()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'create-timeline-section-label',
        label: 'Add Section Label',
        time: getTimelineTickFromClientX(
          event.clientX,
          resolvePointerEventSnap(event, dawStore.snapToGridEnabled)
        )
      }
    ]
  })
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

  const timelineX = getTimelinePixelsFromClientX(clientX)
  const nextTime = Math.min(
    FIXED_TIMELINE_TICKS,
    Math.max(0, snapTicks(pixelsToTicks(timelineX, pixelsPerTick.value), 1))
  )

  await seekToTime(nextTime)
}

function getTimelinePixelsFromClientX(clientX) {
  if (!scrollContainer.value) {
    return 0
  }

  const containerRect = scrollContainer.value.getBoundingClientRect()
  return scrollContainer.value.scrollLeft + clientX - containerRect.left - trackLabelWidth.value
}

function getTimelineTickFromClientX(clientX, shouldSnap = true) {
  return getDraggedTick(
    pixelsToTicks(getTimelinePixelsFromClientX(clientX), pixelsPerTick.value),
    shouldSnap,
    dawStore.snapSubdivision
  )
}

function cleanupTrackReorder() {
  draggingTrackId.value = null
  trackDropTarget.value = null
}

async function handleZoomCommand(event) {
  const command = event?.detail?.command

  if (!command || !scrollContainer.value) {
    return
  }

  if (command === 'reset-zoom') {
    dawStore.setZoom(1)
    return
  }

  const visibleTimelineWidth = Math.max(1, scrollContainer.value.clientWidth - trackLabelWidth.value)

  if (command === 'zoom-to-loop') {
    const loopDuration = Math.max(1 / dawStore.snapSubdivision, loopEnd.value - loopStart.value)
    const nextZoom = visibleTimelineWidth / (BASE_PIXELS_PER_TICK * loopDuration)

    dawStore.setZoom(nextZoom)
    await nextTick()
    scrollContainer.value.scrollLeft = Math.max(0, ticksToPixels(loopStart.value, pixelsPerTick.value))
    return
  }

  if (command === 'zoom-to-fit-project') {
    const projectEndTick = Math.max(
      1,
      getPlaybackEndTick(tracks.value, variableTracks.value, valueTrackerTracks.value)
    )
    const nextZoom = visibleTimelineWidth / (BASE_PIXELS_PER_TICK * projectEndTick)

    dawStore.setZoom(nextZoom)
    await nextTick()
    scrollContainer.value.scrollLeft = 0
  }
}

watch(time, (nextTime) => {
  if (!scrollContainer.value) {
    return
  }

  if (!timelineAutoscrollEnabled.value) {
    return
  }

  if (!playing.value && nextTime === 0) {
    scrollContainer.value.scrollLeft = 0
    return
  }

  if (!playing.value) {
    return
  }

  const playheadOffset = getPlayheadOffset(nextTime)
  scrollOffsetIntoView(playheadOffset)
})

onBeforeUnmount(() => {
  cleanupTrackReorder()
  scrubPointerId = null
  window.removeEventListener('dawbeat:timeline-zoom-command', handleZoomCommand)
  window.removeEventListener('pointermove', handleScrubPointerMove)
  window.removeEventListener('pointerup', handleScrubPointerEnd)
  window.removeEventListener('pointercancel', handleScrubPointerEnd)
})

onMounted(() => {
  window.addEventListener('dawbeat:timeline-zoom-command', handleZoomCommand)
})
</script>
