<template>
  <div class="flex flex-col items-center gap-2 rounded border border-zinc-700 bg-zinc-800 p-2 shadow-lg shadow-black/30">
    <button
      v-for="color in colors"
      :key="color"
      class="h-4 w-4 rounded-full border border-zinc-700 transition hover:scale-110"
      :class="color === selectedColor ? 'ring-2 ring-zinc-100 ring-offset-1 ring-offset-zinc-800' : ''"
      :style="{ backgroundColor: color }"
      type="button"
      @click.stop="emit('select', color)"
    />
  </div>
</template>

<script setup>
defineProps({
  colors: {
    type: Array,
    required: true
  },
  selectedColor: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])
</script>
