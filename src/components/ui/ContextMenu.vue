<template>
  <div
    v-if="visible"
    ref="menuElement"
    class="fixed z-50 min-w-44 overflow-hidden rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
    :style="menuStyle"
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
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'select'])

const menuElement = ref(null)

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

function handleSelect(item) {
  emit('select', item.action, item)
  emit('close')
}

function handlePointerDown(event) {
  if (menuElement.value?.contains(event.target)) {
    return
  }

  emit('close')
}

function handleKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }

  emit('close')
}

function syncListeners(visible) {
  if (visible) {
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
    return
  }

  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
}

watch(
  () => props.visible,
  (visible) => {
    syncListeners(visible)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  syncListeners(false)
})
</script>
