<template>
  <div
    class="absolute z-10"
    :class="[
      groupVisual.isEditing || groupVisual.isDisabled ? 'pointer-events-none' : '',
      groupVisual.isDisabled ? 'opacity-35' : ''
    ]"
    :style="groupVisual.style"
  >
    <div
      class="timeline-group-clip absolute inset-0 overflow-hidden border"
      :class="shellClassName"
    >
      <TimelineGroupWaveform
        v-if="showClipWaveforms && !groupVisual.isEditing"
        :group-visual="groupVisual"
      />

      <button
        v-if="!groupVisual.isEditing && !groupVisual.isDisabled"
        class="absolute inset-0 z-[1] cursor-grab appearance-none border-0 bg-transparent p-0"
        data-context-menu-enabled="true"
        type="button"
        @click.stop="emit('select', $event)"
        @contextmenu.stop.prevent="emit('contextmenu', $event)"
        @dblclick.stop="emit('edit', $event)"
        @pointerdown.stop="emit('pointerdown', $event)"
      />

      <template v-if="groupVisual.isEditing">
        <div class="pointer-events-none absolute left-1 top-1 z-[2] inline-flex max-w-[calc(100%-8px)] items-center truncate rounded border border-zinc-100/20 bg-zinc-950/88 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-100">
          {{ groupVisual.name }}
        </div>
      </template>

      <template v-else>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-white/12 via-white/5 to-transparent" />
        <div
          class="pointer-events-none absolute inset-0 opacity-20"
          style="background-image: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0 10px, transparent 10px 20px);"
        />

        <div class="pointer-events-none relative z-[2] flex h-full flex-col justify-between p-2">
          <div class="flex items-start gap-2">
            <div class="min-w-0">
              <span class="block truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-50">
                {{ groupVisual.name }}
              </span>
              <span
                v-if="showSummary"
                class="mt-0.5 block truncate text-[10px] text-zinc-100/70"
              >
                {{ groupVisual.summary }}
              </span>
            </div>
          </div>

          <div
            v-if="showFooter"
            class="flex items-end justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-100/60"
          >
            <span>Group Clip</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import TimelineGroupWaveform from '@/components/timeline/TimelineGroupWaveform.vue'
import { useDawStore } from '@/stores/dawStore'

const props = defineProps({
  groupVisual: {
    type: Object,
    required: true
  }
})

const dawStore = useDawStore()
const { showClipWaveforms } = storeToRefs(dawStore)
const emit = defineEmits(['contextmenu', 'edit', 'pointerdown', 'select'])

const shellClassName = computed(() => {
  if (props.groupVisual.isEditing) {
    return 'timeline-group-clip--editing'
  }

  return props.groupVisual.isSelected
    ? 'timeline-group-clip--selected'
    : 'timeline-group-clip--default'
})

const showSummary = computed(() => props.groupVisual.width >= 88 && props.groupVisual.height >= 36)
const showFooter = computed(() => props.groupVisual.width >= 168 && props.groupVisual.height >= 58)
</script>

<style scoped>
.timeline-group-clip {
  border-color: color-mix(in srgb, var(--group-clip-color) 58%, white 42%);
}

.timeline-group-clip--default {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--group-clip-color) 92%, white 8%) 0%,
      color-mix(in srgb, var(--group-clip-color) 84%, black 16%) 56%,
      color-mix(in srgb, var(--group-clip-color) 74%, black 26%) 100%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 0 1px rgba(9, 9, 11, 0.28);
}

.timeline-group-clip--selected {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--group-clip-color) 78%, white 22%) 0%,
      color-mix(in srgb, var(--group-clip-color) 86%, white 14%) 56%,
      color-mix(in srgb, var(--group-clip-color) 82%, black 18%) 100%
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 0 0 1px color-mix(in srgb, var(--group-clip-color) 46%, white 54%),
    0 18px 28px -22px color-mix(in srgb, var(--group-clip-color) 70%, transparent);
}

.timeline-group-clip--editing {
  background: transparent;
  border-color: color-mix(in srgb, var(--group-clip-color) 74%, white 26%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--group-clip-color) 46%, transparent);
}

</style>
