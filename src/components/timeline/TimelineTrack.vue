<template>
  <div
    class="relative flex min-w-full w-max border-b border-zinc-800 last:border-b-0"
    :data-track-id="track.id"
    :data-clip-lane-id="track.id"
    :style="trackColorStyle"
    @click="dawStore.selectTrack(track.id)"
  >
    <div
      v-if="trackReorderActive"
      class="pointer-events-none absolute inset-x-0 z-30 h-0.5"
      :class="trackReorderPlacement === 'after' ? 'bottom-0' : 'top-0'"
      :style="trackReorderIndicatorStyle"
    />

    <div
      class="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-0"
      data-context-menu-enabled="true"
      draggable="true"
      :class="[
        track.id === selectedTrackId ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300',
        isTrackReorderSource ? 'cursor-grabbing opacity-50' : 'cursor-grab'
      ]"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
      @contextmenu="handleContextMenu"
      @dragend="handleTrackReorderDragEnd"
      @dragstart="handleTrackReorderDragStart"
      @dragover.prevent="handleTrackHeaderDragOver"
      @drop.prevent="handleTrackHeaderDrop"
    >
      <div class="min-w-0">
        <span class="block min-w-0 truncate text-sm transition-opacity" :class="isAudible ? '' : 'opacity-55'">
          {{ displayTrackName }}
        </span>
      </div>

      <div class="mt-2 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <button
            class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
            :class="muteButtonClassName"
            :title="isMuted ? 'Unmute track' : 'Mute track'"
            :aria-pressed="isMuted"
            type="button"
            @click.stop="handleToggleMuted"
          >
            M
          </button>

          <button
            class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
            :class="soloButtonClassName"
            :title="isSoloed ? 'Disable solo' : 'Solo track'"
            :aria-pressed="isSoloed"
            type="button"
            @click.stop="handleToggleSoloed"
          >
            S
          </button>
        </div>

        <div class="flex justify-end">
          <span
            class="shrink-0 text-sm font-bold"
            :style="{ color: 'var(--track-color)' }"
            :title="`Track union operator: ${currentUnionOperatorOption.label}`"
          >
            {{ currentUnionOperatorOption.value }}
          </span>
        </div>
      </div>
    </div>

    <div
      ref="laneElement"
      class="relative z-0 shrink-0 transition-opacity"
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

      <TimelineClip
        v-for="clip in track.clips"
        :key="clip.id"
        :clip="clip"
        :track-id="track.id"
      />
    </div>

    <button
      class="absolute inset-x-0 bottom-0 z-30 h-2 cursor-row-resize"
      title="Resize track height"
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
import { useTimelineLaneResize } from '@/composables/useTimelineLaneResize'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { isTrackAudible } from '@/services/trackPlaybackState'
import { getTrackUnionOperatorOption, TRACK_UNION_OPERATOR_OPTIONS } from '@/services/trackUnionOperatorService'
import TimelineClip from '@/components/timeline/TimelineClip.vue'
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import {
  buildCreatedClip,
  clampClipPlacementStart,
  DEFAULT_FORMULA_DROP_DURATION,
  getTrackCreateBounds
} from '@/services/timelineService'
import { useContextMenu } from '@/composables/useContextMenu'
import { useDawStore } from '@/stores/dawStore'
import {
  darkenHex,
  getTrackColor,
  lightenHex
} from '@/utils/colorUtils'
import { TRACK_LABEL_WIDTH, getVisibleTimelineTickStep, pixelsToTicks, ticksToPixels } from '@/utils/timeUtils'

const DRAG_THRESHOLD_PX = 6

const props = defineProps({
  isTrackReorderSource: {
    type: Boolean,
    default: false
  },
  trackIndex: {
    type: Number,
    required: true
  },
  trackReorderActive: {
    type: Boolean,
    default: false
  },
  trackReorderColor: {
    type: String,
    default: null
  },
  trackReorderPlacement: {
    type: String,
    default: null
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
const emit = defineEmits(['track-reorder-start', 'track-reorder-over', 'track-reorder-drop', 'track-reorder-end'])

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { canPasteClipsAtPlayhead, clipDragPreview, pixelsPerTick, selectedTrackId, tracks } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)
const isFormulaDropTarget = ref(false)

let creationAnchorTick = 0
let creationBounds = null
let creationHistoryActive = false
let creationStartX = 0
const visibleTickStep = computed(() => getVisibleTimelineTickStep(pixelsPerTick.value))
const laneHeight = computed(() => props.track.height)

const laneStyle = computed(() => ({
  height: `${laneHeight.value}px`,
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.5) 1px, transparent 1px)',
  backgroundSize: `${ticksToPixels(visibleTickStep.value, pixelsPerTick.value)}px 100%`
}))

const laneClassName = computed(() => {
  if (isFormulaDropTarget.value) {
    return 'opacity-100 ring-1 ring-inset ring-[var(--track-color-light)]'
  }

  return isAudible.value ? 'opacity-100' : 'opacity-35'
})

const dragPreview = computed(() => {
  if (clipDragPreview.value?.targetLaneId !== props.track.id) {
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
const isSoloed = computed(() => Boolean(props.track.soloed))
const isAudible = computed(() => isTrackAudible(props.track, tracks.value))
const currentUnionOperatorOption = computed(() => getTrackUnionOperatorOption(props.track.unionOperator))

const trackColor = computed(() => getTrackColor(props.track.color))

const trackColorStyle = computed(() => ({
  '--track-color': trackColor.value,
  '--track-color-border': darkenHex(trackColor.value, 15),
  '--track-color-light': lightenHex(trackColor.value, 15)
}))

const trackReorderIndicatorStyle = computed(() => ({
  backgroundColor: props.trackReorderColor ? lightenHex(getTrackColor(props.trackReorderColor), 15) : 'var(--track-color-light)'
}))

const muteButtonClassName = computed(() => {
  if (isMuted.value) {
    return 'border-rose-500 bg-rose-500 text-white hover:border-rose-400 hover:bg-rose-400'
  }

  return 'border-[var(--track-color-border)] bg-zinc-900/70 text-zinc-400 hover:border-[var(--track-color-light)] hover:text-zinc-200'
})

const soloButtonClassName = computed(() => {
  if (isSoloed.value) {
    return 'border-[var(--track-color)] bg-[var(--track-color)] text-white hover:border-[var(--track-color-light)] hover:bg-[var(--track-color-light)]'
  }

  return 'border-[var(--track-color-border)] bg-zinc-900/70 text-zinc-400 hover:border-[var(--track-color-light)] hover:text-zinc-200'
})

const { cleanupResize, handleResizePointerDown } = useTimelineLaneResize({
  dawStore,
  getHeight: () => laneHeight.value,
  historyLabel: 'resize-track-height',
  setHeight: (height) => {
    dawStore.setTrackHeight(props.track.id, height)
  }
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
        label: 'Duplicate Track',
        action: 'duplicate-track',
        trackId: props.track.id
      },
      {
        label: 'Name and color',
        action: 'edit-track-presentation',
        trackId: props.track.id,
        trackColor: trackColor.value,
        trackName: props.track.name ?? ''
      },
      {
        action: 'set-track-union-operator',
        label: 'Operator',
        options: TRACK_UNION_OPERATOR_OPTIONS,
        selectedOperator: currentUnionOperatorOption.value.value,
        trackId: props.track.id,
        type: 'track-union-operator'
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

function handleToggleSoloed() {
  dawStore.toggleTrackSoloed(props.track.id)
}

function handleTrackReorderDragStart(event) {
  if (!event.dataTransfer) {
    return
  }

  dawStore.selectTrack(props.track.id)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/x-dawbeat-track-id', props.track.id)
  emit('track-reorder-start', props.track.id)
}

function handleTrackHeaderDragOver(event) {
  if (!isTrackReorderDragEvent(event)) {
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  emit('track-reorder-over', {
    placement: getTrackReorderPlacement(event),
    trackId: props.track.id
  })
}

function handleTrackHeaderDrop(event) {
  if (!isTrackReorderDragEvent(event)) {
    return
  }

  emit('track-reorder-drop', {
    placement: getTrackReorderPlacement(event),
    trackId: props.track.id
  })
}

function handleTrackReorderDragEnd() {
  emit('track-reorder-end')
}

function handleLaneContextMenu(event) {
  if (!laneElement.value) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-clip="true"]')) {
    return
  }

  event.preventDefault()

  const start = clampClipPlacementStart(props.track, getPointerTick(event), 1)
  dawStore.selectTrack(props.track.id)
  const items = [
    {
      action: 'create-clip-at-position',
      duration: 1,
      label: 'New Clip',
      start,
      trackId: props.track.id
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
  const nextBounds = getTrackCreateBounds(props.track, pointerTick)

  if (!nextBounds) {
    return
  }

  if (!buildCreatedClip(pointerTick, pointerTick, nextBounds)) {
    return
  }

  event.preventDefault()
  dawStore.selectTrack(props.track.id)
  dawStore.beginHistoryTransaction('create-clip')
  creationHistoryActive = Boolean(dawStore.historyTransaction)

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

  const dragOffsetPx = getDroppedFormulaOffsetPx(event)
  const start = clampClipPlacementStart(
    props.track,
    getPointerTick(event, dragOffsetPx),
    DEFAULT_FORMULA_DROP_DURATION
  )

  dawStore.recordHistoryStep('drop-formula-to-track', () => {
    dawStore.addClip(props.track.id, {
      duration: DEFAULT_FORMULA_DROP_DURATION,
      formulaId,
      start
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

  const nextClip = {
    ...creationPreview.value,
    formula: '',
    formulaId: null,
    formulaName: null
  }

  dawStore.addClip(props.track.id, nextClip)

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

function cleanupCreation() {
  isFormulaDropTarget.value = false
  creationPreview.value = null
  creationBounds = null
  creationHistoryActive = false
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

function getDroppedFormulaOffsetPx(event) {
  const rawOffset = event.dataTransfer?.getData('formulaDragOffsetPx')
  const offset = Number(rawOffset)

  return Number.isFinite(offset) ? offset : 0
}

function isTrackReorderDragEvent(event) {
  if (!event.dataTransfer?.types) {
    return false
  }

  return Array.from(event.dataTransfer.types).includes('application/x-dawbeat-track-id')
}

function getTrackReorderPlacement(event) {
  const currentTarget = event.currentTarget

  if (!(currentTarget instanceof HTMLElement)) {
    return 'before'
  }

  const { height, top } = currentTarget.getBoundingClientRect()
  return event.clientY >= top + height / 2 ? 'after' : 'before'
}

onBeforeUnmount(() => {
  cleanupCreation()
  cleanupResize()
})
</script>
