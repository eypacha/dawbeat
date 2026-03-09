<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="handleBackdropClick"
  >
    <div :class="panelClassName">
      <header
        v-if="title || $slots.header"
        class="mb-4"
      >
        <slot name="header">
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
        </slot>
      </header>

      <div>
        <slot />
      </div>

      <footer v-if="$slots.footer" class="mt-4">
        <slot name="footer" />
      </footer>
    </div>
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

const panelClassName = computed(() => {
  let widthClassName = 'max-w-lg'

  if (props.size === 'sm') {
    widthClassName = 'max-w-sm'
  } else if (props.size === 'lg') {
    widthClassName = 'max-w-2xl'
  }

  return `relative w-full ${widthClassName} rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40`
})

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
