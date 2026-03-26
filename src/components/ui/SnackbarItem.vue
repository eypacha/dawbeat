<template>
  <div :class="snackbarClassName" role="status">
    <span class="break-all">{{ notification.message }}</span>
    <button
      v-if="notification.persistent"
      class="ml-3 shrink-0 opacity-70 transition hover:opacity-100"
      type="button"
      aria-label="Dismiss"
      @click="removeSnackbar(notification.id)"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { removeSnackbar } from '@/services/notifications'

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
    'flex items-center gap-1 rounded px-4 py-2 text-sm shadow-lg',
    props.notification.variant === 'warning' ? '' : 'text-white',
    variantClassName
  ]
})
</script>
