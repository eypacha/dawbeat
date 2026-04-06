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
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">Mid/Side Comp</p>
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
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Mid</p>

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

            <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">Side</p>

            <div class="grid gap-2">
              <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                <div class="flex items-center gap-2">
                  <EffectParamAutomationButton
                    :effect-id="effect.id"
                    label="Side Threshold"
                    param-key="sideThreshold"
                    @create="emit('create-automation', effect.id, 'sideThreshold')"
                  />
                  <span>Threshold</span>
                </div>
                <span>{{ sideThresholdLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.sideThreshold"
                max="0"
                min="-100"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'sideThreshold', Number($event.target.value))"
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
                    label="Side Ratio"
                    param-key="sideRatio"
                    @create="emit('create-automation', effect.id, 'sideRatio')"
                  />
                  <span>Ratio</span>
                </div>
                <span>{{ sideRatioLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.sideRatio"
                max="20"
                min="1"
                step="0.1"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'sideRatio', Number($event.target.value))"
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
                <span>{{ sideAttackLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.sideAttack"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'sideAttack', Number($event.target.value))"
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
                <span>{{ sideReleaseLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.sideRelease"
                max="1"
                min="0"
                step="0.001"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'sideRelease', Number($event.target.value))"
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
                <span>{{ sideKneeLabel }}</span>
              </div>
              <input
                class="accent-amber-300"
                :value="effect.params.sideKnee"
                max="40"
                min="0"
                step="0.5"
                type="range"
                @blur="emit('interaction-end')"
                @input="emit('update-param', effect.id, 'sideKnee', Number($event.target.value))"
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

const midThresholdLabel = computed(() => `${Number(props.effect.params.midThreshold ?? -24).toFixed(1)} dB`)
const midRatioLabel = computed(() => `${Number(props.effect.params.midRatio ?? 3).toFixed(1)}:1`)
const midAttackLabel = computed(() => `${Number(props.effect.params.midAttack ?? 0.02).toFixed(3)} s`)
const midReleaseLabel = computed(() => `${Number(props.effect.params.midRelease ?? 0.03).toFixed(3)} s`)
const midKneeLabel = computed(() => `${Number(props.effect.params.midKnee ?? 16).toFixed(1)} dB`)
const sideThresholdLabel = computed(() => `${Number(props.effect.params.sideThreshold ?? -30).toFixed(1)} dB`)
const sideRatioLabel = computed(() => `${Number(props.effect.params.sideRatio ?? 6).toFixed(1)}:1`)
const sideAttackLabel = computed(() => `${Number(props.effect.params.sideAttack ?? 0.03).toFixed(3)} s`)
const sideReleaseLabel = computed(() => `${Number(props.effect.params.sideRelease ?? 0.25).toFixed(3)} s`)
const sideKneeLabel = computed(() => `${Number(props.effect.params.sideKnee ?? 10).toFixed(1)} dB`)

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
