<template>
  <TransitionGroup
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
    name="snackbar"
    tag="div"
  >
    <SnackbarItem
      v-for="notification in notifications"
      :key="notification.id"
      :notification="notification"
    />
  </TransitionGroup>
</template>

<script setup>
import SnackbarItem from '@/components/ui/SnackbarItem.vue'
import { notifications } from '@/services/notifications'
</script>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.snackbar-move {
  transition: transform 180ms ease;
}
</style>
