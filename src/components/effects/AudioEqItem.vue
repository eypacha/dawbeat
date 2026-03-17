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
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">EQ3</p>
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
                      label="EQ3 Low"
                      param-key="low"
                      @create="emit('create-automation', effect.id, 'low')"
                    />
                    <span>Low</span>
                  </div>
                  <span>{{ lowLabel }}</span>
                </div>
                <input
                  class="accent-amber-300"
                  :value="effect.params.low"
                  max="24"
                  min="-24"
                  step="1"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleParamInput('low', $event)"
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
                      label="EQ3 Mid"
                      param-key="mid"
                      @create="emit('create-automation', effect.id, 'mid')"
                    />
                    <span>Mid</span>
                  </div>
                  <span>{{ midLabel }}</span>
                </div>
                <input
                  class="accent-amber-300"
                  :value="effect.params.mid"
                  max="24"
                  min="-24"
                  step="1"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleParamInput('mid', $event)"
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
                      label="EQ3 High"
                      param-key="high"
                      @create="emit('create-automation', effect.id, 'high')"
                    />
                    <span>High</span>
                  </div>
                  <span>{{ highLabel }}</span>
                </div>
                <input
                  class="accent-amber-300"
                  :value="effect.params.high"
                  max="24"
                  min="-24"
                  step="1"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleParamInput('high', $event)"
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
                      label="EQ3 Low Cut"
                      param-key="lowFrequency"
                      @create="emit('create-automation', effect.id, 'lowFrequency')"
                    />
                    <span>Low Cut</span>
                  </div>
                  <span>{{ lowFrequencyLabel }}</span>
                </div>
                <input
                  class="accent-amber-300"
                  :value="effect.params.lowFrequency"
                  max="12000"
                  min="40"
                  step="10"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleParamInput('lowFrequency', $event)"
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
                      label="EQ3 High Cut"
                      param-key="highFrequency"
                      @create="emit('create-automation', effect.id, 'highFrequency')"
                    />
                    <span>High Cut</span>
                  </div>
                  <span>{{ highFrequencyLabel }}</span>
                </div>
                <input
                  class="accent-amber-300"
                  :value="effect.params.highFrequency"
                  max="12000"
                  min="40"
                  step="10"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleParamInput('highFrequency', $event)"
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

const lowLabel = computed(() => `${Number(props.effect.params.low ?? 0).toFixed(0)} dB`)
const midLabel = computed(() => `${Number(props.effect.params.mid ?? 0).toFixed(0)} dB`)
const highLabel = computed(() => `${Number(props.effect.params.high ?? 0).toFixed(0)} dB`)
const lowFrequencyLabel = computed(() => `${Number(props.effect.params.lowFrequency ?? 0).toFixed(0)} Hz`)
const highFrequencyLabel = computed(() => `${Number(props.effect.params.highFrequency ?? 0).toFixed(0)} Hz`)

function handleParamInput(key, event) {
  emit('update-param', props.effect.id, key, Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
