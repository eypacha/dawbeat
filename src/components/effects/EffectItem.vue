<template>
  <article
    class="group w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 transition-colors"
    :class="[
      effect.enabled ? 'text-zinc-100 hover:bg-zinc-700/90' : 'text-zinc-400 hover:bg-zinc-800',
      dragging ? 'cursor-grabbing opacity-70' : 'cursor-grab'
    ]"
    draggable="true"
    @click="emit('toggle-expanded', effect.id)"
    @dragstart="emit('drag-start', effect.id)"
    @dragend="emit('drag-end')"
  >
    <div class="flex min-w-0 items-start gap-3">
      <div
        class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-500 transition group-hover:text-zinc-300"
        title="Drag effect"
      >
        <GripVertical class="h-3.5 w-3.5" />
      </div>

      <button
        class="min-w-0 flex-1 text-left"
        type="button"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-zinc-50">{{ effect.name }}</p>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button
              class="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
              type="button"
              @click.stop="emit('toggle-expanded', effect.id)"
            >
              <SlidersHorizontal class="h-3.5 w-3.5" />
            </button>

            <button
              class="flex h-7 w-7 items-center justify-center rounded border transition"
              :class="effect.enabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'"
              type="button"
              @click.stop="emit('toggle-enabled', effect.id)"
            >
              <Power class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </button>
    </div>

    <div
      v-if="effect.expanded"
      class="mt-3"
    >
      <div class="grid gap-3">
        <div
          v-for="parameter in effect.parameters"
          :key="parameter.label"
          class="grid gap-1"
        >
          <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            <span>{{ parameter.label }}</span>
            <span>{{ parameter.value }}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-zinc-950">
            <div
              class="h-full rounded-full"
              :class="effect.type === 'formula' ? 'bg-sky-400/70' : 'bg-amber-400/70'"
              :style="{ width: parameter.fill }"
            />
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { GripVertical, Power, SlidersHorizontal } from 'lucide-vue-next'

defineProps({
  dragging: {
    type: Boolean,
    default: false
  },
  effect: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['drag-end', 'drag-start', 'toggle-enabled', 'toggle-expanded'])
</script>
