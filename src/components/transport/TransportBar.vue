<template>
  <Panel as="header" class="px-4 py-2" padding="none">
    <Toolbar gap="lg">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
      </div>

      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <IconButton
          :icon="Play"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing"
          label="Play"
          @click="play"
        />

        <IconButton
          :icon="Pause"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing"
          label="Pause"
          @click="pause"
        />

        <IconButton
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing && time === 0"
          label="Stop"
          @click="stop"
        >
          <Square class="h-4 w-4 fill-current" :stroke-width="2.25" />
        </IconButton>

        <IconButton
          :icon="Repeat"
          :class="loopEnabled ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'"
          label="Loop"
          @click="dawStore.toggleLoop()"
        />

        <Divider />
        <span class="border border-zinc-800 bg-zinc-950 px-3 py-1">{{ transportTime }}</span>
        <span class="border border-zinc-800 bg-zinc-950 px-3 py-1">{{ sampleRate }} hz</span>
      </div>
    </Toolbar>
  </Panel>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Pause, Play, Repeat, Square } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import Divider from '@/components/ui/Divider.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import Toolbar from '@/components/ui/Toolbar.vue'

const dawStore = useDawStore()
const { play, pause, stop } = useTransportPlayback()
const { loopEnabled, playing, sampleRate, time } = storeToRefs(dawStore)

const transportTime = computed(() => `${time.value.toFixed(2)} ticks`)
</script>
