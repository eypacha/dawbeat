<template>
  <div
    v-if="visible"
    ref="menuElement"
    class="fixed z-50 min-w-44 rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
    data-context-menu-enabled="true"
    :style="menuStyle"
  >
    <div
      v-for="item in items"
      :key="`${item.action}-${item.label}`"
      class="relative"
    >
      <button
        :ref="(element) => setTriggerRef(item.action, element)"
        class="flex w-full items-center justify-between px-3 py-1.5 text-left transition hover:bg-zinc-700"
        type="button"
        @click="handleItemClick(item)"
      >
        <span>{{ item.label }}</span>
        <span v-if="hasSubmenu(item)" class="text-zinc-400">▶</span>
      </button>

      <div
        v-if="hasSubmenu(item) && activeSubmenuItem === item.action"
        :ref="(element) => setActiveSubmenuElement(item.action, element)"
        class="absolute left-full ml-1"
        :style="submenuStyle"
      >
        <slot
          name="submenu"
          :close="closeMenu"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useSlots, watch } from 'vue'

const VIEWPORT_PADDING = 8

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

const slots = useSlots()
const activeSubmenuElementByAction = new Map()
const activeSubmenuItem = ref(null)
const menuElement = ref(null)
const menuPosition = ref({ left: props.x, top: props.y })
const submenuDirection = ref('down')
const triggerRefs = new Map()

const menuStyle = computed(() => ({
  left: `${menuPosition.value.left}px`,
  top: `${menuPosition.value.top}px`
}))

const submenuStyle = computed(() =>
  submenuDirection.value === 'up' ? { bottom: '0' } : { top: '0' }
)

function handleSelect(item) {
  emit('select', item.action, item)
  closeMenu()
}

async function handleItemClick(item) {
  if (hasSubmenu(item)) {
    activeSubmenuItem.value = activeSubmenuItem.value === item.action ? null : item.action
    await nextTick()
    syncSubmenuPosition(item.action)
    return
  }

  handleSelect(item)
}

function closeMenu() {
  emit('close')
}

function handlePointerDown(event) {
  if (menuElement.value?.contains(event.target)) {
    return
  }

  closeMenu()
}

function handleKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }

  closeMenu()
}

function clampToViewport(value, size, viewportSize) {
  return Math.min(Math.max(VIEWPORT_PADDING, value), Math.max(VIEWPORT_PADDING, viewportSize - size - VIEWPORT_PADDING))
}

function setTriggerRef(action, element) {
  if (element instanceof HTMLElement) {
    triggerRefs.set(action, element)
    return
  }

  triggerRefs.delete(action)
}

function setActiveSubmenuElement(action, element) {
  if (element instanceof HTMLElement) {
    activeSubmenuElementByAction.set(action, element)
    return
  }

  activeSubmenuElementByAction.delete(action)
}

function hasSubmenu(item) {
  return Boolean(item.type && slots.submenu)
}

async function syncMenuPosition() {
  if (!props.visible) {
    return
  }

  await nextTick()

  if (!menuElement.value) {
    return
  }

  const { width, height } = menuElement.value.getBoundingClientRect()

  menuPosition.value = {
    left: clampToViewport(props.x, width, window.innerWidth),
    top: clampToViewport(props.y, height, window.innerHeight)
  }
}

function syncSubmenuPosition(action) {
  if (!action) {
    return
  }

  const submenuElement = activeSubmenuElementByAction.get(action)
  const triggerElement = triggerRefs.get(action)

  if (!submenuElement || !triggerElement) {
    return
  }

  const triggerRect = triggerElement.getBoundingClientRect()
  const submenuRect = submenuElement.getBoundingClientRect()
  const submenuBottom = triggerRect.top + submenuRect.height

  submenuDirection.value = submenuBottom > window.innerHeight - VIEWPORT_PADDING ? 'up' : 'down'
}

function syncListeners(visible) {
  if (visible) {
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
    return
  }

  activeSubmenuItem.value = null
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
}

watch(
  () => [props.visible, props.x, props.y, props.items],
  async ([visible]) => {
    syncListeners(visible)

    if (visible) {
      await syncMenuPosition()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  syncListeners(false)
})
</script>
