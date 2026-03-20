<template>
  <Modal :open="visible" :title="title" @close="emit('close')">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <p class="pr-4 text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
        <IconButton label="Close" size="sm" @click="emit('close')">
          x
        </IconButton>
      </div>
    </template>

    <template v-if="showName">
      <label class="block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Name
      </label>

      <Input
        v-model="draftName"
        class="mt-2"
        :placeholder="draftValue"
      />
    </template>

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
        @keydown.shift.enter.prevent="handleEvalShortcut"
        @keydown.meta.enter.prevent="handleEvalShortcut"
        @keydown.ctrl.enter.prevent="handleEvalShortcut"
      />
    </div>

    <template #footer>
      <div class="flex w-full items-end justify-between gap-4">
        <div
          v-if="missingAutoVariableTrackNames.length"
          class="flex min-w-0 flex-wrap items-end gap-3"
        >
          <label
            v-for="variableTrackName in missingAutoVariableTrackNames"
            :key="variableTrackName"
            class="flex min-w-[132px] flex-col gap-1"
          >
            <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Init {{ variableTrackName }}
            </span>

            <Input
              :model-value="getVariableInitializerDraft(variableTrackName)"
              placeholder="0"
              @update:model-value="setVariableInitializerDraft(variableTrackName, $event)"
            />
          </label>
        </div>

        <div class="ml-auto flex justify-end gap-2">
          <Button :disabled="!formulaValid" @click="emitDraft()">Eval</Button>
          <Button :disabled="!formulaValid" variant="primary" @click="emitSave()">Save</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Input from '@/components/ui/Input.vue'
import Modal from '@/components/ui/Modal.vue'
import { useDawStore } from '@/stores/dawStore'
import { extractAutoVariableTrackNames, getFormulaAllowedIdentifiers } from '@/services/variableTrackService'
import { renderFormulaTokensToHtmlWithOptions } from '@/utils/formulaTokenizer'
import { validateFormulaWithOptions } from '@/utils/formulaValidation'

const props = defineProps({
  initialValue: {
    type: String,
    default: ''
  },
  initialName: {
    type: String,
    default: ''
  },
  showName: {
    type: Boolean,
    default: true
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

const dawStore = useDawStore()
const { variableTracks } = storeToRefs(dawStore)
const draftName = ref(props.initialName)
const draftValue = ref(props.initialValue)
const formulaValid = ref(true)
const highlightLayerElement = ref(null)
const textareaElement = ref(null)
const variableInitializerDrafts = ref({})
const allowedIdentifiers = computed(() => getFormulaAllowedIdentifiers(variableTracks.value))
const existingVariableTrackNames = computed(
  () => new Set(variableTracks.value.map((variableTrack) => variableTrack.name).filter(Boolean))
)
const missingAutoVariableTrackNames = computed(() =>
  extractAutoVariableTrackNames(draftValue.value)
    .filter((variableTrackName) => !existingVariableTrackNames.value.has(variableTrackName))
)
const highlightedFormulaHtml = computed(() =>
  renderFormulaTokensToHtmlWithOptions(draftValue.value, {
    allowedIdentifiers: allowedIdentifiers.value
  })
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftName.value = props.initialName
    draftValue.value = props.initialValue
    variableInitializerDrafts.value = {}
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

watch(
  missingAutoVariableTrackNames,
  (variableTrackNames) => {
    variableInitializerDrafts.value = variableTrackNames.reduce((drafts, variableTrackName) => {
      drafts[variableTrackName] = variableInitializerDrafts.value[variableTrackName] ?? '0'
      return drafts
    }, {})
  },
  { immediate: true }
)

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
    name: draftName.value,
    variableInitializers: collectVariableInitializers()
  })
}

function emitSave() {
  if (!formulaValid.value) {
    return
  }

  emit('save', {
    code: draftValue.value,
    name: draftName.value,
    variableInitializers: collectVariableInitializers()
  })
}

function handleEvalShortcut() {
  if (!formulaValid.value) {
    return
  }

  emitDraft()
}

function collectVariableInitializers() {
  return missingAutoVariableTrackNames.value.reduce((initializers, variableTrackName) => {
    initializers[variableTrackName] = getVariableInitializerDraft(variableTrackName)
    return initializers
  }, {})
}

function getVariableInitializerDraft(variableTrackName) {
  return variableInitializerDrafts.value[variableTrackName] ?? '0'
}

function setVariableInitializerDraft(variableTrackName, value) {
  variableInitializerDrafts.value = {
    ...variableInitializerDrafts.value,
    [variableTrackName]: value
  }
}

function syncFormulaValidity() {
  formulaValid.value = validateFormulaWithOptions(draftValue.value, {
    allowedIdentifiers: allowedIdentifiers.value
  })
}

function syncHighlightScroll() {
  if (!textareaElement.value || !highlightLayerElement.value) {
    return
  }

  highlightLayerElement.value.scrollTop = textareaElement.value.scrollTop
  highlightLayerElement.value.scrollLeft = textareaElement.value.scrollLeft
}

</script>

<style scoped>
.formula-editor {
  position: relative;
  min-height: 8rem;
  border: 1px solid rgb(63 63 70);
  border-radius: 0.25rem;
  background: rgb(9 9 11);
  transition: border-color 150ms;
}

.formula-editor:focus-within {
  border-color: rgb(113 113 122);
}

.formula-editor__highlight,
.formula-editor__textarea {
  min-height: 8rem;
  width: 100%;
  border-radius: 0.25rem;
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
  overflow: auto;
  resize: none;
  background: transparent;
  border: 0;
  color: transparent;
  caret-color: rgb(244 244 245);
  outline: none;
  z-index: 1;
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

:deep(.token-identifier) {
  color: rgb(244 244 245);
}

:deep(.token-invalid) {
  color: #ef4444;
}
</style>
