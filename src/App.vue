<template>
  <StartScreen v-if="!audioReady" @start="handleStart" />

  <div v-else class="min-h-screen bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex min-h-screen w-full flex-col gap-4 p-4">
      <TransportBar />

      <main class="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FormulaLibrary />
        <Timeline />
      </main>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import StartScreen from '@/components/boot/StartScreen.vue'
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TransportBar from '@/components/transport/TransportBar.vue'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { enableAudio } = useTransportPlayback()
const { audioReady, selectedClipId } = storeToRefs(dawStore)

async function handleStart() {
  await enableAudio()
}

function handleKeydown(event) {
  if (event.key !== 'Delete' && event.key !== 'Backspace') {
    return
  }

  if (!selectedClipId.value) {
    return
  }

  if (document.activeElement?.tagName === 'INPUT') {
    return
  }

  dawStore.removeClip(selectedClipId.value)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
