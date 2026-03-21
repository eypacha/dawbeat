<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40"
    :class="showBackdrop ? '' : 'pointer-events-none'"
  >
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <button
        v-if="showBackdrop"
        class="absolute inset-0 bg-black/55"
        type="button"
        @click="handleBackdropClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-220 ease-out"
      :enter-from-class="drawerEnterFromClassName"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-180 ease-in"
      leave-from-class="translate-x-0"
      :leave-to-class="drawerEnterFromClassName"
    >
      <aside
        v-if="open"
        :class="[drawerPositionClassName, panelClass, 'pointer-events-auto absolute inset-y-0']"
      >
        <slot />
      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'

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

const drawerEnterFromClassName = computed(() =>
  props.side === 'right' ? 'translate-x-full' : '-translate-x-full'
)

const drawerPositionClassName = computed(() =>
  props.side === 'right' ? 'right-0' : 'left-0'
)

function handleBackdropClick() {
  if (!props.closeOnBackdrop) {
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
