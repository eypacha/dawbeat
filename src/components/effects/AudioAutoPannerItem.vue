<template>
  <article
    class="group w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 transition-colors"
    :class="[
      effect.enabled ? 'text-zinc-100 hover:bg-zinc-700/90' : 'text-zinc-400 hover:bg-zinc-800',
      dragging ? 'opacity-70' : ''
    ]"
  >
    <div class="min-w-0">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div
            class="-ml-1 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
            :class="dragging ? 'cursor-grabbing' : ''"
            draggable="true"
            title="Drag effect"
            @dragstart="emit('drag-start', effect.id)"
            @dragend="emit('drag-end')"
          >
            <GripVertical class="h-3.5 w-3.5" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">Auto Panner</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button
            class="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
            type="button"
            @click="emit('toggle-expanded', effect.id)"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
          </button>

          <button
            class="flex h-7 w-7 items-center justify-center rounded border transition"
            :class="effect.enabled
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'"
            type="button"
            @click="emit('toggle-enabled', effect.id)"
          >
            <Power class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <CollapseTransition>
        <div v-if="effect.expanded">
          <div class="grid gap-3 pt-4">
            <div class="grid gap-2">
              <div class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">LFO Type</div>
              <select
                class="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[12px] text-zinc-200 transition hover:border-zinc-500 focus:outline-none"
                :value="effect.params.type ?? 'sine'"
                @change="emit('update-param', effect.id, 'type', $event.target.value)"
              >
                <option v-for="t in LFO_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Auto Panner Frequency"
                    param-key="frequency"
                    @create="emit('create-automation', effect.id, 'frequency')"
                  />
                  <span>LFO Rate</span>
                </div>
                <span>{{ frequencyLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.frequency"
                max="20"
                min="0.01"
                step="0.01"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleFrequencyInput"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Auto Panner Depth"
                    param-key="depth"
                    @create="emit('create-automation', effect.id, 'depth')"
                  />
                  <span>Depth</span>
                </div>
                <span>{{ depthLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.depth"
                max="1"
                min="0"
                step="0.01"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleDepthInput"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Auto Panner Wet"
                    param-key="wet"
                    @create="emit('create-automation', effect.id, 'wet')"
                  />
                  <span>Wet</span>
                </div>
                <span>{{ wetLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.wet"
                max="1"
                min="0"
                step="0.01"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleWetInput"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                class="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                type="button"
                @click="emit('reset', effect.id)"
              >
                Reset
              </button>

              <button
                class="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                type="button"
                @click="emit('remove', effect.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </CollapseTransition>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { GripVertical, Power, SlidersHorizontal } from 'lucide-vue-next'
import CollapseTransition from '../ui/CollapseTransition.vue'
import EffectParamAutomationButton from '@/components/effects/EffectParamAutomationButton.vue'

const LFO_TYPES = ['sine', 'square', 'triangle', 'sawtooth']

const props = defineProps({
  dragging: {
    type: Boolean,
    default: false
  },
  effect: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'drag-end',
  'drag-start',
  'create-automation',
  'interaction-end',
  'interaction-start',
  'remove',
  'reset',
  'toggle-enabled',
  'toggle-expanded',
  'update-param'
])

const frequencyLabel = computed(() => `${Number(props.effect.params.frequency ?? 1).toFixed(2)} Hz`)
const depthLabel = computed(() => `${Math.round((props.effect.params.depth ?? 1) * 100)}%`)
const wetLabel = computed(() => `${Math.round((props.effect.params.wet ?? 1) * 100)}%`)

function handleFrequencyInput(event) {
  emit('update-param', props.effect.id, 'frequency', Number(event.target.value))
}

function handleDepthInput(event) {
  emit('update-param', props.effect.id, 'depth', Number(event.target.value))
}

function handleWetInput(event) {
  emit('update-param', props.effect.id, 'wet', Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
