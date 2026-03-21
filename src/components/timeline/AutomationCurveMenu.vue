<template>
  <div class="flex min-w-44 flex-col rounded border border-zinc-700 bg-zinc-800 p-1 shadow-lg shadow-black/30">
    <button
      v-for="option in options"
      :key="option.value"
      class="flex items-center justify-between gap-3 rounded px-3 py-1.5 text-left text-sm transition hover:bg-zinc-700"
      :class="{ 'bg-zinc-900': option.value === selectedCurve }"
      type="button"
      @click.stop="emit('select', option.value)"
    >
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  options: {
    type: Array,
    required: true
  },
  selectedCurve: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])
</script>
