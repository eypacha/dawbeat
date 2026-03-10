<template>
  <article
    class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 text-zinc-100 transition-colors"
    :class="dragging ? 'opacity-70' : ''"
  >
    <div class="flex min-w-0 items-start gap-2">
      <div
        class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500"
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
            <p class="truncate text-sm font-medium text-zinc-50">{{ effectTitle }}</p>
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

        <div v-if="effect.expanded" class="mt-4">
          <div class="grid gap-3">
            <template v-if="effect.type === 'stereoOffset'">
              <label class="grid gap-2">
                <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Offset</span>
                <input
                  class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                  :value="effect.params.offset"
                  min="0"
                  type="number"
                  @input="handleOffsetInput"
                />
              </label>
            </template>

            <template v-else-if="effect.type === 'tReplacement'">
              <div class="grid gap-2">
                <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Mode</span>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] transition"
                    :class="!effect.params.stereo
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
                    type="button"
                    @click="handleStereoToggle(false)"
                  >
                    Mono
                  </button>

                  <button
                    class="rounded border px-3 py-2 text-xs uppercase tracking-[0.18em] transition"
                    :class="effect.params.stereo
                      ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
                    type="button"
                    @click="handleStereoToggle(true)"
                  >
                    Stereo
                  </button>
                </div>
              </div>

              <template v-if="effect.params.stereo">
                <label class="grid gap-2">
                  <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Left</span>
                  <input
                    class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                    :value="effect.params.leftExpression"
                    type="text"
                    @input="handleExpressionInput('leftExpression', $event)"
                  />
                </label>

                <label class="grid gap-2">
                  <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Right</span>
                  <input
                    class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                    :value="effect.params.rightExpression"
                    type="text"
                    @input="handleExpressionInput('rightExpression', $event)"
                  />
                </label>
              </template>

              <label v-else class="grid gap-2">
                <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Replacement</span>
                <input
                  class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                  :value="effect.params.expression"
                  type="text"
                  @input="handleExpressionInput('expression', $event)"
                />
              </label>
            </template>

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
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { GripVertical, Power, SlidersHorizontal } from 'lucide-vue-next'

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
  'remove',
  'reset',
  'toggle-enabled',
  'toggle-expanded',
  'update-param'
])

const effectTitle = computed(() => {
  if (props.effect.type === 'tReplacement') {
    return 'T Replacement'
  }

  return 'Stereo Offset'
})

function handleOffsetInput(event) {
  emit('update-param', props.effect.id, 'offset', Number(event.target.value))
}

function handleStereoToggle(nextStereo) {
  emit('update-param', props.effect.id, 'stereo', nextStereo)
}

function handleExpressionInput(key, event) {
  emit('update-param', props.effect.id, key, event.target.value)
}
</script>
