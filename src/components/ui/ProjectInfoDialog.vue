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

      <div>
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400 mb-2">
          License
        </label>
        <select
          v-model="licenseDraft"
          class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-600 focus:border-zinc-500"
        >
          <option value="CC0">CC0 (public domain) — No rights reserved</option>
          <option value="CC-BY">CC-BY — Attribution required</option>
          <option value="CC-BY-SA">CC-BY-SA — Attribution + ShareAlike</option>
          <option value="MIT">MIT (for formulas)</option>
          <option value="">No license / All rights reserved</option>
        </select>
        <div class="mt-2 text-xs text-zinc-400 min-h-[1.5em]">
          <span v-if="licenseDraft === 'CC0'">Anyone can use, modify, and distribute without restriction or attribution.</span>
          <span v-else-if="licenseDraft === 'CC-BY'">Anyone can use, modify, and distribute, but must give appropriate credit.</span>
          <span v-else-if="licenseDraft === 'CC-BY-SA'">Anyone can use, modify, and distribute, must give credit and share under the same license.</span>
          <span v-else-if="licenseDraft === 'MIT'">Permissive license for code/formulas. Attribution required.</span>
          <span v-else>No explicit license. All rights reserved by default.</span>
        </div>
      </div>

      <div v-if="shared">
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400 mb-2 mt-4">
          Share Link
        </label>
        <input
          class="w-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none select-all"
          :value="shareUrl"
          readonly
        />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button
          v-if="!shared"
          class="border border-blue-700 bg-blue-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-blue-100 transition hover:border-blue-500 hover:bg-blue-700"
          type="button"
          @click="handleShare"
        >
          Share
        </button>
        <button
          class="border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="handleClose"
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
  author: String,
  license: String,
  shared: Boolean,
  shareUrl: String
})


const emit = defineEmits(['update:open', 'save', 'share'])
function handleShare() {
  emit('share')
}

const nameDraft = ref(props.name || '')
const descriptionDraft = ref(props.description || '')
const authorDraft = ref(props.author || '')
const licenseDraft = ref(props.license && props.license !== '' ? props.license : 'CC0')

watch(() => props.open, (newOpen) => {
  if (newOpen) {
    nameDraft.value = props.name || ''
    descriptionDraft.value = props.description || ''
    authorDraft.value = props.author || ''
    licenseDraft.value = props.license && props.license !== '' ? props.license : 'CC0'
  }
})

function handleSave() {
  emit('save', {
    name: nameDraft.value,
    description: descriptionDraft.value,
    author: authorDraft.value,
    license: licenseDraft.value
  })
}

function handleClose() {
  emit('update:open', false)
}
</script>
