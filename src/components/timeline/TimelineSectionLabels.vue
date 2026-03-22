<template>
  <div
    ref="stripElement"
    class="absolute inset-x-0 top-0 z-20 h-7 border-b border-zinc-800/70 bg-zinc-950/35"
    data-context-menu-enabled="true"
    :style="{ width: timelineWidth }"
    @contextmenu="handleStripContextMenu"
    @pointerdown="handleStripPointerDown"
  >
    <div
      v-for="timelineSectionLabel in timelineSectionLabels"
      :key="timelineSectionLabel.id"
      class="absolute inset-y-0"
      :style="{ left: `${ticksToPixels(timelineSectionLabel.time, pixelsPerTick)}px` }"
    >
      <span class="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/12" />

      <button
        class="absolute left-0 top-0 inline-flex h-7 max-w-[12rem] items-center rounded-t-md border border-b-0 px-2 text-[10px] transition-colors"
        data-context-menu-enabled="true"
        data-timeline-section-label="true"
        :class="timelineSectionLabel.id === selectedTimelineSectionLabelId
          ? 'border-white/45 bg-zinc-950 text-zinc-50'
          : 'border-white/18 bg-zinc-900/95 text-zinc-300 hover:border-white/28 hover:text-zinc-100'"
        :title="`${timelineSectionLabel.name} · ${timelineSectionLabel.time.toFixed(2)}`"
        type="button"
        @contextmenu.stop.prevent="handleLabelContextMenu($event, timelineSectionLabel)"
        @pointerdown.stop="handleLabelPointerDown($event, timelineSectionLabel)"
      >
        <span class="truncate">{{ timelineSectionLabel.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContextMenu } from '@/composables/useContextMenu'
import { getDraggedTick, shouldSnapFromPointerEvent } from '@/services/snapService'
import { useDawStore } from '@/stores/dawStore'
import { pixelsToTicks, ticksToPixels } from '@/utils/timeUtils'

defineProps({
  timelineWidth: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['scrub-pointerdown'])

const dawStore = useDawStore()
const { openContextMenu } = useContextMenu()
const { pixelsPerTick, selectedTimelineSectionLabelId, timelineSectionLabels } = storeToRefs(dawStore)
const stripElement = ref(null)

let dragHistoryActive = false
let dragLabelId = null
let dragPointerId = null
let dragStartTime = null

function handleStripPointerDown(event) {
  if (event.button !== 0) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-timeline-section-label="true"]')) {
    return
  }

  dawStore.clearTimelineSectionLabelSelection()
  emit('scrub-pointerdown', event)
}

function handleStripContextMenu(event) {
  if (event.target instanceof Element && event.target.closest('[data-timeline-section-label="true"]')) {
    return
  }

  event.preventDefault()
  dawStore.clearTimelineSectionLabelSelection()

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'create-timeline-section-label',
        label: 'Add Section Label',
        time: getTimeFromClientX(event.clientX, shouldSnapFromPointerEvent(event))
      }
    ]
  })
}

function handleLabelContextMenu(event, timelineSectionLabel) {
  event.preventDefault()
  dawStore.selectTimelineSectionLabel(timelineSectionLabel.id)

  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      {
        action: 'edit-timeline-section-label',
        label: 'Rename Label',
        labelId: timelineSectionLabel.id,
        labelName: timelineSectionLabel.name,
        time: timelineSectionLabel.time
      },
      {
        action: 'delete-timeline-section-label',
        label: 'Delete Label',
        labelId: timelineSectionLabel.id
      }
    ]
  })
}

function handleLabelPointerDown(event, timelineSectionLabel) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  dawStore.selectTimelineSectionLabel(timelineSectionLabel.id)

  dragHistoryActive = false
  dragLabelId = timelineSectionLabel.id
  dragPointerId = event.pointerId
  dragStartTime = timelineSectionLabel.time

  window.addEventListener('pointermove', handleLabelPointerMove)
  window.addEventListener('pointerup', handleLabelPointerUp)
  window.addEventListener('pointercancel', handleLabelPointerCancel)
}

function handleLabelPointerMove(event) {
  if (dragPointerId !== event.pointerId || !dragLabelId) {
    return
  }

  if (!dragHistoryActive) {
    dawStore.beginHistoryTransaction('move-timeline-section-label')
    dragHistoryActive = Boolean(dawStore.historyTransaction)
  }

  dawStore.moveTimelineSectionLabel(
    dragLabelId,
    getTimeFromClientX(event.clientX, shouldSnapFromPointerEvent(event)),
    false
  )
}

function handleLabelPointerUp(event) {
  if (dragPointerId !== event.pointerId) {
    return
  }

  if (dragHistoryActive) {
    dawStore.commitHistoryTransaction()
  }

  cleanupLabelDrag()
}

function handleLabelPointerCancel(event) {
  if (dragPointerId !== event.pointerId) {
    return
  }

  if (dragHistoryActive && dragLabelId !== null && dragStartTime !== null) {
    dawStore.moveTimelineSectionLabel(dragLabelId, dragStartTime, false)
    dawStore.cancelHistoryTransaction()
  }

  cleanupLabelDrag()
}

function getTimeFromClientX(clientX, shouldSnap = true) {
  const stripRect = stripElement.value?.getBoundingClientRect()

  if (!stripRect) {
    return 0
  }

  const relativeX = Math.min(Math.max(clientX - stripRect.left, 0), stripRect.width)
  return getDraggedTick(pixelsToTicks(relativeX, pixelsPerTick.value), shouldSnap)
}

function cleanupLabelDrag() {
  dragHistoryActive = false
  dragLabelId = null
  dragPointerId = null
  dragStartTime = null
  window.removeEventListener('pointermove', handleLabelPointerMove)
  window.removeEventListener('pointerup', handleLabelPointerUp)
  window.removeEventListener('pointercancel', handleLabelPointerCancel)
}

onBeforeUnmount(() => {
  cleanupLabelDrag()
})
</script>
