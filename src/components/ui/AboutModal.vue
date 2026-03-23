<template>
  <Modal :open="visible" size="sm" title="About DawBeat" @close="emit('close')">
    <div class="space-y-3 text-sm text-zinc-300">
      <p>
        DawBeat is a browser-based ByteBeat DAW focused on fast timeline composition, formula-based sound design,
        value trackers, and automation.
      </p>
      <p>
        You can sketch ideas with clips, variables, effects, and MIDI-aware workflows, then save projects as JSON or
        export the result to WAV/MP3.
      </p>
      <p class="text-xs text-zinc-400">
        <a
          class="text-emerald-300 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-200"
          href="https://github.com/eypacha/dawbeat"
          rel="noopener noreferrer"
          target="_blank"
        >
          github.com/eypacha/dawbeat
        </a>
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <button
          class="border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/ui/Modal.vue'

defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])
</script>
