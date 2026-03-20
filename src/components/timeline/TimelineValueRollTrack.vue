<template>
  <div
    class="relative flex min-w-full w-max border-b border-zinc-800 bg-zinc-950/45"
    :data-clip-lane-id="valueRollTrack.id"
    :data-value-roll-track-id="valueRollTrack.id"
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

      <span class="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/80">[VAL]</span>
      <span class="mt-1 truncate text-sm text-zinc-100">{{ valueRollTrack.name }}</span>
    </div>

    <div
      ref="laneElement"
      class="relative z-0 h-16 shrink-0"
      data-context-menu-enabled="true"
      data-timeline-track-lane="true"
      :class="laneClassName"
      :style="laneStyle"
      @contextmenu="handleLaneContextMenu"
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

      <TimelineValueRollClip
        v-for="clip in valueRollTrack.clips"
        :key="clip.id"
        :clip="clip"
        :value-roll-track-id="valueRollTrack.id"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Keyboard } from 'lucide-vue-next'
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import TimelineValueRollClip from '@/components/timeline/TimelineValueRollClip.vue'
import { useContextMenu } from '@/composables/useContextMenu'
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
  valueRollTrack: {
    type: Object,
    required: true
  }
})

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { canPasteClipsAtPlayhead, clipDragPreview, pixelsPerTick, selectedValueRollTrackId } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)

let creationAnchorTick = 0
let creationBounds = null
let creationHistoryActive = false
let creationStartX = 0
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))

const trackStyle = computed(() => ({
  '--track-color': '#f59e0b',
  '--track-color-border': '#b45309',
  '--track-color-light': '#fbbf24'
}))

const laneStyle = computed(() => ({
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.45) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))
const isSelectedTrack = computed(() => selectedValueRollTrackId.value === props.valueRollTrack.id)
const selectedHeaderClassName = computed(() =>
  isSelectedTrack.value ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-200'
)
const laneClassName = computed(() =>
  isSelectedTrack.value ? 'ring-1 ring-inset ring-amber-300/35' : ''
)
const keyboardButtonClassName = computed(() => {
  if (isSelectedTrack.value) {
    return 'border-yellow-300 bg-yellow-300 text-zinc-950 hover:border-yellow-200 hover:bg-yellow-200'
  }

  return 'border-yellow-300/45 bg-zinc-900/70 text-zinc-400 hover:border-yellow-200 hover:text-zinc-200'
})

const dragPreview = computed(() => {
  if (clipDragPreview.value?.targetLaneId !== props.valueRollTrack.id) {
    return null
  }

  return clipDragPreview.value
})

function handleHeaderContextMenu(event) {
  event.preventDefault()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'edit-value-roll-track-name',
        label: 'Rename Value Roll',
        valueRollTrackId: props.valueRollTrack.id,
        valueRollTrackName: props.valueRollTrack.name
      },
      {
        action: 'delete-value-roll-track',
        label: 'Delete Value Roll',
        valueRollTrackId: props.valueRollTrack.id
      }
    ]
  })
}

function handleKeyboardTargetToggle() {
  dawStore.toggleValueRollTrackKeyboardTarget(props.valueRollTrack.id)
}

function handleLaneContextMenu(event) {
  if (!laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  event.preventDefault()

  const start = clampClipPlacementStart(props.valueRollTrack, getPointerTick(event), 1)
  const items = [
    {
      action: 'create-value-roll-clip-at-position',
      duration: 1,
      label: 'New Value Roll Clip',
      start,
      valueRollTrackId: props.valueRollTrack.id
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
  const nextBounds = getTrackCreateBounds(props.valueRollTrack, pointerTick)

  if (!nextBounds || !buildCreatedClip(pointerTick, pointerTick, nextBounds)) {
    return
  }

  event.preventDefault()
  dawStore.beginHistoryTransaction('create-value-roll-clip')
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

  dawStore.addValueRollClip(props.valueRollTrack.id, creationPreview.value)

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
})
</script>
