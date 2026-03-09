<template>
  <header class="border border-zinc-800 bg-zinc-900/80 px-4 py-2 shadow-lg shadow-black/20">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
      </div>

      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <button
          aria-label="Play"
          class="flex h-8 w-8 items-center justify-center border transition-colors"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing"
          type="button"
          @click="play"
        >
          <Play class="h-4 w-4" :stroke-width="2.25" />
          <span class="sr-only">Play</span>
        </button>

        <button
          aria-label="Pause"
          class="flex h-8 w-8 items-center justify-center border transition-colors"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing"
          type="button"
          @click="pause"
        >
          <Pause class="h-4 w-4" :stroke-width="2.25" />
          <span class="sr-only">Pause</span>
        </button>

        <button
          aria-label="Stop"
          class="flex h-8 w-8 items-center justify-center border transition-colors"
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing && time === 0"
          type="button"
          @click="stop"
        >
          <Square class="h-4 w-4 fill-current" :stroke-width="2.25" />
          <span class="sr-only">Stop</span>
        </button>

        <button
          aria-label="Loop"
          class="flex h-8 w-8 items-center justify-center border transition-colors"
          :class="loopEnabled ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'"
          type="button"
          @click="dawStore.toggleLoop()"
        >
          <Repeat class="h-4 w-4" :stroke-width="2.25" />
          <span class="sr-only">Loop</span>
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
import { Pause, Play, Repeat, Square } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { play, pause, stop } = useTransportPlayback()
const { loopEnabled, playing, sampleRate, time } = storeToRefs(dawStore)

const transportTime = computed(() => `${time.value.toFixed(2)} ticks`)
</script>
