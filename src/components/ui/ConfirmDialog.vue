<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40">
      <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
      <p class="mt-3 text-sm text-zinc-200">{{ message }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="rounded border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 transition hover:border-red-400/70 hover:bg-red-500/20"
          type="button"
          @click="emit('confirm')"
        >
          Delete Track
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Confirm'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

function handleKeydown(event) {
  if (event.key !== 'Escape' || !props.visible) {
    return
  }

  emit('cancel')
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleKeydown)
      return
    }

    window.removeEventListener('keydown', handleKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
