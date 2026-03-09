<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40">
      <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>

      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Name
      </label>

      <input
        ref="nameInputElement"
        v-model="draftName"
        class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
        :placeholder="draftValue"
        type="text"
      />

      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        {{ label }}
      </label>

      <textarea
        ref="textareaElement"
        v-model="draftValue"
        class="mt-2 min-h-32 w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
        spellcheck="false"
        @keydown.esc.prevent="emit('close')"
        @keydown.meta.enter.prevent="emitDraft()"
        @keydown.ctrl.enter.prevent="emitDraft()"
      />

      <div class="mt-4 flex justify-end gap-2">
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
        <button
          class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
          type="button"
          @click="emitDraft()"
        >
          Eval
        </button>
        <button
          class="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
          type="button"
          @click="emitSave()"
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
  initialName: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Formula'
  },
  title: {
    type: String,
    default: 'Edit Formula'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'eval', 'save'])

const draftName = ref(props.initialName)
const draftValue = ref(props.initialValue)
const textareaElement = ref(null)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftName.value = props.initialName
    draftValue.value = props.initialValue
    await nextTick()
    textareaElement.value?.focus()
    textareaElement.value?.select()
  },
  { immediate: true }
)

watch(
  () => props.initialName,
  (value) => {
    if (!props.visible) {
      draftName.value = value
    }
  }
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

  emit('close')
}

function emitDraft() {
  emit('eval', {
    code: draftValue.value,
    name: draftName.value
  })
}

function emitSave() {
  emit('save', {
    code: draftValue.value,
    name: draftName.value
  })
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
