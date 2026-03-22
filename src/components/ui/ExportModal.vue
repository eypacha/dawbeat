<template>
  <Modal :open="visible" size="sm" title="Export" @close="emit('close')">
    <div class="space-y-5">
      <!-- Format -->
      <div class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Format</p>
        <div class="flex gap-2">
          <button
            v-for="fmt in FORMATS"
            :key="fmt.value"
            class="flex-1 border py-2 text-[11px] uppercase tracking-[0.2em] transition"
            :class="
              format === fmt.value
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
            "
            type="button"
            @click="format = fmt.value"
          >
            {{ fmt.label }}
          </button>
        </div>
      </div>

      <!-- Render mode -->
      <div class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Render</p>
        <div class="flex gap-2">
          <button
            v-for="mode in MODES"
            :key="mode.value"
            class="flex-1 border py-2 text-[11px] uppercase tracking-[0.2em] transition"
            :class="
              renderMode === mode.value
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
            "
            type="button"
            @click="renderMode = mode.value"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Loop count -->
      <div v-if="renderMode === 'loop'" class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Loop count
        </p>
        <div class="flex items-center gap-3">
          <input
            v-model.number="loopCount"
            class="w-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            min="1"
            max="999"
            step="1"
            type="number"
          />
          <span class="shrink-0 text-xs text-zinc-500">
            {{ loopCount === 1 ? 'pass' : 'passes' }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-default disabled:opacity-40"
          type="button"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-indigo-200 transition hover:border-indigo-400/70 hover:bg-indigo-500/20 disabled:cursor-default disabled:opacity-40"
          :disabled="exporting"
          type="button"
          @click="handleExport"
        >
          {{ exporting ? 'Exporting…' : `Export ${format.toUpperCase()}` }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'

const FORMATS = [
  { label: 'WAV', value: 'wav' },
  { label: 'MP3', value: 'mp3' }
]

const MODES = [
  { label: 'Full render', value: 'full' },
  { label: 'Loop', value: 'loop' }
]

const props = defineProps({
  exporting: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'export'])

const format = ref('wav')
const renderMode = ref('full')
const loopCount = ref(2)

function handleExport() {
  if (props.exporting) return
  emit('export', {
    format: format.value,
    loopCount: renderMode.value === 'loop' ? Math.max(1, loopCount.value) : 1
  })
}
</script>
