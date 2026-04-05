<template>
  <article class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900/90 p-3 text-zinc-100">
    <div class="mt-1 grid gap-2">
      <AudioOutputVisualizer
        :mode="visualizerMode"
        :palette-id="visualizerPaletteId"
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
          <span>Master gain</span>
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
    panel-class="rounded-none !w-[min(calc(100vw-1rem),36rem)]"
    size="xl"
    title="Audio Visualizer"
    @fullscreen-change="visualizerWindowFullscreen = $event"
    @close="closeVisualizerWindow"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">Audio Visualizer</p>
        </div>

        <div class="flex items-start" data-window-no-drag="true">
          <div class="flex items-start gap-1">
            <IconButton
              :icon="Code2"
              :class="visualizerFormulaOverlayVisible ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200'"
              :label="visualizerFormulaOverlayVisible ? 'Hide formulas' : 'Show formulas'"
              size="sm"
              :title="visualizerFormulaOverlayVisible ? 'Hide left and right formulas' : 'Show left and right formulas'"
              @click="visualizerFormulaOverlayVisible = !visualizerFormulaOverlayVisible"
            />
            <IconButton
              :icon="Palette"
              class="border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
              :label="`Next palette (${nextVisualizerPaletteLabel})`"
              size="sm"
              :title="`Next palette: ${nextVisualizerPaletteLabel}`"
              @click="cycleVisualizerPalette"
            />
            <IconButton
              :icon="Shuffle"
              class="border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
              :label="`Next visualizer (${nextVisualizerModeLabel})`"
              size="sm"
              :title="`Next visualizer: ${nextVisualizerModeLabel}`"
              @click="cycleVisualizerMode"
            />
            <IconButton
              :icon="visualizerWindowFullscreen ? Minimize2 : Maximize2"
              :label="visualizerWindowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
              size="sm"
              :title="visualizerWindowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
              @click="toggleVisualizerWindowFullscreen"
            />
          </div>
          <div class="ml-8">
            <IconButton label="Close" size="sm" @click="closeVisualizerWindow">
              x
            </IconButton>
          </div>
        </div>
      </div>
    </template>

    <AudioOutputVisualizer
      :fullscreen="visualizerWindowFullscreen"
      :mode="visualizerMode"
      :palette-id="visualizerPaletteId"
      :show-formula-overlay="visualizerFormulaOverlayVisible"
      windowed
    />
  </FloatingWindow>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Code2, Maximize2, Minimize2, Palette, Shuffle } from 'lucide-vue-next'
import AudioOutputVisualizer from '@/components/effects/AudioOutputVisualizer.vue'
import EffectParamAutomationButton from '@/components/effects/EffectParamAutomationButton.vue'
import FloatingWindow from '@/components/ui/FloatingWindow.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {
  VISUALIZER_MODES,
  VISUALIZER_MODE_LABELS
} from '@/services/visualizerConfigService'
import {
  DEFAULT_VISUALIZER_PALETTE_ID,
  VISUALIZER_PALETTES
} from '@/utils/visualizerPalettes'

const props = defineProps({
  gain: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['create-automation', 'interaction-end', 'interaction-start', 'update:gain'])

const gainLabel = computed(() => `${Number(props.gain ?? 0).toFixed(2)}x`)
const visualizerFormulaOverlayVisible = ref(false)
const visualizerMode = ref(VISUALIZER_MODES[0])
const visualizerPaletteId = ref(DEFAULT_VISUALIZER_PALETTE_ID)
const visualizerWindowElement = ref(null)
const visualizerWindowFullscreen = ref(false)
const visualizerWindowOpen = ref(false)
const nextVisualizerModeLabel = computed(() => {
  const currentIndex = VISUALIZER_MODES.indexOf(visualizerMode.value)
  const nextMode = VISUALIZER_MODES[(currentIndex + 1) % VISUALIZER_MODES.length] ?? VISUALIZER_MODES[0]
  return VISUALIZER_MODE_LABELS[nextMode] ?? nextMode
})
const nextVisualizerPaletteLabel = computed(() => {
  const currentIndex = VISUALIZER_PALETTES.findIndex((palette) => palette.id === visualizerPaletteId.value)
  const nextPalette = VISUALIZER_PALETTES[(currentIndex + 1) % VISUALIZER_PALETTES.length] ?? VISUALIZER_PALETTES[0]
  return nextPalette?.label ?? nextPalette?.id ?? 'Palette'
})

function handleInput(event) {
  emit('update:gain', Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}

function cycleVisualizerMode() {
  const currentIndex = VISUALIZER_MODES.indexOf(visualizerMode.value)
  visualizerMode.value = VISUALIZER_MODES[(currentIndex + 1) % VISUALIZER_MODES.length] ?? VISUALIZER_MODES[0]
}

function cycleVisualizerPalette() {
  const currentIndex = VISUALIZER_PALETTES.findIndex((palette) => palette.id === visualizerPaletteId.value)
  visualizerPaletteId.value = VISUALIZER_PALETTES[(currentIndex + 1) % VISUALIZER_PALETTES.length]?.id
    ?? DEFAULT_VISUALIZER_PALETTE_ID
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
