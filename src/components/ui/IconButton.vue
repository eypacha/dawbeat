<template>
  <Button
    :aria-label="label"
    :class="[buttonSizeClassName, 'shrink-0 !p-0 tracking-normal']"
    :disabled="disabled"
    :variant="variant"
  >
    <component
      :is="icon"
      v-if="icon"
      :class="iconSizeClassName"
      :stroke-width="strokeWidth"
    />
    <slot />
    <span v-if="label" class="sr-only">{{ label }}</span>
  </Button>
</template>

<script setup>
import { computed } from 'vue'
import Button from '@/components/ui/Button.vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  icon: {
    type: [Object, Function],
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md'
  },
  strokeWidth: {
    type: Number,
    default: 2.25
  },
  variant: {
    type: String,
    default: 'ghost'
  }
})

const buttonSizeClassName = computed(() => {
  if (props.size === 'sm') {
    return 'h-7 w-7'
  }

  if (props.size === 'lg') {
    return 'h-10 w-10'
  }

  return 'h-8 w-8'
})

const iconSizeClassName = computed(() => {
  if (props.size === 'sm') {
    return 'h-3.5 w-3.5'
  }

  if (props.size === 'lg') {
    return 'h-5 w-5'
  }

  return 'h-4 w-4'
})
</script>
