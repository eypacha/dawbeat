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
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">Multiband Comp</p>
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
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Crossover</p>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Low Freq"
                    param-key="lowFrequency"
                    @create="emit('create-automation', effect.id, 'lowFrequency')"
                  />
                  <span>Low Freq</span>
                </div>
                <span>{{ lowFreqLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowFrequency"
                max="5000"
                min="20"
                step="1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowFrequency', Number($event.target.value))"
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
                    label="High Freq"
                    param-key="highFrequency"
                    @create="emit('create-automation', effect.id, 'highFrequency')"
                  />
                  <span>High Freq</span>
                </div>
                <span>{{ highFreqLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highFrequency"
                max="20000"
                min="200"
                step="1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highFrequency', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">Low Band</p>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Low Threshold"
                    param-key="lowThreshold"
                    @create="emit('create-automation', effect.id, 'lowThreshold')"
                  />
                  <span>Threshold</span>
                </div>
                <span>{{ lowThresholdLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowThreshold"
                max="0"
                min="-100"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowThreshold', Number($event.target.value))"
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
                    label="Low Ratio"
                    param-key="lowRatio"
                    @create="emit('create-automation', effect.id, 'lowRatio')"
                  />
                  <span>Ratio</span>
                </div>
                <span>{{ lowRatioLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowRatio"
                max="20"
                min="1"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowRatio', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Attack</span>
                <span>{{ lowAttackLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowAttack"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowAttack', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Release</span>
                <span>{{ lowReleaseLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowRelease"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowRelease', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Knee</span>
                <span>{{ lowKneeLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.lowKnee"
                max="40"
                min="0"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'lowKnee', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">Mid Band</p>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Mid Threshold"
                    param-key="midThreshold"
                    @create="emit('create-automation', effect.id, 'midThreshold')"
                  />
                  <span>Threshold</span>
                </div>
                <span>{{ midThresholdLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.midThreshold"
                max="0"
                min="-100"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'midThreshold', Number($event.target.value))"
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
                    label="Mid Ratio"
                    param-key="midRatio"
                    @create="emit('create-automation', effect.id, 'midRatio')"
                  />
                  <span>Ratio</span>
                </div>
                <span>{{ midRatioLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.midRatio"
                max="20"
                min="1"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'midRatio', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Attack</span>
                <span>{{ midAttackLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.midAttack"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'midAttack', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Release</span>
                <span>{{ midReleaseLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.midRelease"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'midRelease', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Knee</span>
                <span>{{ midKneeLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.midKnee"
                max="40"
                min="0"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'midKnee', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">High Band</p>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="High Threshold"
                    param-key="highThreshold"
                    @create="emit('create-automation', effect.id, 'highThreshold')"
                  />
                  <span>Threshold</span>
                </div>
                <span>{{ highThresholdLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highThreshold"
                max="0"
                min="-100"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highThreshold', Number($event.target.value))"
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
                    label="High Ratio"
                    param-key="highRatio"
                    @create="emit('create-automation', effect.id, 'highRatio')"
                  />
                  <span>Ratio</span>
                </div>
                <span>{{ highRatioLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highRatio"
                max="20"
                min="1"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highRatio', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Attack</span>
                <span>{{ highAttackLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highAttack"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highAttack', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Release</span>
                <span>{{ highReleaseLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highRelease"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highRelease', Number($event.target.value))"
                @keydown="handleInteractionKeydown"
                @keyup="emit('interaction-end')"
                @pointercancel="emit('interaction-end')"
                @pointerdown="emit('interaction-start')"
                @pointerup="emit('interaction-end')"
              />
            </div>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <span>Knee</span>
                <span>{{ highKneeLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.highKnee"
                max="40"
                min="0"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'highKnee', Number($event.target.value))"
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

const lowFreqLabel = computed(() => `${Number(props.effect.params.lowFrequency ?? 250).toFixed(0)} Hz`)
const highFreqLabel = computed(() => `${Number(props.effect.params.highFrequency ?? 2000).toFixed(0)} Hz`)
const lowThresholdLabel = computed(() => `${Number(props.effect.params.lowThreshold ?? -30).toFixed(1)} dB`)
const lowRatioLabel = computed(() => `${Number(props.effect.params.lowRatio ?? 6).toFixed(1)}:1`)
const lowAttackLabel = computed(() => `${Number(props.effect.params.lowAttack ?? 0.03).toFixed(3)} s`)
const lowReleaseLabel = computed(() => `${Number(props.effect.params.lowRelease ?? 0.25).toFixed(3)} s`)
const lowKneeLabel = computed(() => `${Number(props.effect.params.lowKnee ?? 10).toFixed(1)} dB`)
const midThresholdLabel = computed(() => `${Number(props.effect.params.midThreshold ?? -24).toFixed(1)} dB`)
const midRatioLabel = computed(() => `${Number(props.effect.params.midRatio ?? 3).toFixed(1)}:1`)
const midAttackLabel = computed(() => `${Number(props.effect.params.midAttack ?? 0.02).toFixed(3)} s`)
const midReleaseLabel = computed(() => `${Number(props.effect.params.midRelease ?? 0.03).toFixed(3)} s`)
const midKneeLabel = computed(() => `${Number(props.effect.params.midKnee ?? 16).toFixed(1)} dB`)
const highThresholdLabel = computed(() => `${Number(props.effect.params.highThreshold ?? -24).toFixed(1)} dB`)
const highRatioLabel = computed(() => `${Number(props.effect.params.highRatio ?? 3).toFixed(1)}:1`)
const highAttackLabel = computed(() => `${Number(props.effect.params.highAttack ?? 0.02).toFixed(3)} s`)
const highReleaseLabel = computed(() => `${Number(props.effect.params.highRelease ?? 0.03).toFixed(3)} s`)
const highKneeLabel = computed(() => `${Number(props.effect.params.highKnee ?? 16).toFixed(1)} dB`)

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
