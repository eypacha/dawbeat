<template>
  <div
    class="fixed inset-0 z-40"
    :class="rootClassName"
  >
    <Transition
      enter-active-class="transition-opacity duration-220 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-180 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="open && showBackdrop"
        class="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        type="button"
        @click="handleBackdropClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition-all duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]"
      :enter-from-class="drawerEnterFromClassName"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-180 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      :leave-to-class="drawerEnterFromClassName"
    >
      <aside
        v-if="open"
        ref="panelElement"
        :class="[drawerPositionClassName, panelClass, 'pointer-events-auto absolute inset-y-0']"
      >
        <slot />
      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  closeOnBackdrop: {
    type: Boolean,
    default: true
  },
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
    default: 'w-[min(calc(100vw-1rem),22rem)] p-4'
  },
  side: {
    type: String,
    default: 'left'
  },
  showBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])
const panelElement = ref(null)

const drawerEnterFromClassName = computed(() =>
  props.side === 'right' ? 'translate-x-12 opacity-0' : '-translate-x-12 opacity-0'
)

const drawerPositionClassName = computed(() =>
  props.side === 'right' ? 'right-0' : 'left-0'
)
const rootClassName = computed(() => {
  if (!props.open) {
    return 'pointer-events-none'
  }

  return props.showBackdrop ? '' : 'pointer-events-none'
})

function handleBackdropClick() {
  if (!props.closeOnBackdrop) {
    return
  }

  emit('close')
}

function handleGlobalPointerDown(event) {
  if (!props.open || props.showBackdrop) {
    return
  }

  if (!(event.target instanceof Node)) {
    return
  }

  if (panelElement.value?.contains(event.target)) {
    return
  }

  emit('close')
}

function handleKeydown(event) {
  if (!props.open || !props.closeOnEsc || event.key !== 'Escape') {
    return
  }

  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeydown)
      window.addEventListener('pointerdown', handleGlobalPointerDown, true)
      return
    }

    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('pointerdown', handleGlobalPointerDown, true)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointerdown', handleGlobalPointerDown, true)
})
</script>
