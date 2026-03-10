<template>
  <article
    class="group w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 transition-colors"
    :class="[
      effect.enabled ? 'text-zinc-100 hover:bg-zinc-700/90' : 'text-zinc-400 hover:bg-zinc-800',
      dragging ? 'opacity-70' : ''
    ]"
  >
    <div class="flex min-w-0 items-start gap-2">
      <div
        class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
        :class="dragging ? 'cursor-grabbing' : ''"
        draggable="true"
        title="Drag effect"
        @dragstart="emit('drag-start', effect.id)"
        @dragend="emit('drag-end')"
      >
        <GripVertical class="h-3.5 w-3.5" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-zinc-50">Delay</p>
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
                  <span>Time</span>
                  <span>{{ delayTimeLabel }}</span>
                </div>

                <input
                  class="accent-amber-300"
                  :value="effect.params.delayTime"
                  max="1"
                  min="0"
                  step="0.01"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleDelayTimeInput"
                  @keydown="handleInteractionKeydown"
                  @keyup="emit('interaction-end')"
                  @pointercancel="emit('interaction-end')"
                  @pointerdown="emit('interaction-start')"
                  @pointerup="emit('interaction-end')"
                />
              </label>

              <label class="grid gap-2">
                <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                  <span>Feedback</span>
                  <span>{{ feedbackLabel }}</span>
                </div>

                <input
                  class="accent-amber-300"
                  :value="effect.params.feedback"
                  max="1"
                  min="0"
                  step="0.01"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleFeedbackInput"
                  @keydown="handleInteractionKeydown"
                  @keyup="emit('interaction-end')"
                  @pointercancel="emit('interaction-end')"
                  @pointerdown="emit('interaction-start')"
                  @pointerup="emit('interaction-end')"
                />
              </label>

              <label class="grid gap-2">
                <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                  <span>Mix</span>
                  <span>{{ mixLabel }}</span>
                </div>

                <input
                  class="accent-amber-300"
                  :value="effect.params.mix"
                  max="1"
                  min="0"
                  step="0.01"
                  type="range"
                  @blur="emit('interaction-end')"
                  @input="handleMixInput"
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
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { GripVertical, Power, SlidersHorizontal } from 'lucide-vue-next'
import CollapseTransition from '../ui/CollapseTransition.vue'

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
  'interaction-end',
  'interaction-start',
  'remove',
  'reset',
  'toggle-enabled',
  'toggle-expanded',
  'update-param'
])

const delayTimeLabel = computed(() => `${Number(props.effect.params.delayTime ?? 0).toFixed(2)} s`)
const feedbackLabel = computed(() => Number(props.effect.params.feedback ?? 0).toFixed(2))
const mixLabel = computed(() => Number(props.effect.params.mix ?? 0).toFixed(2))

function handleDelayTimeInput(event) {
  emit('update-param', props.effect.id, 'delayTime', Number(event.target.value))
}

function handleFeedbackInput(event) {
  emit('update-param', props.effect.id, 'feedback', Number(event.target.value))
}

function handleMixInput(event) {
  emit('update-param', props.effect.id, 'mix', Number(event.target.value))
}

function handleInteractionKeydown(event) {
  if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
    emit('interaction-start')
  }
}
</script>
