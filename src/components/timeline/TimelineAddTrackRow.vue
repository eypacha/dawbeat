<template>
  <div class="flex min-w-full w-max border-t border-zinc-800 bg-zinc-950/70">
    <div
      class="sticky left-0 z-20 flex shrink-0 items-center border-r border-zinc-800 bg-zinc-900 px-3 py-3"
      :style="{ width: `${TRACK_LABEL_WIDTH}px` }"
    >
      <button
        class="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
        type="button"
        @click="dawStore.addTrack()"
      >
        <Plus class="h-4 w-4" />
        <span>Add Track</span>
      </button>
    </div>

    <div class="h-20 shrink-0" :style="{ width: timelineWidth }" />
  </div>
</template>

<script setup>
import { Plus } from 'lucide-vue-next'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_LABEL_WIDTH } from '@/utils/timeUtils'

defineProps({
  timelineWidth: {
    type: String,
    required: true
  }
})

const dawStore = useDawStore()
</script>
