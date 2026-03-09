<template>
  <div ref="rootElement" class="relative inline-flex">
    <div @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <div
      v-if="open"
      class="absolute right-0 top-full z-40 mt-2 min-w-40 rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
    >
      <button
        v-for="item in items"
        :key="`${item.action}-${item.label}`"
        class="flex w-full items-center px-3 py-1.5 text-left transition hover:bg-zinc-700"
        type="button"
        @click="handleSelect(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const open = ref(false)
const rootElement = ref(null)

function close() {
  open.value = false
}

function toggle() {
  open.value = !open.value
}

function handleSelect(item) {
  emit('select', item)
  close()
}

function handlePointerDown(event) {
  if (rootElement.value?.contains(event.target)) {
    return
  }

  close()
}

function handleKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }

  close()
}

watch(open, (value) => {
  if (value) {
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
    return
  }

  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})
</script>
