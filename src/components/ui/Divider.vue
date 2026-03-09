<template>
  <div
    aria-hidden="true"
    :class="dividerClassName"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  orientation: {
    type: String,
    default: 'vertical'
  }
})

const dividerClassName = computed(() =>
  props.orientation === 'horizontal'
    ? 'h-px w-full bg-zinc-800'
    : 'h-6 w-px bg-zinc-800'
)
</script>
