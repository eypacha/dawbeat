<template>
  <div
    v-if="open"
    class="pointer-events-none fixed inset-0 z-50"
  >
    <div
      ref="panelElement"
      :class="panelClassName"
      :style="panelStyle"
    >
      <header
        v-if="title || $slots.header"
        class="mb-4 cursor-grab select-none active:cursor-grabbing"
        @pointerdown="handleHeaderPointerDown"
      >
        <slot name="header">
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
        </slot>
      </header>

      <div class="min-h-0 flex-1">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="mt-4">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

const props = defineProps({
  closeOnEsc: {
    type: Boolean,
    default: true
  },
  open: {
    type: Boolean,
    required: true
  },
  panelClass: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md'
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const WINDOW_MARGIN = 8

const panelElement = ref(null)
const position = reactive({
  x: WINDOW_MARGIN,
  y: WINDOW_MARGIN
})
const dragState = reactive({
  active: false,
  originX: 0,
  originY: 0,
  startX: 0,
  startY: 0
})
const positionInitialized = ref(false)

const panelClassName = computed(() => {
  let widthClassName = 'w-[min(calc(100vw-1rem),32rem)]'

  if (props.size === 'sm') {
    widthClassName = 'w-[min(calc(100vw-1rem),24rem)]'
  } else if (props.size === 'lg') {
    widthClassName = 'w-[min(calc(100vw-1rem),42rem)]'
  } else if (props.size === 'xl') {
    widthClassName = 'w-[min(calc(100vw-1rem),72rem)]'
  }

  return [
    'pointer-events-auto absolute flex max-h-[calc(100vh-1rem)] flex-col overflow-hidden border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40',
    widthClassName,
    props.panelClass
  ]
    .filter(Boolean)
    .join(' ')
})

const panelStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`
}))

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      removeWindowListeners()
      return
    }

    await nextTick()

    if (!positionInitialized.value) {
      centerPanel()
      positionInitialized.value = true
    } else {
      clampPanelPosition()
    }

    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', handleResize)
  },
  { immediate: true }
)

function handleHeaderPointerDown(event) {
  if (event.button !== 0) {
    return
  }

  if (event.target instanceof Element && event.target.closest('[data-window-no-drag="true"]')) {
    return
  }

  dragState.active = true
  dragState.originX = position.x
  dragState.originY = position.y
  dragState.startX = event.clientX
  dragState.startY = event.clientY

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerEnd)
  window.addEventListener('pointercancel', handlePointerEnd)
}

function handlePointerMove(event) {
  if (!dragState.active) {
    return
  }

  const panelSize = getPanelSize()
  position.x = clampAxis(
    dragState.originX + (event.clientX - dragState.startX),
    panelSize.width,
    window.innerWidth
  )
  position.y = clampAxis(
    dragState.originY + (event.clientY - dragState.startY),
    panelSize.height,
    window.innerHeight
  )
}

function handlePointerEnd() {
  dragState.active = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerEnd)
  window.removeEventListener('pointercancel', handlePointerEnd)
}

function handleKeydown(event) {
  if (!props.open || !props.closeOnEsc || event.key !== 'Escape') {
    return
  }

  emit('close')
}

function handleResize() {
  clampPanelPosition()
}

function centerPanel() {
  const panelSize = getPanelSize()
  position.x = clampAxis((window.innerWidth - panelSize.width) / 2, panelSize.width, window.innerWidth)
  position.y = clampAxis((window.innerHeight - panelSize.height) / 2, panelSize.height, window.innerHeight)
}

function clampPanelPosition() {
  const panelSize = getPanelSize()
  position.x = clampAxis(position.x, panelSize.width, window.innerWidth)
  position.y = clampAxis(position.y, panelSize.height, window.innerHeight)
}

function getPanelSize() {
  return {
    height: panelElement.value?.offsetHeight ?? 0,
    width: panelElement.value?.offsetWidth ?? 0
  }
}

function clampAxis(value, panelSize, viewportSize) {
  const numericValue = Number(value)
  const min = WINDOW_MARGIN
  const max = Math.max(WINDOW_MARGIN, viewportSize - panelSize - WINDOW_MARGIN)

  if (!Number.isFinite(numericValue)) {
    return min
  }

  return Math.min(Math.max(numericValue, min), max)
}

function removeWindowListeners() {
  handlePointerEnd()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
}

onBeforeUnmount(() => {
  removeWindowListeners()
})
</script>
