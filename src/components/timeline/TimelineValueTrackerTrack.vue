<template>
  <div
    class="relative flex min-w-full w-max border-b border-zinc-800 bg-zinc-950/45"
    :data-clip-lane-id="valueTrackerTrack.id"
    :data-value-tracker-track-id="valueTrackerTrack.id"
    :style="trackStyle"
  >
    <div
      class="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-2 transition-colors"
      data-context-menu-enabled="true"
      :class="selectedHeaderClassName"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
      @contextmenu="handleHeaderContextMenu"
    >
      <button
        class="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border text-[10px] transition-colors"
        :class="keyboardButtonClassName"
        title="Keyboard Override Target"
        type="button"
        @click.stop="handleKeyboardTargetToggle"
      >
        <Keyboard class="h-3.5 w-3.5" />
      </button>
      <span
        v-if="isRecordingTrack"
        class="mt-1 inline-flex w-fit items-center rounded border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-rose-200"
      >
        REC
      </span>
      <span class="mt-1 truncate text-sm text-zinc-100">{{ valueTrackerTrack.name }}</span>
      <span
        v-if="showBindingSummary"
        class="mt-1 truncate text-[10px]"
        :class="bindingClassName"
      >
        {{ bindingSummary }}
      </span>
    </div>

    <div
      ref="laneElement"
      class="relative z-0 shrink-0"
      data-context-menu-enabled="true"
      data-timeline-track-lane="true"
      :class="laneClassName"
      :style="laneStyle"
      @contextmenu="handleLaneContextMenu"
      @dragover.prevent="handleLaneDragOver"
      @dragleave="handleLaneDragLeave"
      @drop.prevent="handleLaneDrop"
      @pointerdown="handleLanePointerDown"
    >
      <TimelineClipPreview
        v-if="creationPreview"
        :start="creationPreview.start"
        :duration="creationPreview.duration"
      />

      <TimelineClipPreview
        v-if="dragPreview"
        :start="dragPreview.start"
        :duration="dragPreview.duration"
      />

      <TimelineValueTrackerClip
        v-if="recordingPreviewClip"
        :clip="recordingPreviewClip"
        preview
        :value-tracker-track-id="valueTrackerTrack.id"
      />

      <TimelineValueTrackerClip
        v-for="clip in valueTrackerTrack.clips"
        :key="clip.id"
        :clip="clip"
        :value-tracker-track-id="valueTrackerTrack.id"
      />
    </div>

    <button
      class="absolute inset-x-0 bottom-0 z-30 h-2 cursor-row-resize"
      title="Resize value tracker height"
      type="button"
      @pointerdown.stop="handleResizePointerDown"
    >
      <span class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-zinc-700/80" />
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Keyboard } from 'lucide-vue-next'
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import TimelineValueTrackerClip from '@/components/timeline/TimelineValueTrackerClip.vue'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineLaneResize } from '@/composables/useTimelineLaneResize'
import { getMidiInputDisplayName, midiState } from '@/services/midiInputService'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { buildCreatedClip, clampClipPlacementStart, getTrackCreateBounds } from '@/services/timelineService'
import { createSparseRecordedValueTrackerValues, getValueTrackerBindingSummary } from '@/services/valueTrackerService'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_LABEL_WIDTH, getVisibleTimelineTickStep, pixelsToTicks, ticksToPixels } from '@/utils/timeUtils'

const DRAG_THRESHOLD_PX = 6

const props = defineProps({
  timelineWidth: {
    type: String,
    required: true
  },
  valueTrackerTrack: {
    type: Object,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { canPasteClipsAtPlayhead, clipDragPreview, pixelsPerTick, selectedValueTrackerTrackId, time, valueTrackerLibraryItems, valueTrackerRecordingSession } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)
const isLibraryDropTarget = ref(false)

let creationAnchorTick = 0
let creationBounds = null
let creationHistoryActive = false
let creationStartX = 0
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))
const laneHeight = computed(() => props.valueTrackerTrack.height)
const showBindingSummary = computed(() => laneHeight.value >= 72)

const trackStyle = computed(() => ({
  '--track-color': '#f59e0b',
  '--track-color-border': '#b45309',
  '--track-color-light': '#fbbf24'
}))

const laneStyle = computed(() => ({
  height: `${laneHeight.value}px`,
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.45) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))
const isSelectedTrack = computed(() => selectedValueTrackerTrackId.value === props.valueTrackerTrack.id)
const isRecordingTrack = computed(() => valueTrackerRecordingSession.value?.trackId === props.valueTrackerTrack.id)
const selectedHeaderClassName = computed(() =>
  isRecordingTrack.value
    ? 'bg-rose-950/80 text-zinc-50 ring-1 ring-inset ring-rose-400/45'
    : isSelectedTrack.value
      ? 'bg-zinc-800 text-zinc-100'
      : 'bg-zinc-900 text-zinc-200'
)
const laneClassName = computed(() =>
  isLibraryDropTarget.value
    ? 'ring-1 ring-inset ring-amber-200/55'
    : isRecordingTrack.value
      ? 'ring-1 ring-inset ring-rose-400/45'
      : isSelectedTrack.value
        ? 'ring-1 ring-inset ring-amber-300/35'
        : ''
)
const keyboardButtonClassName = computed(() => {
  if (isRecordingTrack.value) {
    return 'border-rose-300 bg-rose-300 text-zinc-950 hover:border-rose-200 hover:bg-rose-200'
  }

  if (isSelectedTrack.value) {
    return 'border-yellow-300 bg-yellow-300 text-zinc-950 hover:border-yellow-200 hover:bg-yellow-200'
  }

  return 'border-yellow-300/45 bg-zinc-900/70 text-zinc-400 hover:border-yellow-200 hover:text-zinc-200'
})
const bindingSummary = computed(() =>
  getValueTrackerBindingSummary(props.valueTrackerTrack.binding, getMidiInputDisplayName)
)
const bindingClassName = computed(() => {
  const bindingType = props.valueTrackerTrack.binding?.type

  if (bindingType === 'midiCc' || bindingType === 'midiNote') {
    if (!props.valueTrackerTrack.binding?.deviceId) {
      return 'text-emerald-300/80'
    }

    const connected = midiState.inputs.some((midiInput) => midiInput.id === props.valueTrackerTrack.binding.deviceId)
    return connected ? 'text-emerald-300/80' : 'text-amber-300/80'
  }

  return 'text-zinc-500'
})

const dragPreview = computed(() => {
  if (clipDragPreview.value?.targetLaneId !== props.valueTrackerTrack.id) {
    return null
  }

  return clipDragPreview.value
})
const recordingPreviewClip = computed(() => {
  const recordingSession = valueTrackerRecordingSession.value

  if (!recordingSession || recordingSession.trackId !== props.valueTrackerTrack.id) {
    return null
  }

  const stepSubdivision = Math.max(1, Math.round(Number(recordingSession.stepSubdivision) || 0))
  const plannedStopTick = Number(recordingSession.plannedStopTick)
  const liveStopTick = Number.isFinite(plannedStopTick)
    ? Math.min(Number(time.value) || recordingSession.startTick, plannedStopTick)
    : Number(time.value) || recordingSession.startTick
  const normalizedStopTick = Math.max(
    recordingSession.startTick + 1,
    Math.floor(Math.max(recordingSession.startTick, liveStopTick) * stepSubdivision) / stepSubdivision
  )
  const duration = normalizedStopTick - recordingSession.startTick

  return {
    duration,
    id: `recording-preview:${props.valueTrackerTrack.id}`,
    start: recordingSession.startTick,
    stepSubdivision,
    values: createSparseRecordedValueTrackerValues(recordingSession.capturedSteps, {
      duration,
      initialValue: recordingSession.initialHeldValue,
      stepSubdivision
    })
  }
})

const { cleanupResize, handleResizePointerDown } = useTimelineLaneResize({
  dawStore,
  getHeight: () => laneHeight.value,
  historyLabel: 'resize-value-tracker-height',
  setHeight: (height) => {
    dawStore.setValueTrackerTrackHeight(props.valueTrackerTrack.id, height)
  }
})

function handleHeaderContextMenu(event) {
  event.preventDefault()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'edit-value-tracker-track-name',
        label: 'Rename Value Tracker',
        valueTrackerTrackId: props.valueTrackerTrack.id,
        valueTrackerTrackName: props.valueTrackerTrack.name
      },
      {
        action: 'edit-value-tracker-track-binding',
        label: 'Edit Binding',
        valueTrackerTrackBinding: props.valueTrackerTrack.binding,
        valueTrackerTrackId: props.valueTrackerTrack.id,
        valueTrackerTrackName: props.valueTrackerTrack.name
      },
      {
        action: 'delete-value-tracker-track',
        label: 'Delete Value Tracker',
        valueTrackerTrackId: props.valueTrackerTrack.id
      }
    ]
  })
}

function handleKeyboardTargetToggle() {
  dawStore.toggleValueTrackerTrackKeyboardTarget(props.valueTrackerTrack.id)
}

function handleLaneContextMenu(event) {
  if (!laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  event.preventDefault()

  const start = clampClipPlacementStart(props.valueTrackerTrack, getPointerTick(event), 1)
  const items = [
    {
      action: 'create-value-tracker-clip-at-position',
      duration: 1,
      label: 'New Value Tracker Clip',
      start,
      valueTrackerTrackId: props.valueTrackerTrack.id
    }
  ]

  if (canPasteClipsAtPlayhead.value) {
    items.push({
      action: 'paste-clips',
      label: 'Paste'
    })
  }

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items
  })
}

function handleLanePointerDown(event) {
  if (event.button !== 0 || !laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  dawStore.clearClipSelection()

  const pointerTick = getPointerTick(event)
  const nextBounds = getTrackCreateBounds(props.valueTrackerTrack, pointerTick)

  if (!nextBounds || !buildCreatedClip(pointerTick, pointerTick, nextBounds)) {
    return
  }

  event.preventDefault()
  dawStore.beginHistoryTransaction('create-value-tracker-clip')
  creationHistoryActive = Boolean(dawStore.historyTransaction)

  creationStartX = event.clientX
  creationAnchorTick = pointerTick
  creationBounds = nextBounds

  window.addEventListener('pointermove', handleCreationPointerMove)
  window.addEventListener('pointerup', handleCreationPointerUp)
  window.addEventListener('pointercancel', handleCreationPointerCancel)
}

function handleLaneDragOver(event) {
  if (!getDroppedValueTrackerLibraryItemId(event)) {
    return
  }

  isLibraryDropTarget.value = true
}

function handleLaneDragLeave(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) {
    return
  }

  isLibraryDropTarget.value = false
}

function handleLaneDrop(event) {
  const valueTrackerLibraryItemId = getDroppedValueTrackerLibraryItemId(event)
  isLibraryDropTarget.value = false

  if (!valueTrackerLibraryItemId) {
    return
  }

  const valueTrackerLibraryItem = valueTrackerLibraryItems.value.find(
    (item) => item.id === valueTrackerLibraryItemId
  )

  if (!valueTrackerLibraryItem) {
    return
  }

  const dragOffsetPx = getDroppedValueTrackerLibraryOffsetPx(event)
  const start = clampClipPlacementStart(
    props.valueTrackerTrack,
    getPointerTick(event, dragOffsetPx),
    valueTrackerLibraryItem.duration
  )

  dawStore.recordHistoryStep('drop-value-tracker-library-to-track', () => {
    dawStore.addValueTrackerClip(props.valueTrackerTrack.id, {
      duration: valueTrackerLibraryItem.duration,
      start,
      stepSubdivision: valueTrackerLibraryItem.stepSubdivision,
      values: [...(valueTrackerLibraryItem.values ?? [])]
    })
  })
}

function handleCreationPointerMove(event) {
  if (!creationBounds) {
    return
  }

  const deltaX = Math.abs(event.clientX - creationStartX)

  if (!creationPreview.value && deltaX <= DRAG_THRESHOLD_PX) {
    return
  }

  const draftClip = buildCreatedClip(creationAnchorTick, getPointerTick(event), creationBounds)

  if (!draftClip) {
    return
  }

  creationPreview.value = draftClip
}

function handleCreationPointerUp() {
  if (!creationPreview.value) {
    if (creationHistoryActive) {
      dawStore.cancelHistoryTransaction()
    }
    cleanupCreation()
    return
  }

  dawStore.addValueTrackerClip(props.valueTrackerTrack.id, creationPreview.value)

  if (creationHistoryActive) {
    dawStore.commitHistoryTransaction()
  }

  cleanupCreation()
}

function handleCreationPointerCancel() {
  if (creationHistoryActive) {
    dawStore.cancelHistoryTransaction()
  }

  cleanupCreation()
}

function getPointerTick(event, offsetPx = 0) {
  const laneRect = laneElement.value.getBoundingClientRect()
  const relativeX = Math.max(0, event.clientX - laneRect.left - offsetPx)
  const rawTick = pixelsToTicks(relativeX, pixelsPerTick.value)
  return getDraggedTick(rawTick, shouldSnapFromPointerEvent(event))
}

function getDroppedValueTrackerLibraryItemId(event) {
  return event.dataTransfer?.getData('valueTrackerLibraryItemId') || ''
}

function getDroppedValueTrackerLibraryOffsetPx(event) {
  const rawOffset = event.dataTransfer?.getData('valueTrackerLibraryDragOffsetPx')
  const numericOffset = Number(rawOffset)

  if (!Number.isFinite(numericOffset) || numericOffset < 0) {
    return 0
  }

  return numericOffset
}

function cleanupCreation() {
  isLibraryDropTarget.value = false
  creationPreview.value = null
  creationBounds = null
  creationHistoryActive = false
  creationStartX = 0
  window.removeEventListener('pointermove', handleCreationPointerMove)
  window.removeEventListener('pointerup', handleCreationPointerUp)
  window.removeEventListener('pointercancel', handleCreationPointerCancel)
}

onBeforeUnmount(() => {
  cleanupCreation()
  cleanupResize()
})
</script>
