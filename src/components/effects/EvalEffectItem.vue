<template>
  <article
    class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 text-zinc-100 transition-colors"
    :class="dragging ? 'cursor-grabbing opacity-70' : 'cursor-grab'"
    draggable="true"
    @dragstart="emit('drag-start', effect.id)"
    @dragend="emit('drag-end')"
  >
    <div class="flex min-w-0 items-start gap-3">
      <div
        class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-500"
        title="Drag effect"
      >
        <GripVertical class="h-4 w-4" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-zinc-50">Stereo Offset</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-sky-200">
                formula
              </span>
              <span class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {{ effect.enabled ? 'enabled' : 'bypassed' }}
              </span>
            </div>
          </div>

          <button
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded border transition"
            :class="effect.enabled
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'"
            type="button"
            @click="emit('toggle-enabled', effect.id)"
          >
            <Power class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 border-t border-zinc-700 pt-3">
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
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { GripVertical, Power } from 'lucide-vue-next'

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

const emit = defineEmits(['drag-end', 'drag-start', 'toggle-enabled', 'update-offset'])

function handleOffsetInput(event) {
  emit('update-offset', props.effect.id, Number(event.target.value))
}
</script>
