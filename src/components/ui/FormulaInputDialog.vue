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

    <template v-if="draftStereo">
      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Left
      </label>

      <div class="formula-editor mt-2">
        <div
          ref="leftHighlightLayerElement"
          aria-hidden="true"
          class="formula-editor__highlight"
        >
          <pre class="formula-editor__pre"><code v-html="highlightedLeftFormulaHtml || '\n'" /></pre>
        </div>

        <textarea
          ref="leftTextareaElement"
          v-model="draftLeftValue"
          class="formula-editor__textarea"
          spellcheck="false"
          @input="handleTextareaInput('left')"
          @scroll="syncHighlightScroll('left')"
          @keydown="handleNumberArrowKey('left', $event)"
          @keydown.esc.prevent="emit('close')"
          @keydown.shift.enter.prevent="handleEvalShortcut"
          @keydown.meta.enter.prevent="handleEvalShortcut"
          @keydown.ctrl.enter.prevent="handleEvalShortcut"
        />
      </div>

      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Right
      </label>

      <div class="formula-editor mt-2">
        <div
          ref="rightHighlightLayerElement"
          aria-hidden="true"
          class="formula-editor__highlight"
        >
          <pre class="formula-editor__pre"><code v-html="highlightedRightFormulaHtml || '\n'" /></pre>
        </div>

        <textarea
          ref="rightTextareaElement"
          v-model="draftRightValue"
          class="formula-editor__textarea"
          spellcheck="false"
          @input="handleTextareaInput('right')"
          @scroll="syncHighlightScroll('right')"
          @keydown="handleNumberArrowKey('right', $event)"
          @keydown.esc.prevent="emit('close')"
          @keydown.shift.enter.prevent="handleEvalShortcut"
          @keydown.meta.enter.prevent="handleEvalShortcut"
          @keydown.ctrl.enter.prevent="handleEvalShortcut"
        />
      </div>
    </template>

    <template v-else>
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
          @input="handleTextareaInput('mono')"
          @scroll="syncHighlightScroll('mono')"
          @keydown="handleNumberArrowKey('mono', $event)"
          @keydown.esc.prevent="emit('close')"
          @keydown.shift.enter.prevent="handleEvalShortcut"
          @keydown.meta.enter.prevent="handleEvalShortcut"
          @keydown.ctrl.enter.prevent="handleEvalShortcut"
        />
      </div>
    </template>

    <template v-if="allowStereo">
      <div class="mt-4 grid gap-2">
        <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Mode</span>

        <div class="grid grid-cols-2 gap-2">
          <button
            class="border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition"
            :class="!draftStereo
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
            type="button"
            @click="toggleStereo(false)"
          >
            Mono
          </button>

          <button
            class="border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition"
            :class="draftStereo
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
            type="button"
            @click="toggleStereo(true)"
          >
            Stereo
          </button>
        </div>
      </div>
    </template>

    <template v-if="showName">
      <label class="mt-4 block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Name
      </label>

      <Input
        v-model="draftName"
        class="mt-2"
        :placeholder="namePlaceholder"
      />
    </template>

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

            <div class="flex items-center gap-2">
              <Input
                :model-value="getVariableInitializerDraft(variableTrackName)"
                placeholder="0"
                @update:model-value="setVariableInitializerDraft(variableTrackName, $event)"
              />

              <Button
                v-if="canConvertInitializerToValueTracker(variableTrackName)"
                variant="ghost"
                size="xs"
                @click="sendInitializerToValueTracker(variableTrackName)"
              >
                To Value Tracker
              </Button>
            </div>
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
import { collectAutoVariableTrackNames, getFormulaAllowedIdentifiers } from '@/services/variableTrackService'
import { isNumericValueTrackerInitializer } from '@/services/valueTrackerService'
import { renderFormulaTokensToHtmlWithOptions } from '@/utils/formulaTokenizer'
import { validateFormulaWithOptions } from '@/utils/formulaValidation'

const props = defineProps({
  initialValue: {
    type: String,
    default: ''
  },
  initialLeftValue: {
    type: String,
    default: ''
  },
  initialRightValue: {
    type: String,
    default: ''
  },
  initialStereo: {
    type: Boolean,
    default: false
  },
  allowStereo: {
    type: Boolean,
    default: true
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
const { valueTrackerTracks, variableTracks } = storeToRefs(dawStore)
const draftName = ref(props.initialName)
const draftValue = ref(props.initialValue)
const draftLeftValue = ref(props.initialLeftValue)
const draftRightValue = ref(props.initialRightValue)
const draftStereo = ref(props.allowStereo ? props.initialStereo : false)
const formulaValid = ref(true)
const highlightLayerElement = ref(null)
const leftHighlightLayerElement = ref(null)
const rightHighlightLayerElement = ref(null)
const textareaElement = ref(null)
const leftTextareaElement = ref(null)
const rightTextareaElement = ref(null)
const variableInitializerDrafts = ref({})
const allowedIdentifiers = computed(() => getFormulaAllowedIdentifiers(variableTracks.value, valueTrackerTracks.value))
const draftExpressions = computed(() => draftStereo.value
  ? [draftLeftValue.value, draftRightValue.value]
  : [draftValue.value]
)
const existingVariableTrackNames = computed(
  () => new Set([
    ...variableTracks.value.map((variableTrack) => variableTrack.name).filter(Boolean),
    ...valueTrackerTracks.value
      .map((valueTrackerTrack) => valueTrackerTrack?.binding?.type === 'variable' ? valueTrackerTrack.binding.variableName : '')
      .filter(Boolean)
  ])
)
const missingAutoVariableTrackNames = computed(() =>
  collectAutoVariableTrackNames(draftExpressions.value)
    .filter((variableTrackName) => !existingVariableTrackNames.value.has(variableTrackName))
)
const highlightedFormulaHtml = computed(() =>
  renderFormulaTokensToHtmlWithOptions(draftValue.value, {
    allowedIdentifiers: allowedIdentifiers.value
  })
)
const highlightedLeftFormulaHtml = computed(() =>
  renderFormulaTokensToHtmlWithOptions(draftLeftValue.value, {
    allowedIdentifiers: allowedIdentifiers.value
  })
)
const highlightedRightFormulaHtml = computed(() =>
  renderFormulaTokensToHtmlWithOptions(draftRightValue.value, {
    allowedIdentifiers: allowedIdentifiers.value
  })
)
const namePlaceholder = computed(() =>
  draftStereo.value ? draftLeftValue.value : draftValue.value
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftName.value = props.initialName
    draftValue.value = props.initialValue
    draftLeftValue.value = props.initialLeftValue
    draftRightValue.value = props.initialRightValue
    draftStereo.value = props.allowStereo ? props.initialStereo : false
    variableInitializerDrafts.value = {}
    syncFormulaValidity()
    await nextTick()
    syncAllHighlightScroll()
    focusActiveTextarea(true)
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
  () => props.initialLeftValue,
  (value) => {
    if (!props.visible) {
      draftLeftValue.value = value
      syncFormulaValidity()
    }
  }
)

watch(
  () => props.initialRightValue,
  (value) => {
    if (!props.visible) {
      draftRightValue.value = value
      syncFormulaValidity()
    }
  }
)

watch(
  () => props.initialStereo,
  (value) => {
    if (!props.visible) {
      draftStereo.value = props.allowStereo ? value : false
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

function handleTextareaInput(kind) {
  syncFormulaValidity()
  syncHighlightScroll(kind)
}

function handleNumberArrowKey(kind, event) {
  if (!event || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
    return
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

  const textarea = getTextareaElement(kind)

  if (!textarea) {
    return
  }

  const selectionStart = Number(textarea.selectionStart)
  const selectionEnd = Number(textarea.selectionEnd)

  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart !== selectionEnd) {
    return
  }

  const currentValue = getDraftValueByKind(kind)
  const numberRange = findNumberRangeAtCaret(currentValue, selectionStart)

  if (!numberRange) {
    return
  }

  const steppedNumberText = stepNumberText(
    numberRange.value,
    event.shiftKey
      ? (event.key === 'ArrowUp' ? 'double' : 'half')
      : (event.key === 'ArrowUp' ? 'increment' : 'decrement')
  )

  if (steppedNumberText === null) {
    return
  }

  const nextValue = `${currentValue.slice(0, numberRange.start)}${steppedNumberText}${currentValue.slice(numberRange.end)}`
  const caretOffsetInsideNumber = selectionStart - numberRange.start
  const nextCaret = numberRange.start + Math.min(Math.max(0, caretOffsetInsideNumber), steppedNumberText.length)

  setDraftValueByKind(kind, nextValue)
  syncFormulaValidity()

  void nextTick(() => {
    const nextTextarea = getTextareaElement(kind)

    if (!nextTextarea) {
      return
    }

    nextTextarea.setSelectionRange(nextCaret, nextCaret)
    syncHighlightScroll(kind)
  })

  event.preventDefault()
}

function emitDraft() {
  if (!formulaValid.value) {
    return
  }

  emit('eval', {
    code: draftStereo.value ? draftLeftValue.value : draftValue.value,
    leftCode: draftLeftValue.value,
    name: draftName.value,
    rightCode: draftRightValue.value,
    stereo: draftStereo.value,
    variableInitializers: collectVariableInitializers()
  })
}

function emitSave() {
  if (!formulaValid.value) {
    return
  }

  emit('save', {
    code: draftStereo.value ? draftLeftValue.value : draftValue.value,
    leftCode: draftLeftValue.value,
    name: draftName.value,
    rightCode: draftRightValue.value,
    stereo: draftStereo.value,
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

function canConvertInitializerToValueTracker(variableTrackName) {
  return isNumericValueTrackerInitializer(getVariableInitializerDraft(variableTrackName))
}

function sendInitializerToValueTracker(variableTrackName) {
  if (!canConvertInitializerToValueTracker(variableTrackName)) {
    return
  }

  dawStore.recordHistoryStep('create-value-tracker-from-formula-init', () => {
    dawStore.ensureInitializedValueTrackerTracks({
      [variableTrackName]: getVariableInitializerDraft(variableTrackName)
    })
  })
}

function syncFormulaValidity() {
  formulaValid.value = draftExpressions.value.length > 0 && draftExpressions.value.every((expression) =>
    validateFormulaWithOptions(expression, {
      allowedIdentifiers: allowedIdentifiers.value
    })
  )
}

function syncHighlightScroll(kind = 'mono') {
  const textarea = getTextareaElement(kind)
  const highlightLayer = getHighlightLayerElement(kind)

  if (!textarea || !highlightLayer) {
    return
  }

  highlightLayer.scrollTop = textarea.scrollTop
  highlightLayer.scrollLeft = textarea.scrollLeft
}

function syncAllHighlightScroll() {
  syncHighlightScroll('mono')
  syncHighlightScroll('left')
  syncHighlightScroll('right')
}

function getTextareaElement(kind) {
  if (kind === 'left') {
    return leftTextareaElement.value
  }

  if (kind === 'right') {
    return rightTextareaElement.value
  }

  return textareaElement.value
}

function getHighlightLayerElement(kind) {
  if (kind === 'left') {
    return leftHighlightLayerElement.value
  }

  if (kind === 'right') {
    return rightHighlightLayerElement.value
  }

  return highlightLayerElement.value
}

function toggleStereo(nextStereo) {
  if (!props.allowStereo || draftStereo.value === nextStereo) {
    return
  }

  if (nextStereo) {
    draftLeftValue.value = draftValue.value
    draftRightValue.value = draftValue.value
  } else {
    draftValue.value = draftLeftValue.value
  }

  draftStereo.value = nextStereo
  syncFormulaValidity()

  void nextTick(() => {
    syncAllHighlightScroll()
    focusActiveTextarea(true)
  })
}

function focusActiveTextarea(select = false) {
  const textarea = draftStereo.value ? leftTextareaElement.value : textareaElement.value

  if (!textarea) {
    return
  }

  textarea.focus()

  if (select) {
    textarea.select()
  }
}

function getDraftValueByKind(kind) {
  if (kind === 'left') {
    return draftLeftValue.value
  }

  if (kind === 'right') {
    return draftRightValue.value
  }

  return draftValue.value
}

function setDraftValueByKind(kind, value) {
  if (kind === 'left') {
    draftLeftValue.value = value
    return
  }

  if (kind === 'right') {
    draftRightValue.value = value
    return
  }

  draftValue.value = value
}

function findNumberRangeAtCaret(expression, caretPosition) {
  if (typeof expression !== 'string' || !expression.length) {
    return null
  }

  const normalizedCaretPosition = Number(caretPosition)

  if (!Number.isInteger(normalizedCaretPosition) || normalizedCaretPosition < 0) {
    return null
  }

  const numberPattern = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi

  for (const match of expression.matchAll(numberPattern)) {
    const matchText = match[0]
    const start = match.index ?? -1
    const end = start + matchText.length

    if (start < 0) {
      continue
    }

    if (!(normalizedCaretPosition >= start && normalizedCaretPosition <= end)) {
      continue
    }

    const previousChar = start > 0 ? expression[start - 1] : ''
    const nextChar = end < expression.length ? expression[end] : ''

    if (isIdentifierChar(previousChar) || isIdentifierChar(nextChar)) {
      continue
    }

    return {
      end,
      start,
      value: matchText
    }
  }

  return null
}

function stepNumberText(numberText, operation) {
  const currentNumber = Number(numberText)

  if (!Number.isFinite(currentNumber)) {
    return null
  }

  let nextNumber = currentNumber

  if (operation === 'double' || operation === 'half') {
    const baseInteger = Math.trunc(currentNumber)

    if (operation === 'double') {
      nextNumber = baseInteger * 2
    } else {
      nextNumber = Math.trunc(baseInteger / 2)
    }
  } else if (operation === 'increment') {
    nextNumber = currentNumber + 1
  } else if (operation === 'decrement') {
    nextNumber = currentNumber - 1
  }

  if (!Number.isFinite(nextNumber)) {
    return null
  }

  if (/[eE]/.test(numberText)) {
    return String(nextNumber)
  }

  if (operation === 'increment' || operation === 'decrement') {
    if (numberText.includes('.')) {
      const decimalDigits = (numberText.split('.')[1] ?? '').length
      return nextNumber.toFixed(decimalDigits)
    }

    return String(Math.round(nextNumber))
  }

  return String(Math.trunc(nextNumber))
}

function isIdentifierChar(value) {
  return typeof value === 'string' && /[A-Za-z0-9_$]/.test(value)
}

function trimTrailingZeros(value) {
  return value
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '')
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
