<template>
  <Panel
    class="relative flex min-h-[320px] flex-col"
    @dragenter="handleProjectFileDragEnter"
    @dragover.prevent="handleProjectFileDragOver"
    @dragleave="handleProjectFileDragLeave"
    @drop.prevent="handleProjectFileDrop"
  >
    <div
      v-if="projectFileDropVisible"
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/72 p-6 backdrop-blur-[2px]"
    >
      <div
        class="flex w-full max-w-md flex-col items-center gap-3 border-2 border-dashed border-cyan-400/50 bg-zinc-950/95 px-6 py-8 text-center shadow-2xl shadow-black/30"
      >
        <LoaderCircle
          v-if="projectFileDropLoading"
          class="h-8 w-8 animate-spin text-cyan-200"
          :stroke-width="2.25"
        />
        <FolderOpen
          v-else
          class="h-8 w-8 text-cyan-200"
          :stroke-width="2.25"
        />
        <p class="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">
          {{ projectFileDropLoading ? 'Opening Project' : 'Drop JSON To Open' }}
        </p>
        <p class="max-w-sm text-sm leading-6 text-zinc-300">
          {{
            projectFileDropLoading
              ? 'Loading the dropped project into DawBeat.'
              : 'Drop a DawBeat JSON project here to replace the current project.'
          }}
        </p>
      </div>
    </div>

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
          + Track
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
      v-if="editingGroup"
      class="mb-3 flex items-center justify-between rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-100"
    >
      <span class="font-semibold">Editing Group: {{ editingGroup.name }}</span>
      <button
        class="rounded border border-sky-400/40 bg-zinc-950/70 px-2 py-1 text-[11px] text-sky-100 hover:border-sky-300"
        type="button"
        @click="dawStore.exitGroupEdit()"
      >
        Exit
      </button>
    </div>

    <div
      ref="scrollContainer"
      class="relative flex-1 overflow-auto border border-zinc-800 bg-zinc-950/80"
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

        <div
          v-for="groupVisual in groupVisuals"
          :key="`${groupVisual.id}:background`"
          class="pointer-events-none absolute z-0 border"
          :class="groupVisual.isEditing ? 'border-sky-300/80' : ''"
          :style="groupVisual.style"
        />

        <TimelineVariableTrack
          v-for="(variableTrack, variableTrackIndex) in variableTracks"
          :key="variableTrack.name"
          :clip-lane-index="variableTrackIndex"
          :track-label-width="trackLabelWidth"
          :timeline-width="timelineWidthStyle"
          :variable-track="variableTrack"
        />

        <TimelineValueTrackerTrack
          v-for="(valueTrackerTrack, valueTrackerTrackIndex) in valueTrackerTracks"
          :key="valueTrackerTrack.id"
          :clip-lane-index="variableTracks.length + valueTrackerTrackIndex"
          :track-label-width="trackLabelWidth"
          :timeline-width="timelineWidthStyle"
          :value-tracker-track="valueTrackerTrack"
        />
        
        <TimelineTrack
          v-for="(track, index) in tracks"
          :key="track.id"
          :clip-lane-index="variableTracks.length + valueTrackerTracks.length + index"
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

        <div
          v-for="groupVisual in groupVisuals"
          :key="`${groupVisual.id}:label`"
          class="pointer-events-none absolute z-10"
          :style="{
            left: groupVisual.style.left,
            top: groupVisual.style.top,
            width: groupVisual.style.width,
            height: groupVisual.style.height
          }"
        >
          <button
            class="pointer-events-auto absolute left-1 top-1 inline-flex max-w-[calc(100%-8px)] items-center truncate rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            :class="groupVisual.isEditing ? 'border-sky-300/70 bg-zinc-900/90 text-sky-100' : 'border-zinc-400/45 bg-zinc-900/85 text-zinc-200 hover:border-zinc-300/60'"
            data-context-menu-enabled="true"
            type="button"
            @click.stop="handleGroupHeaderClick(groupVisual.id, { fromClick: true, shiftKey: $event.shiftKey })"
            @contextmenu.stop.prevent="handleGroupContextMenu($event, groupVisual.id)"
            @pointerdown.stop="handleGroupPointerDown($event, groupVisual.id)"
          >
            {{ groupVisual.name }}
          </button>
        </div>
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { FolderOpen, LoaderCircle } from 'lucide-vue-next'
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
import { createGroupContextMenuItems } from '@/services/groupContextMenuService'
import { enqueueSnackbar } from '@/services/notifications'
import { getFirstDraggedFile, hasFileDragPayload, openProjectFile } from '@/services/projectOpenService'
import { getTimelineTrackLabelWidth } from '@/services/timelineHeaderWidthService'
import { getDraggedTick, resolvePointerEventSnap, shouldSnapFromPointerEvent } from '@/services/snapService'
import { useDawStore } from '@/stores/dawStore'
import { getTrackColor } from '@/utils/colorUtils'
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
const { seekToTime, stop } = useTransportPlayback()
const { automationLanes, editingClipId, editingGroup, groups, loopEnabled, loopEnd, loopStart, pixelsPerTick, playing, selectedClipIds, tickSize, time, timelineAutoscrollEnabled, timelineSectionLabels, tracks, valueTrackerTracks, variableTracks } =
  storeToRefs(dawStore)
const scrollContainer = ref(null)
const timelineSurfaceElement = ref(null)
const draggingTrackId = ref(null)
const trackDropTarget = ref(null)
const projectFileDragDepth = ref(0)
const projectFileDropActive = ref(false)
const projectFileDropLoading = ref(false)
let scrubPointerId = null
const groupDragState = ref(null)
const ignoreNextGroupHeaderClick = ref(false)
const clipLaneMetrics = ref([])
let pendingLaneMetricSyncFrame = null

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
function createFallbackClipLaneMetrics() {
  const clipLaneHeights = [
    ...variableTracks.value.map((entry) => Number(entry?.height) || 44),
    ...valueTrackerTracks.value.map((entry) => Number(entry?.height) || 64),
    ...tracks.value.map((entry) => Number(entry?.height) || 80)
  ]
  let top = 0

  return clipLaneHeights.map((height, index) => {
    const metric = {
      height,
      index,
      top
    }

    top += height
    return metric
  })
}

function syncClipLaneMetricsFromDom() {
  const surfaceElement = timelineSurfaceElement.value

  if (!surfaceElement) {
    clipLaneMetrics.value = createFallbackClipLaneMetrics()
    return
  }

  const surfaceRect = surfaceElement.getBoundingClientRect()
  const laneElements = [...surfaceElement.querySelectorAll('[data-timeline-clip-lane-index]')]

  if (!laneElements.length) {
    clipLaneMetrics.value = createFallbackClipLaneMetrics()
    return
  }

  const nextMetrics = laneElements
    .map((laneElement) => {
      const laneIndex = Number(laneElement.getAttribute('data-timeline-clip-lane-index'))

      if (!Number.isInteger(laneIndex)) {
        return null
      }

      const laneRect = laneElement.getBoundingClientRect()

      return {
        height: laneRect.height,
        index: laneIndex,
        top: laneRect.top - surfaceRect.top
      }
    })
    .filter(Boolean)
    .sort((leftMetric, rightMetric) => leftMetric.index - rightMetric.index)

  clipLaneMetrics.value = nextMetrics.length ? nextMetrics : createFallbackClipLaneMetrics()
}

function scheduleClipLaneMetricSync() {
  if (pendingLaneMetricSyncFrame !== null) {
    cancelAnimationFrame(pendingLaneMetricSyncFrame)
  }

  pendingLaneMetricSyncFrame = requestAnimationFrame(() => {
    pendingLaneMetricSyncFrame = null
    syncClipLaneMetricsFromDom()
  })
}

function hexToRgba(hex, alpha = 1) {
  const normalizedHex = getTrackColor(hex).replace('#', '')

  return `rgba(${Number.parseInt(normalizedHex.slice(0, 2), 16)}, ${Number.parseInt(normalizedHex.slice(2, 4), 16)}, ${Number.parseInt(normalizedHex.slice(4, 6), 16)}, ${alpha})`
}

function getClipLaneColor(trackIndex) {
  if (trackIndex < variableTracks.value.length) {
    return '#e4e4e7'
  }

  const valueTrackerStartIndex = variableTracks.value.length
  const valueTrackerEndIndex = valueTrackerStartIndex + valueTrackerTracks.value.length

  if (trackIndex >= valueTrackerStartIndex && trackIndex < valueTrackerEndIndex) {
    return '#f59e0b'
  }

  const formulaTrackIndex = trackIndex - valueTrackerEndIndex
  return getTrackColor(tracks.value[formulaTrackIndex]?.color)
}

const selectedClipIdSet = computed(() => new Set(selectedClipIds.value))
const projectFileDropVisible = computed(() =>
  projectFileDropActive.value || projectFileDropLoading.value
)
const groupVisuals = computed(() => {
  const laneMetricsByIndex = new Map(clipLaneMetrics.value.map((metric) => [metric.index, metric]))

  return groups.value
    .map((group) => {
      const maxTrackOffset = Math.max(0, ...(group.clips ?? []).map((groupClip) => groupClip.trackOffset ?? 0))
      const firstMetric = laneMetricsByIndex.get(group.trackIndex)
      const lastMetric = laneMetricsByIndex.get(group.trackIndex + maxTrackOffset)

      if (!firstMetric || !lastMetric) {
        return null
      }

      const top = firstMetric.top
      const height = (lastMetric.top + lastMetric.height) - firstMetric.top
      const selectedClipCount = (group.clips ?? []).filter((entry) => selectedClipIdSet.value.has(entry.clipId)).length
      const laneColor = getClipLaneColor(group.trackIndex)

      return {
        id: group.id,
        isEditing: editingGroup.value?.id === group.id,
        isSelected: selectedClipCount > 0 && selectedClipCount === (group.clips?.length ?? 0),
        name: group.name,
        style: {
          backgroundColor: hexToRgba(laneColor, editingGroup.value?.id === group.id ? 0.28 : 0.5),
          borderColor: editingGroup.value?.id === group.id ? undefined : hexToRgba(laneColor, 0.42),
          left: `${trackLabelWidth.value + ticksToPixels(group.start, pixelsPerTick.value)}px`,
          top: `${top}px`,
          width: `${Math.max(1, ticksToPixels(group.duration, pixelsPerTick.value))}px`,
          height: `${Math.max(1, height)}px`
        }
      }
    })
    .filter(Boolean)
})

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

function resetProjectFileDropState() {
  projectFileDragDepth.value = 0
  projectFileDropActive.value = false
}

function handleProjectFileDragEnter(event) {
  if (projectFileDropLoading.value || !hasFileDragPayload(event.dataTransfer)) {
    return
  }

  projectFileDragDepth.value += 1
  projectFileDropActive.value = true
}

function handleProjectFileDragOver(event) {
  if (projectFileDropLoading.value || !hasFileDragPayload(event.dataTransfer)) {
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }

  projectFileDropActive.value = true
}

function handleProjectFileDragLeave(event) {
  if (!hasFileDragPayload(event.dataTransfer)) {
    return
  }

  projectFileDragDepth.value = Math.max(0, projectFileDragDepth.value - 1)

  if (projectFileDragDepth.value === 0 && !projectFileDropLoading.value) {
    projectFileDropActive.value = false
  }
}

async function handleProjectFileDrop(event) {
  if (!hasFileDragPayload(event.dataTransfer)) {
    return
  }

  const file = getFirstDraggedFile(event.dataTransfer)
  resetProjectFileDropState()

  if (!file) {
    return
  }

  projectFileDropLoading.value = true

  try {
    await openProjectFile({
      dawStore,
      file,
      stopPlayback: stop
    })
  } catch (error) {
    if (error?.code === 'invalid-project-file') {
      enqueueSnackbar('Invalid project file', { variant: 'error' })
      projectFileDropLoading.value = false
      return
    }

    console.error('Could not open the dropped project', error)
    enqueueSnackbar('Could not open the project.', { variant: 'error' })
    projectFileDropLoading.value = false
    return
  }

  projectFileDropLoading.value = false
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

function getGroupById(groupId) {
  return groups.value.find((group) => group.id === groupId) ?? null
}

function isGroupFullySelected(group) {
  const groupClipIds = Array.isArray(group?.clips)
    ? group.clips.map((entry) => entry?.clipId).filter(Boolean)
    : []

  return Boolean(groupClipIds.length) && groupClipIds.every((clipId) => selectedClipIdSet.value.has(clipId))
}

function handleGroupHeaderClick(groupId, payload = {}) {
  if (payload?.fromClick && ignoreNextGroupHeaderClick.value) {
    ignoreNextGroupHeaderClick.value = false
    return
  }

  const group = getGroupById(groupId)

  if (!group) {
    return
  }

  const groupClipIds = (group.clips ?? []).map((entry) => entry.clipId).filter(Boolean)

  if (!groupClipIds.length) {
    return
  }

  const preserveMultiSelection = payload?.preserveMultiSelection === true
  const shiftSelectionAction = payload?.shiftKey === true
    ? (isGroupFullySelected(group) ? 'remove' : 'add')
    : null

  if (shiftSelectionAction === 'remove') {
    dawStore.removeSelectedClipIds(groupClipIds)
    return
  }

  if (shiftSelectionAction === 'add') {
    dawStore.addSelectedClips(groupClipIds)
    return
  }

  if (!preserveMultiSelection || !isGroupFullySelected(group) || selectedClipIds.value.length === groupClipIds.length) {
    dawStore.setSelectedClips(groupClipIds)
  }
}

function handleGroupContextMenu(event, groupId) {
  const group = getGroupById(groupId)

  if (!group) {
    return
  }

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: createGroupContextMenuItems(group)
  })
}

function handleGroupPointerDown(event, groupId) {
  if (event.button !== 0) {
    return
  }

  const group = getGroupById(groupId)

  if (!group) {
    return
  }

  event.preventDefault()
  ignoreNextGroupHeaderClick.value = true

  if (event.shiftKey) {
    handleGroupHeaderClick(groupId, { shiftKey: true })
    return
  }

  handleGroupHeaderClick(groupId, { preserveMultiSelection: true })

  const pointerLaneIndex = getLaneIndexFromClientY(event.clientY)

  dawStore.beginHistoryTransaction('move-group')
  groupDragState.value = {
    groupId,
    pointerStartLaneIndex: pointerLaneIndex,
    startClientX: event.clientX,
    startStart: group.start,
    startTrackIndex: group.trackIndex,
    transactionActive: Boolean(dawStore.historyTransaction)
  }

  window.addEventListener('pointermove', handleGroupPointerMove)
  window.addEventListener('pointerup', handleGroupPointerUp)
  window.addEventListener('pointercancel', handleGroupPointerCancel)
}

function handleGroupPointerMove(event) {
  if (!groupDragState.value) {
    return
  }

  const shouldSnap = dawStore.snapToGridEnabled && event.shiftKey !== true
  const deltaX = event.clientX - groupDragState.value.startClientX
  const deltaTicks = deltaX / pixelsPerTick.value
  const targetLaneIndex = getLaneIndexFromClientY(event.clientY)
  const laneDelta = targetLaneIndex - groupDragState.value.pointerStartLaneIndex

  dawStore.moveGroup(
    groupDragState.value.groupId,
    groupDragState.value.startStart + deltaTicks,
    groupDragState.value.startTrackIndex + laneDelta,
    shouldSnap
  )
}

function handleGroupPointerUp() {
  if (!groupDragState.value) {
    return
  }

  if (groupDragState.value.transactionActive) {
    dawStore.commitHistoryTransaction()
  }

  cleanupGroupDrag()
  window.setTimeout(() => {
    ignoreNextGroupHeaderClick.value = false
  }, 0)
}

function handleGroupPointerCancel() {
  if (!groupDragState.value) {
    return
  }

  dawStore.moveGroup(
    groupDragState.value.groupId,
    groupDragState.value.startStart,
    groupDragState.value.startTrackIndex,
    false
  )

  if (groupDragState.value.transactionActive) {
    dawStore.cancelHistoryTransaction()
  }

  cleanupGroupDrag()
  window.setTimeout(() => {
    ignoreNextGroupHeaderClick.value = false
  }, 0)
}

function cleanupGroupDrag() {
  groupDragState.value = null
  window.removeEventListener('pointermove', handleGroupPointerMove)
  window.removeEventListener('pointerup', handleGroupPointerUp)
  window.removeEventListener('pointercancel', handleGroupPointerCancel)
}

function getLaneIndexFromClientY(clientY) {
  const surfaceRect = timelineSurfaceElement.value?.getBoundingClientRect()

  if (!surfaceRect || !clipLaneMetrics.value.length) {
    return 0
  }

  const relativeY = Math.max(0, clientY - surfaceRect.top)

  for (const laneMetric of clipLaneMetrics.value) {
    const laneEnd = laneMetric.top + laneMetric.height

    if (relativeY < laneEnd) {
      return laneMetric.index
    }
  }

  return clipLaneMetrics.value[clipLaneMetrics.value.length - 1].index
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

watch(
  [
    () => variableTracks.value.map((track) => Number(track?.height) || 44),
    () => valueTrackerTracks.value.map((track) => Number(track?.height) || 64),
    () => tracks.value.map((track) => Number(track?.height) || 80),
    () => variableTracks.value.length,
    () => valueTrackerTracks.value.length,
    () => tracks.value.length,
    () => groups.value.length,
    () => pixelsPerTick.value,
    () => trackLabelWidth.value
  ],
  () => {
    scheduleClipLaneMetricSync()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleClipLaneMetricSync)

  if (pendingLaneMetricSyncFrame !== null) {
    cancelAnimationFrame(pendingLaneMetricSyncFrame)
    pendingLaneMetricSyncFrame = null
  }

  cleanupTrackReorder()
  cleanupGroupDrag()
  scrubPointerId = null
  window.removeEventListener('dawbeat:timeline-zoom-command', handleZoomCommand)
  window.removeEventListener('pointermove', handleScrubPointerMove)
  window.removeEventListener('pointerup', handleScrubPointerEnd)
  window.removeEventListener('pointercancel', handleScrubPointerEnd)
})

onMounted(() => {
  window.addEventListener('dawbeat:timeline-zoom-command', handleZoomCommand)
  window.addEventListener('resize', scheduleClipLaneMetricSync)
  nextTick(() => {
    scheduleClipLaneMetricSync()
  })
})
</script>
