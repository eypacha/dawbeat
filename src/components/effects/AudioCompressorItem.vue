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
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">Compressor</p>
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
            <label class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Compressor Threshold"
                    param-key="threshold"
                    @create="emit('create-automation', effect.id, 'threshold')"
                  />
                  <span>Threshold</span>
                </div>
                <span>{{ thresholdLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.threshold"
                max="0"
                min="-100"
                step="1"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleParamInput('threshold', $event)"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </label>

            <label class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Compressor Ratio"
                    param-key="ratio"
                    @create="emit('create-automation', effect.id, 'ratio')"
                  />
                  <span>Ratio</span>
                </div>
                <span>{{ ratioLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.ratio"
                max="20"
                min="1"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleParamInput('ratio', $event)"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </label>

            <label class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Compressor Attack"
                    param-key="attack"
                    @create="emit('create-automation', effect.id, 'attack')"
                  />
                  <span>Attack</span>
                </div>
                <span>{{ attackLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.attack"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleParamInput('attack', $event)"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </label>

            <label class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Compressor Release"
                    param-key="release"
                    @create="emit('create-automation', effect.id, 'release')"
                  />
                  <span>Release</span>
                </div>
                <span>{{ releaseLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.release"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleParamInput('release', $event)"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </label>

            <label class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Compressor Knee"
                    param-key="knee"
                    @create="emit('create-automation', effect.id, 'knee')"
                  />
                  <span>Knee</span>
                </div>
                <span>{{ kneeLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.knee"
                max="40"
                min="0"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="handleParamInput('knee', $event)"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </label>

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

const thresholdLabel = computed(() => `${Number(props.effect.params.threshold ?? 0).toFixed(0)} dB`)
const ratioLabel = computed(() => `${Number(props.effect.params.ratio ?? 0).toFixed(1)}:1`)
const attackLabel = computed(() => `${Number(props.effect.params.attack ?? 0).toFixed(3)} s`)
const releaseLabel = computed(() => `${Number(props.effect.params.release ?? 0).toFixed(3)} s`)
const kneeLabel = computed(() => `${Number(props.effect.params.knee ?? 0).toFixed(1)} dB`)

function handleParamInput(key, event) {
  emit('update-param', props.effect.id, key, Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
