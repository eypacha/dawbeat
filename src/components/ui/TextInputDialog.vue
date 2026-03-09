<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40">
      <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>

      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        {{ label }}
      </label>

      <input
        ref="inputElement"
        v-model="draftValue"
        class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
        type="text"
        @keydown.enter.prevent="emit('confirm', draftValue)"
        @keydown.esc.prevent="emit('cancel')"
      />

      <div class="mt-4 flex justify-end gap-2">
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
          type="button"
          @click="emit('confirm', draftValue)"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  initialValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Name'
  },
  title: {
    type: String,
    default: 'Edit'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const draftValue = ref(props.initialValue)
const inputElement = ref(null)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftValue.value = props.initialValue
    await nextTick()
    inputElement.value?.focus()
    inputElement.value?.select()
  },
  { immediate: true }
)

watch(
  () => props.initialValue,
  (value) => {
    if (!props.visible) {
      draftValue.value = value
    }
  }
)

function handleKeydown(event) {
  if (event.key !== 'Escape' || !props.visible) {
    return
  }

  emit('cancel')
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleKeydown)
      return
    }

    window.removeEventListener('keydown', handleKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
