<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg shadow-black/40">
      <button
        aria-label="Close"
        class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
        type="button"
        @click="emit('close')"
      >
        x
      </button>

      <p class="pr-10 text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>

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

      <div class="formula-editor mt-2">
        <div
          ref="highlightLayerElement"
          aria-hidden="true"
          class="formula-editor__highlight"
        >
          <pre class="formula-editor__pre"><code v-html="highlightedFormulaHtml || '\n'" /></pre>
        </div>

        <textarea
          ref="textareaElement"
          v-model="draftValue"
          class="formula-editor__textarea"
          spellcheck="false"
          @input="handleTextareaInput"
          @scroll="syncHighlightScroll"
          @keydown.esc.prevent="emit('close')"
          @keydown.meta.enter.prevent="handleEvalShortcut"
          @keydown.ctrl.enter.prevent="handleEvalShortcut"
        />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          class="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-40"
          :disabled="!formulaValid"
          type="button"
          @click="emitDraft()"
        >
          Eval
        </button>
        <button
          class="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:opacity-40"
          :disabled="!formulaValid"
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderFormulaTokensToHtml } from '@/utils/formulaTokenizer'
import { validateFormula } from '@/utils/formulaValidation'

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
const formulaValid = ref(true)
const highlightLayerElement = ref(null)
const textareaElement = ref(null)
const highlightedFormulaHtml = computed(() => renderFormulaTokensToHtml(draftValue.value))

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftName.value = props.initialName
    draftValue.value = props.initialValue
    syncFormulaValidity()
    await nextTick()
    syncHighlightScroll()
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
      syncFormulaValidity()
    }
  }
)

function handleKeydown(event) {
  if (event.key !== 'Escape' || !props.visible) {
    return
  }

  emit('close')
}

function handleTextareaInput() {
  syncFormulaValidity()
  syncHighlightScroll()
}

function emitDraft() {
  if (!formulaValid.value) {
    return
  }

  emit('eval', {
    code: draftValue.value,
    name: draftName.value
  })
}

function emitSave() {
  if (!formulaValid.value) {
    return
  }

  emit('save', {
    code: draftValue.value,
    name: draftName.value
  })
}

function handleEvalShortcut() {
  if (!formulaValid.value) {
    return
  }

  emitDraft()
}

function syncFormulaValidity() {
  formulaValid.value = validateFormula(draftValue.value)
}

function syncHighlightScroll() {
  if (!textareaElement.value || !highlightLayerElement.value) {
    return
  }

  highlightLayerElement.value.scrollTop = textareaElement.value.scrollTop
  highlightLayerElement.value.scrollLeft = textareaElement.value.scrollLeft
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

<style scoped>
.formula-editor {
  position: relative;
  min-height: 8rem;
}

.formula-editor__highlight,
.formula-editor__textarea {
  min-height: 8rem;
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid rgb(63 63 70);
  background: rgb(9 9 11);
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.25rem;
  padding: 0.5rem 0.75rem;
}

.formula-editor__highlight {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.formula-editor__pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.formula-editor__textarea {
  position: relative;
  resize: vertical;
  background: transparent;
  color: transparent;
  caret-color: rgb(244 244 245);
  outline: none;
  transition: border-color 150ms;
  z-index: 1;
}

.formula-editor__textarea:focus {
  border-color: rgb(113 113 122);
}

.formula-editor__textarea::selection {
  background: rgba(113, 113, 122, 0.35);
}

:deep(.token-var) {
  color: #67e8f9;
}

:deep(.token-number) {
  color: #fde047;
}

:deep(.token-operator) {
  color: #c084fc;
}

:deep(.token-paren) {
  color: #60a5fa;
}

:deep(.token-function) {
  color: #38bdf8;
}

:deep(.token-invalid) {
  color: #ef4444;
}
</style>
