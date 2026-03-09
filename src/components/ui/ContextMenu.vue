<template>
  <div
    v-if="visible"
    ref="menuElement"
    class="fixed z-50 min-w-44 rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
    :style="menuStyle"
  >
    <div
      v-for="item in items"
      :key="`${item.action}-${item.label}`"
      class="relative"
    >
      <button
        class="flex w-full items-center justify-between px-3 py-1.5 text-left transition hover:bg-zinc-700"
        type="button"
        @click="handleItemClick(item)"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.type === 'palette'" class="text-zinc-400">▶</span>
      </button>

      <div
        v-if="item.type === 'palette' && activePaletteItem === item.action"
        class="absolute left-full top-0 ml-1"
      >
        <TrackColorPalette
          :colors="item.colors"
          :selected-color="item.selectedColor"
          @select="handlePaletteSelect(item, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import TrackColorPalette from '@/components/timeline/TrackColorPalette.vue'

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

const activePaletteItem = ref(null)
const menuElement = ref(null)

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

function handleSelect(item) {
  emit('select', item.action, item)
  emit('close')
}

function handleItemClick(item) {
  if (item.type === 'palette') {
    activePaletteItem.value = activePaletteItem.value === item.action ? null : item.action
    return
  }

  handleSelect(item)
}

function handlePaletteSelect(item, color) {
  emit('select', item.action, { ...item, color })
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

  activePaletteItem.value = null
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
