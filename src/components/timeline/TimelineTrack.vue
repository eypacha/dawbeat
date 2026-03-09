<template>
  <div
    class="flex min-w-full w-max border-b border-zinc-800 last:border-b-0"
    :data-track-id="track.id"
    :style="trackColorStyle"
    @click="dawStore.selectTrack(track.id)"
  >
    <div
      class="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-4"
      :class="track.id === selectedTrackId ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300'"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
      @contextmenu="handleContextMenu"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm transition-opacity" :class="isMuted ? 'opacity-55' : ''">
          {{ displayTrackName }}
        </span>

        <button
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors"
          :class="muteButtonClassName"
          :title="isMuted ? 'Unmute track' : 'Mute track'"
          :aria-pressed="isMuted"
          type="button"
          @click.stop="handleToggleMuted"
        >
          <span
            class="h-2 w-2 rounded-full transition-opacity"
            :class="isMuted ? 'bg-transparent opacity-0' : 'bg-current opacity-100'"
          />
        </button>
      </div>

      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500 transition-opacity" :class="isMuted ? 'opacity-50' : ''">
        {{ track.clips.length }} clips
      </span>
    </div>

    <div
      ref="laneElement"
      class="relative h-20 shrink-0 transition-opacity"
      :class="laneClassName"
      :style="laneStyle"
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
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import TimelineClip from '@/components/timeline/TimelineClip.vue'
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import { buildCreatedClip, clampClipPlacementStart, getTrackCreateBounds } from '@/services/timelineService'
import { useContextMenu } from '@/composables/useContextMenu'
import { useDawStore } from '@/stores/dawStore'
import {
  TRACK_COLOR_PALETTE,
  darkenHex,
  getTrackColor,
  lightenHex
} from '@/utils/colorUtils'
import { TRACK_LABEL_WIDTH, pixelsToTicks } from '@/utils/timeUtils'

const DRAG_THRESHOLD_PX = 6

const props = defineProps({
  trackIndex: {
    type: Number,
    required: true
  },
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
const { openContextMenu } = useContextMenu()
const { clipDragPreview, pixelsPerTick, selectedTrackId } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)
const isFormulaDropTarget = ref(false)

let creationAnchorTick = 0
let creationBounds = null
let creationStartX = 0
const FORMULA_DROP_DURATION = 1

const laneStyle = computed(() => ({
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.5) 1px, transparent 1px)',
  backgroundSize: `${pixelsPerTick.value}px 100%`
}))

const laneClassName = computed(() => {
  if (isFormulaDropTarget.value) {
    return 'opacity-100 ring-1 ring-inset ring-[var(--track-color-light)]'
  }

  return isMuted.value ? 'opacity-35' : 'opacity-100'
})

const dragPreview = computed(() => {
  if (clipDragPreview.value?.targetTrackId !== props.track.id) {
    return null
  }

  return clipDragPreview.value
})

const displayTrackName = computed(() => {
  if (typeof props.track.name === 'string' && props.track.name.trim()) {
    return props.track.name
  }

  return `Track ${props.trackIndex + 1}`
})

const isMuted = computed(() => Boolean(props.track.muted))

const trackColor = computed(() => getTrackColor(props.track.color))

const trackColorStyle = computed(() => ({
  '--track-color': trackColor.value,
  '--track-color-border': darkenHex(trackColor.value, 15),
  '--track-color-light': lightenHex(trackColor.value, 15)
}))

const muteButtonClassName = computed(() => {
  if (isMuted.value) {
    return 'border-zinc-600 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
  }

  return 'border-[var(--track-color-border)] bg-[color:color-mix(in_srgb,var(--track-color)_16%,transparent)] text-[var(--track-color-light)] hover:border-[var(--track-color-light)]'
})

function handleContextMenu(event) {
  event.preventDefault()
  dawStore.selectTrack(props.track.id)

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { label: 'Add Track', action: 'add-track', beforeTrackId: props.track.id },
      {
        label: 'Rename Track',
        action: 'rename-track',
        trackId: props.track.id,
        trackName: props.track.name ?? ''
      },
      {
        action: 'set-track-color',
        colors: TRACK_COLOR_PALETTE,
        label: 'Color',
        selectedColor: trackColor.value,
        trackId: props.track.id,
        type: 'palette'
      },
      {
        label: 'Delete Track',
        action: 'delete-track',
        trackId: props.track.id,
        trackName: displayTrackName.value
      }
    ]
  })
}

function handleToggleMuted() {
  dawStore.toggleTrackMuted(props.track.id)
}

function handleLanePointerDown(event) {
  if (event.button !== 0 || !laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  const pointerTick = getPointerTick(event)
  const nextBounds = getTrackCreateBounds(props.track, pointerTick)

  if (!nextBounds) {
    return
  }

  if (!buildCreatedClip(pointerTick, pointerTick, nextBounds)) {
    return
  }

  event.preventDefault()
  dawStore.selectTrack(props.track.id)

  creationStartX = event.clientX
  creationAnchorTick = pointerTick
  creationBounds = nextBounds

  window.addEventListener('pointermove', handleCreationPointerMove)
  window.addEventListener('pointerup', handleCreationPointerUp)
  window.addEventListener('pointercancel', handleCreationPointerCancel)
}

function handleLaneDragOver(event) {
  if (!getDroppedFormulaId(event)) {
    return
  }

  isFormulaDropTarget.value = true
}

function handleLaneDragLeave(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) {
    return
  }

  isFormulaDropTarget.value = false
}

function handleLaneDrop(event) {
  const formulaId = getDroppedFormulaId(event)
  isFormulaDropTarget.value = false

  if (!formulaId) {
    return
  }

  const start = clampClipPlacementStart(props.track, getPointerTick(event), FORMULA_DROP_DURATION)

  dawStore.addClip(props.track.id, {
    duration: FORMULA_DROP_DURATION,
    formulaId,
    start
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
    cleanupCreation()
    return
  }

  const nextClip = {
    ...creationPreview.value,
    formula: '',
    formulaId: null,
    formulaName: null
  }

  dawStore.addClip(props.track.id, nextClip)
  cleanupCreation()
}

function handleCreationPointerCancel() {
  cleanupCreation()
}

function getPointerTick(event) {
  const laneRect = laneElement.value.getBoundingClientRect()
  const relativeX = Math.max(0, event.clientX - laneRect.left)
  const rawTick = pixelsToTicks(relativeX, pixelsPerTick.value)
  return getDraggedTick(rawTick, shouldSnapFromPointerEvent(event))
}

function cleanupCreation() {
  isFormulaDropTarget.value = false
  creationPreview.value = null
  creationBounds = null
  creationStartX = 0
  window.removeEventListener('pointermove', handleCreationPointerMove)
  window.removeEventListener('pointerup', handleCreationPointerUp)
  window.removeEventListener('pointercancel', handleCreationPointerCancel)
}

function getDroppedFormulaId(event) {
  const formulaId = event.dataTransfer?.getData('formulaId')

  if (formulaId) {
    return formulaId
  }

  return event.dataTransfer?.getData('text/plain') || ''
}

onBeforeUnmount(() => {
  cleanupCreation()
})
</script>
