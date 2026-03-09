<template>
  <component :is="as" :class="panelClassName">
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  as: {
    type: String,
    default: 'section'
  },
  padding: {
    type: String,
    default: 'md'
  }
})

const panelClassName = computed(() => {
  let paddingClassName = 'p-4'

  if (props.padding === 'lg') {
    paddingClassName = 'p-8'
  } else if (props.padding === 'sm') {
    paddingClassName = 'p-3'
  } else if (props.padding === 'none') {
    paddingClassName = ''
  }

  return ['border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/20', paddingClassName]
})
</script>
