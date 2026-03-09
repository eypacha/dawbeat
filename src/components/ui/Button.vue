<template>
  <button
    :class="[baseClassName, sizeClassName, variantClassName, block ? 'w-full' : '']"
    :disabled="disabled"
    :type="type"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md'
  },
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'default'
  }
})

const baseClassName =
  'inline-flex items-center justify-center border font-medium uppercase transition-colors disabled:cursor-default disabled:opacity-40'

const sizeClassName = computed(() => {
  if (props.size === 'xs') {
    return 'px-2.5 py-1 text-[10px] tracking-[0.24em]'
  }

  if (props.size === 'lg') {
    return 'px-6 py-3 text-sm tracking-[0.35em]'
  }

  if (props.size === 'sm') {
    return 'px-3 py-1.5 text-sm tracking-[0.18em]'
  }

  return 'px-3 py-2 text-xs tracking-[0.24em]'
})

const variantClassName = computed(() => {
  if (props.variant === 'primary') {
    return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/70 hover:bg-emerald-500/20'
  }

  if (props.variant === 'danger') {
    return 'border-red-500/50 bg-red-500/10 text-red-200 hover:border-red-400/70 hover:bg-red-500/20'
  }

  if (props.variant === 'ghost') {
    return 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
  }

  return 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700'
})
</script>
