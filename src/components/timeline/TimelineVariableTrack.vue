<template>
  <div
    class="relative flex min-w-full w-max border-b border-zinc-800 bg-zinc-950/35"
    :data-clip-lane-id="variableTrack.name"
    :data-variable-track-name="variableTrack.name"
  >
    <div
      class="sticky left-0 z-20 flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-4 py-0 text-zinc-200"
      data-context-menu-enabled="true"
      :style="headerStyle"
      @contextmenu="handleHeaderContextMenu"
    >
      <span class="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-200">
        var {{ variableTrack.name }}
      </span>
    </div>

    <div
      ref="laneElement"
      class="relative z-0 shrink-0"
      data-context-menu-enabled="true"
      data-timeline-track-lane="true"
      :style="laneStyle"
      @contextmenu="handleLaneContextMenu"
      @pointerdown="handleLanePointerDown"
    >
      <TimelineClipPreview
        v-if="creationPreview"
        compact
        :start="creationPreview.start"
        :duration="creationPreview.duration"
      />

      <TimelineClipPreview
        v-if="dragPreview"
        compact
        :start="dragPreview.start"
        :duration="dragPreview.duration"
      />

      <TimelineVariableClip
        v-for="clip in variableTrack.clips"
        :key="clip.id"
        :clip="clip"
        :variable-track-name="variableTrack.name"
      />
    </div>

    <button
      class="absolute inset-x-0 bottom-0 z-30 h-2 cursor-row-resize"
      title="Resize variable track height"
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
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import TimelineVariableClip from '@/components/timeline/TimelineVariableClip.vue'
import { useContextMenu } from '@/composables/useContextMenu'
import { useTimelineLaneResize } from '@/composables/useTimelineLaneResize'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { buildCreatedClip, clampClipPlacementStart, getTrackCreateBounds } from '@/services/timelineService'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_LABEL_WIDTH, getVisibleTimelineTickStep, pixelsToTicks, ticksToPixels } from '@/utils/timeUtils'

const DRAG_THRESHOLD_PX = 6

const props = defineProps({
  timelineWidth: {
    type: String,
    required: true
  },
  variableTrack: {
    type: Object,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { canPasteClipsAtPlayhead, clipDragPreview, pixelsPerTick } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)

let creationAnchorTick = 0
let creationBounds = null
let creationHistoryActive = false
let creationStartX = 0
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))
const laneHeight = computed(() => props.variableTrack.height)
const headerStyle = computed(() => ({
  height: `${laneHeight.value}px`,
  width: `${TRACK_LABEL_WIDTH}px`
}))

const laneStyle = computed(() => ({
  height: `${laneHeight.value}px`,
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.4) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))

const dragPreview = computed(() => {
  if (clipDragPreview.value?.targetLaneId !== props.variableTrack.name) {
    return null
  }

  return clipDragPreview.value
})

const { cleanupResize, handleResizePointerDown } = useTimelineLaneResize({
  dawStore,
  getHeight: () => laneHeight.value,
  historyLabel: 'resize-variable-track-height',
  setHeight: (height) => {
    dawStore.setVariableTrackHeight(props.variableTrack.name, height)
  }
})

function handleHeaderContextMenu(event) {
  event.preventDefault()
  dawStore.selectTrack(null)

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'delete-variable-track',
        label: 'Delete Variable',
        variableTrackName: props.variableTrack.name
      }
    ]
  })
}

function handleLaneContextMenu(event) {
  if (!laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  event.preventDefault()

  const start = clampClipPlacementStart(props.variableTrack, getPointerTick(event), 1)
  dawStore.selectTrack(null)
  const items = [
    {
      action: 'create-variable-clip-at-position',
      duration: 1,
      label: 'New Variable Clip',
      start,
      variableTrackName: props.variableTrack.name
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
  const nextBounds = getTrackCreateBounds(props.variableTrack, pointerTick)

  if (!nextBounds) {
    return
  }

  if (!buildCreatedClip(pointerTick, pointerTick, nextBounds)) {
    return
  }

  event.preventDefault()
  dawStore.selectTrack(null)
  dawStore.beginHistoryTransaction('create-variable-clip')
  creationHistoryActive = Boolean(dawStore.historyTransaction)

  creationStartX = event.clientX
  creationAnchorTick = pointerTick
  creationBounds = nextBounds

  window.addEventListener('pointermove', handleCreationPointerMove)
  window.addEventListener('pointerup', handleCreationPointerUp)
  window.addEventListener('pointercancel', handleCreationPointerCancel)
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

  dawStore.addVariableClip(props.variableTrack.name, {
    ...creationPreview.value,
    formula: '0'
  })

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

function getPointerTick(event) {
  const laneRect = laneElement.value.getBoundingClientRect()
  const relativeX = Math.max(0, event.clientX - laneRect.left)
  const rawTick = pixelsToTicks(relativeX, pixelsPerTick.value)
  return getDraggedTick(rawTick, shouldSnapFromPointerEvent(event))
}

function cleanupCreation() {
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
