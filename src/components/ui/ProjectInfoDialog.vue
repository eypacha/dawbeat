<template>
  <Modal :open="open" title="Project Info" @update:open="handleClose">
    <div class="space-y-4">
      <div>
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400 mb-2">
          Name
        </label>
        <input
          v-model="nameDraft"
          class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-600 focus:border-zinc-500"
          placeholder="Project name"
          type="text"
          spellcheck="false"
        />
      </div>

      <div>
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400 mb-2">
          Description
        </label>
        <textarea
          v-model="descriptionDraft"
          class="w-full h-24 border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition resize-none hover:border-zinc-600 focus:border-zinc-500"
          placeholder="Add a description for this project..."
          spellcheck="false"
        />
      </div>

      <div>
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400 mb-2">
          Author
        </label>
        <input
          v-model="authorDraft"
          class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-600 focus:border-zinc-500"
          placeholder="Your name"
          type="text"
          spellcheck="false"
        />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button
          class="border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
          type="button"
          @click="handleSave"
        >
          Save
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps({
  open: Boolean,
  name: String,
  description: String,
  author: String
})

const emit = defineEmits(['update:open', 'save'])

const nameDraft = ref(props.name || '')
const descriptionDraft = ref(props.description || '')
const authorDraft = ref(props.author || '')

watch(() => props.open, (newOpen) => {
  if (newOpen) {
    nameDraft.value = props.name || ''
    descriptionDraft.value = props.description || ''
    authorDraft.value = props.author || ''
  }
})

function handleSave() {
  emit('save', {
    name: nameDraft.value,
    description: descriptionDraft.value,
    author: authorDraft.value
  })
}
</script>
