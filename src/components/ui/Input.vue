<template>
  <input
    ref="inputElement"
    :value="modelValue"
    class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
    :type="type"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  }
})

const emit = defineEmits(['update:modelValue'])
const inputElement = ref(null)

defineExpose({
  focus: () => inputElement.value?.focus(),
  select: () => inputElement.value?.select()
})
</script>
