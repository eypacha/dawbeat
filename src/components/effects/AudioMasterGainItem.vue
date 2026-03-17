<template>
  <article class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900/90 p-3 text-zinc-100">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-zinc-50">Master Gain</p>
      </div>
    </div>

    <div class="mt-4 grid gap-2">
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
</template>

<script setup>
import { computed } from 'vue'
import EffectParamAutomationButton from '@/components/effects/EffectParamAutomationButton.vue'

const props = defineProps({
  gain: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['create-automation', 'interaction-end', 'interaction-start', 'update:gain'])

const gainLabel = computed(() => `${Number(props.gain ?? 0).toFixed(2)}x`)

function handleInput(event) {
  emit('update:gain', Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
