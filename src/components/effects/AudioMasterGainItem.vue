<template>
  <article class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900/90 p-3 text-zinc-100">
    <div class="mt-1 grid gap-2">
      <AudioOutputVisualizer
        show-window-button
        @open-window="openVisualizerWindow"
      />

      <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        <div class="flex items-center gap-2">
          <EffectParamAutomationButton
            label="Master Gain"
            lane-id="masterGain"
            @create="emit('create-automation')"
          />
          <span>Output</span>
        </div>
        <span>{{ gainLabel }}</span>
      </div>

      <input
        class="min-w-0 flex-1 accent-amber-300"
        :value="gain"
        max="1"
        min="0"
        step="0.01"
        type="range"
        @blur="emit('interaction-end')"
        @input="handleInput"
        @keydown="handleInteractionKeydown"
        @keyup="emit('interaction-end')"
        @pointercancel="emit('interaction-end')"
        @pointerdown="emit('interaction-start')"
        @pointerup="emit('interaction-end')"
      />
    </div>
  </article>

  <FloatingWindow
    ref="visualizerWindowElement"
    :open="visualizerWindowOpen"
    panel-class="rounded-none"
    size="xl"
    title="Audio Visualizer"
    @fullscreen-change="visualizerWindowFullscreen = $event"
    @close="closeVisualizerWindow"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">Audio Visualizer</p>
          <p class="mt-2 text-xs text-zinc-500">Live output and formula overlay</p>
        </div>

        <div class="flex items-start gap-3" data-window-no-drag="true">
          <IconButton
            :icon="visualizerWindowFullscreen ? Minimize2 : Maximize2"
            :label="visualizerWindowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            size="sm"
            :title="visualizerWindowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            @click="toggleVisualizerWindowFullscreen"
          />
          <IconButton label="Close" size="sm" @click="closeVisualizerWindow">
            x
          </IconButton>
        </div>
      </div>
    </template>

    <AudioOutputVisualizer windowed />
  </FloatingWindow>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Maximize2, Minimize2 } from 'lucide-vue-next'
import AudioOutputVisualizer from '@/components/effects/AudioOutputVisualizer.vue'
import EffectParamAutomationButton from '@/components/effects/EffectParamAutomationButton.vue'
import FloatingWindow from '@/components/ui/FloatingWindow.vue'
import IconButton from '@/components/ui/IconButton.vue'

const props = defineProps({
  gain: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['create-automation', 'interaction-end', 'interaction-start', 'update:gain'])

const gainLabel = computed(() => `${Number(props.gain ?? 0).toFixed(2)}x`)
const visualizerWindowElement = ref(null)
const visualizerWindowFullscreen = ref(false)
const visualizerWindowOpen = ref(false)

function handleInput(event) {
  emit('update:gain', Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}

async function toggleVisualizerWindowFullscreen() {
  await visualizerWindowElement.value?.toggleFullscreen?.()
}

function openVisualizerWindow() {
  visualizerWindowFullscreen.value = false
  visualizerWindowOpen.value = true
}

function closeVisualizerWindow() {
  visualizerWindowFullscreen.value = false
  visualizerWindowOpen.value = false
}
</script>
