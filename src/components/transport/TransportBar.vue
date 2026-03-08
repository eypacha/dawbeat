<template>
  <header class="border border-zinc-800 bg-zinc-900/80 px-4 py-3 shadow-lg shadow-black/20">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Transport</p>
        <h1 class="text-sm text-zinc-100">TransportBar</h1>
      </div>

      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <button
          class="border px-3 py-1 transition-colors"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing"
          type="button"
          @click="play"
        >
          PLAY
        </button>

        <button
          class="border px-3 py-1 transition-colors"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing"
          type="button"
          @click="pause"
        >
          PAUSE
        </button>

        <button
          class="border px-3 py-1 transition-colors"
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing && time === 0"
          type="button"
          @click="stop"
        >
          STOP
        </button>

        <button
          class="border px-3 py-1 transition-colors"
          :class="loopEnabled ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'"
          type="button"
          @click="dawStore.toggleLoop()"
        >
          LOOP
        </button>

        <span class="border border-zinc-800 bg-zinc-950 px-3 py-1">{{ transportTime }}</span>
        <span class="border border-zinc-800 bg-zinc-950 px-3 py-1">{{ sampleRate }} hz</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { play, pause, stop } = useTransportPlayback()
const { loopEnabled, playing, sampleRate, time } = storeToRefs(dawStore)

const transportTime = computed(() => `${time.value.toFixed(2)} ticks`)
</script>
