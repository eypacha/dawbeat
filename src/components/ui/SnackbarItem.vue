<template>
  <div :class="snackbarClassName" role="status">
    {{ notification.message }}
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  notification: {
    type: Object,
    required: true
  }
})

const snackbarClassName = computed(() => {
  const variantClassName =
    props.notification.variant === 'success'
      ? 'bg-green-600'
      : props.notification.variant === 'warning'
        ? 'bg-yellow-500 text-zinc-950'
        : props.notification.variant === 'error'
          ? 'border border-red-400/30 bg-red-500/18 text-red-100 backdrop-blur-sm'
          : 'bg-zinc-800'

  return [
    'rounded px-4 py-2 text-sm shadow-lg',
    props.notification.variant === 'warning' ? '' : 'text-white',
    variantClassName
  ]
})
</script>
