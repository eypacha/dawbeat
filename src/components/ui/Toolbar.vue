<template>
  <div :class="toolbarClassName">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  gap: {
    type: String,
    default: 'md'
  },
  justify: {
    type: String,
    default: 'between'
  },
  wrap: {
    type: Boolean,
    default: false
  }
})

const toolbarClassName = computed(() => {
  const gapClassName = props.gap === 'sm' ? 'gap-2' : props.gap === 'lg' ? 'gap-4' : 'gap-3'
  const justifyClassName =
    props.justify === 'start'
      ? 'justify-start'
      : props.justify === 'end'
        ? 'justify-end'
        : 'justify-between'

  return ['flex items-center', gapClassName, justifyClassName, props.wrap ? 'flex-wrap' : '']
})
</script>
