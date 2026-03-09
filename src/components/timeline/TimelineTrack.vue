<template>
  <div
    class="flex min-w-full w-max border-b border-zinc-800 last:border-b-0"
    @click="dawStore.selectTrack(track.id)"
    @contextmenu="handleContextMenu"
  >
    <div
      class="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-zinc-800 px-4 py-4"
      :class="track.id === selectedTrackId ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300'"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
    >
      <span class="text-sm">{{ track.name }}</span>
      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        {{ track.clips.length }} clips
      </span>
    </div>

    <div
      ref="laneElement"
      class="relative h-20 shrink-0"
      :style="laneStyle"
      @pointerdown="handleLanePointerDown"
    >
      <TimelineClipPreview
        v-if="creationPreview"
        :start="creationPreview.start"
        :duration="creationPreview.duration"
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
import TimelineClip from '@/components/timeline/TimelineClip.vue'
import TimelineClipPreview from '@/components/timeline/TimelineClipPreview.vue'
import { buildCreatedClip, getTrackCreateBounds } from '@/services/timelineService'
import { useContextMenu } from '@/composables/useContextMenu'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_LABEL_WIDTH, pixelsToTicks, snapTicks } from '@/utils/timeUtils'

const DRAG_THRESHOLD_PX = 6

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
const { openContextMenu } = useContextMenu()
const { pixelsPerTick, selectedTrackId } = storeToRefs(dawStore)
const laneElement = ref(null)
const creationPreview = ref(null)

let creationAnchorTick = 0
let creationBounds = null
let creationStartX = 0

const laneStyle = computed(() => ({
  width: props.timelineWidth,
  backgroundImage: 'linear-gradient(to right, rgba(63, 63, 70, 0.5) 1px, transparent 1px)',
  backgroundSize: `${pixelsPerTick.value}px 100%`
}))

function handleContextMenu(event) {
  event.preventDefault()
  dawStore.selectTrack(props.track.id)

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { label: 'Add Track', action: 'add-track' },
      { label: 'Delete Track', action: 'delete-track', trackId: props.track.id }
    ]
  })
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
  window.addEventListener('pointercancel', handleCreationPointerUp)
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
    formula: 't'
  }

  dawStore.addClip(props.track.id, nextClip)
  cleanupCreation()
}

function getPointerTick(event) {
  const laneRect = laneElement.value.getBoundingClientRect()
  const relativeX = Math.max(0, event.clientX - laneRect.left)
  return snapTicks(pixelsToTicks(relativeX, pixelsPerTick.value))
}

function cleanupCreation() {
  creationPreview.value = null
  creationBounds = null
  creationStartX = 0
  window.removeEventListener('pointermove', handleCreationPointerMove)
  window.removeEventListener('pointerup', handleCreationPointerUp)
  window.removeEventListener('pointercancel', handleCreationPointerUp)
}

onBeforeUnmount(() => {
  cleanupCreation()
})
</script>
