<template>
  <Modal :open="visible" size="sm" :title="title" @close="emit('close')">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
          <p class="mt-2 text-xs text-zinc-500">
            {{ stepCount }} steps · {{ eventCount }} sets · {{ stepSubdivision }} step/tick
          </p>
        </div>

        <div class="flex items-start gap-3">
          <IconButton label="Close" size="sm" @click="emit('close')">
            x
          </IconButton>
        </div>
      </div>
    </template>

    <div class="value-tracker-editor">
      <div class="value-tracker-editor__header">
        <span>Step</span>
        <span>State</span>
        <span>Hex</span>
        <span>Dec</span>
      </div>

      <div
        ref="viewportElement"
        class="value-tracker-editor__viewport"
        tabindex="0"
        @keydown="handleViewportKeydown"
      >
        <button
          v-for="row in rows"
          :key="row.stepIndex"
          class="value-tracker-editor__row"
          :class="row.className"
          :data-step-index="row.stepIndex"
          tabindex="-1"
          type="button"
          @click="handleRowClick(row.stepIndex, $event)"
        >
          <span class="value-tracker-editor__step">{{ row.stepLabel }}</span>
          <span class="value-tracker-editor__state">{{ row.stateLabel }}</span>
          <span
            class="value-tracker-editor__hex"
            :class="row.hexCellClassName"
            @click.stop="handleCellClick(row.stepIndex, VALUE_TRACKER_INPUT_CELL_HEX)"
          >
            {{ row.hexLabel }}
          </span>
          <span
            class="value-tracker-editor__dec"
            :class="row.decCellClassName"
            @click.stop="handleCellClick(row.stepIndex, VALUE_TRACKER_INPUT_CELL_DEC)"
          >
            {{ row.decLabel }}
          </span>
        </button>
      </div>
    </div>

    <div class="mt-4 text-xs text-zinc-500">
      {{ selectionStatus }}
    </div>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  VALUE_TRACKER_MAX,
  getValueTrackerEventCount,
  getValueTrackerResolvedValues,
  getValueTrackerStepCount,
  normalizeValueTrackerEventValue,
  normalizeValueTrackerValues
} from '@/services/valueTrackerService'
import { clamp } from '@/utils/timeUtils'

const props = defineProps({
  duration: {
    type: Number,
    required: true
  },
  initialHeldValue: {
    default: null
  },
  initialValues: {
    type: Array,
    default: () => []
  },
  playheadStepIndex: {
    type: Number,
    default: null
  },
  stepSubdivision: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: 'Hex editor'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'update'])

const ROWS_PER_JUMP = 8
const VALUE_TRACKER_INPUT_CELL_HEX = 'hex'
const VALUE_TRACKER_INPUT_CELL_DEC = 'dec'
const VALUE_TRACKER_HEX_DIGIT_COUNT = VALUE_TRACKER_MAX.toString(16).length
const VALUE_TRACKER_DEC_DIGIT_COUNT = String(VALUE_TRACKER_MAX).length

const draftValues = ref([])
const pendingDecimalBuffer = ref('')
const pendingDecimalStepIndex = ref(null)
const pendingHexBuffer = ref('')
const pendingHexStepIndex = ref(null)
const selectedInputCell = ref(VALUE_TRACKER_INPUT_CELL_HEX)
const selectedStepIndex = ref(0)
const viewportElement = ref(null)

const stepCount = computed(() => getValueTrackerStepCount(props.duration, props.stepSubdivision))
const eventCount = computed(() => getValueTrackerEventCount(draftValues.value))
const resolvedValues = computed(() =>
  getValueTrackerResolvedValues(draftValues.value, props.initialHeldValue)
)

const rows = computed(() =>
  Array.from({ length: stepCount.value }, (_entry, stepIndex) => {
    const explicitValue = normalizeValueTrackerEventValue(draftValues.value[stepIndex])
    const resolvedValue = normalizeValueTrackerEventValue(resolvedValues.value[stepIndex])
    const previewValue = getPendingPreviewValue(stepIndex)
    const pendingHexLabel =
      pendingHexStepIndex.value === stepIndex && pendingHexBuffer.value
        ? formatPendingHex(pendingHexBuffer.value)
        : null
    const pendingDecimalLabel =
      pendingDecimalStepIndex.value === stepIndex && pendingDecimalBuffer.value
        ? formatPendingDecimal(pendingDecimalBuffer.value)
        : null
    const displayValue = previewValue ?? explicitValue ?? resolvedValue
    const rowSelected = selectedStepIndex.value === stepIndex

    return {
      stepIndex,
      stepLabel: String(stepIndex).padStart(3, '0'),
      stateLabel: explicitValue !== null ? 'SET' : resolvedValue !== null ? 'HOLD' : 'EMPTY',
      hexCellClassName: {
        'value-tracker-editor__cell--selected':
          rowSelected && selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_HEX
      },
      hexLabel: pendingHexLabel ?? formatHex(displayValue),
      decCellClassName: {
        'value-tracker-editor__cell--selected':
          rowSelected && selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_DEC
      },
      decLabel: pendingDecimalLabel ?? formatDecimal(displayValue),
      className: {
        'value-tracker-editor__row--playhead': props.playheadStepIndex === stepIndex,
        'value-tracker-editor__row--selected': rowSelected,
        'value-tracker-editor__row--set': explicitValue !== null,
        'value-tracker-editor__row--held': explicitValue === null && resolvedValue !== null
      }
    }
  })
)

const selectionStatus = computed(() => {
  const currentStepIndex = clamp(selectedStepIndex.value, 0, Math.max(0, stepCount.value - 1))
  const explicitValue = normalizeValueTrackerEventValue(draftValues.value[currentStepIndex])
  const resolvedValue = normalizeValueTrackerEventValue(resolvedValues.value[currentStepIndex])
  const selectedCellLabel = selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_DEC ? 'Dec' : 'Hex'

  if (pendingDecimalStepIndex.value === currentStepIndex && pendingDecimalBuffer.value) {
    return `Step ${currentStepIndex + 1} · ${selectedCellLabel} selected · typing ${formatPendingDecimal(pendingDecimalBuffer.value)}`
  }

  if (pendingHexStepIndex.value === currentStepIndex && pendingHexBuffer.value) {
    return `Step ${currentStepIndex + 1} · ${selectedCellLabel} selected · typing ${formatPendingHex(pendingHexBuffer.value)}`
  }

  if (explicitValue !== null) {
    return `Step ${currentStepIndex + 1} · ${selectedCellLabel} selected · Set ${explicitValue} · 0x${formatHex(explicitValue)}`
  }

  if (resolvedValue !== null) {
    return `Step ${currentStepIndex + 1} · ${selectedCellLabel} selected · Hold ${resolvedValue} · 0x${formatHex(resolvedValue)}`
  }

  return `Step ${currentStepIndex + 1} · ${selectedCellLabel} selected · Empty`
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      clearPendingDecimal()
      clearPendingHex()
      return
    }

    draftValues.value = normalizeValueTrackerValues(
      props.initialValues,
      props.duration,
      props.stepSubdivision
    )
    selectedStepIndex.value = getAnchorStepIndex(draftValues.value)
    selectedInputCell.value = VALUE_TRACKER_INPUT_CELL_HEX
    clearPendingDecimal()
    clearPendingHex()
    await nextTick()
    viewportElement.value?.focus()
    scrollSelectedStepIntoView()
  },
  { immediate: true }
)

watch(
  () => props.initialValues,
  (nextValues) => {
    if (!props.visible) {
      draftValues.value = normalizeValueTrackerValues(nextValues, props.duration, props.stepSubdivision)
    }
  }
)

watch(
  () => props.playheadStepIndex,
  () => {}
)

function handleRowClick(stepIndex, event) {
  if (event.shiftKey) {
    clearEventAtStep(stepIndex)
  }

  selectStep(stepIndex)
}

function handleCellClick(stepIndex, cell) {
  selectStep(stepIndex, cell)
}

function handleViewportKeydown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

  const stepIndex = clamp(selectedStepIndex.value, 0, Math.max(0, stepCount.value - 1))
  const hexDigit = getHexDigit(event.key)
  const decimalDigit = getDecimalDigit(event.key)

  if (event.key === 'Tab') {
    event.preventDefault()
    commitPendingInput()
    selectedInputCell.value =
      selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_HEX
        ? VALUE_TRACKER_INPUT_CELL_DEC
        : VALUE_TRACKER_INPUT_CELL_HEX
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    commitPendingInput()
    return
  }

  if (selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_HEX && hexDigit) {
    event.preventDefault()
    applyHexDigit(stepIndex, hexDigit)
    return
  }

  if (selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_DEC && decimalDigit) {
    event.preventDefault()
    applyDecimalDigit(stepIndex, decimalDigit)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectStep(stepIndex - 1)
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectStep(stepIndex + 1)
    return
  }

  if (event.key === 'PageUp') {
    event.preventDefault()
    selectStep(stepIndex - ROWS_PER_JUMP)
    return
  }

  if (event.key === 'PageDown') {
    event.preventDefault()
    selectStep(stepIndex + ROWS_PER_JUMP)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    selectStep(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    selectStep(stepCount.value - 1)
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()

    if (selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_HEX && pendingHexStepIndex.value === stepIndex && pendingHexBuffer.value) {
      pendingHexBuffer.value = pendingHexBuffer.value.slice(0, -1)

      if (!pendingHexBuffer.value) {
        pendingHexStepIndex.value = null
      }

      return
    }

    if (selectedInputCell.value === VALUE_TRACKER_INPUT_CELL_DEC && pendingDecimalStepIndex.value === stepIndex && pendingDecimalBuffer.value) {
      pendingDecimalBuffer.value = pendingDecimalBuffer.value.slice(0, -1)

      if (!pendingDecimalBuffer.value) {
        pendingDecimalStepIndex.value = null
      }

      return
    }

    clearEventAtStep(stepIndex)
    return
  }

  if (event.key === 'Delete') {
    event.preventDefault()
    clearEventAtStep(stepIndex)
    return
  }

  if (event.key === 'Escape') {
    clearPendingDecimal()
    clearPendingHex()
  }
}

function applyHexDigit(stepIndex, digit) {
  if (pendingDecimalStepIndex.value !== null) {
    clearPendingDecimal()
  }

  if (pendingHexStepIndex.value !== stepIndex) {
    pendingHexBuffer.value = ''
  }

  pendingHexStepIndex.value = stepIndex
  pendingHexBuffer.value = `${pendingHexBuffer.value}${digit}`.slice(0, VALUE_TRACKER_HEX_DIGIT_COUNT)

  if (pendingHexBuffer.value.length < VALUE_TRACKER_HEX_DIGIT_COUNT) {
    return
  }

  commitPendingHex({ moveToNextStep: true })
}

function applyDecimalDigit(stepIndex, digit) {
  if (pendingHexStepIndex.value !== null) {
    clearPendingHex()
  }

  if (pendingDecimalStepIndex.value !== stepIndex) {
    pendingDecimalBuffer.value = ''
  }

  pendingDecimalStepIndex.value = stepIndex
  pendingDecimalBuffer.value = `${pendingDecimalBuffer.value}${digit}`.slice(0, VALUE_TRACKER_DEC_DIGIT_COUNT)
}

function selectStep(stepIndex, cell = selectedInputCell.value, options = {}) {
  if (options.commitPending !== false) {
    commitPendingInput()
  }

  selectedStepIndex.value = clamp(stepIndex, 0, Math.max(0, stepCount.value - 1))
  selectedInputCell.value = cell === VALUE_TRACKER_INPUT_CELL_DEC ? VALUE_TRACKER_INPUT_CELL_DEC : VALUE_TRACKER_INPUT_CELL_HEX

  nextTick(() => {
    viewportElement.value?.focus()
    scrollSelectedStepIntoView()
  })
}

function setEventAtStep(stepIndex, value) {
  const nextValues = [...draftValues.value]
  nextValues[stepIndex] = normalizeValueTrackerEventValue(value)
  draftValues.value = nextValues
  emitUpdate()
}

function clearEventAtStep(stepIndex) {
  if (draftValues.value[stepIndex] === null) {
    clearPendingHex()
    return
  }

  const nextValues = [...draftValues.value]
  nextValues[stepIndex] = null
  draftValues.value = nextValues
  clearPendingHex()
  emitUpdate()
}

function clearPendingHex() {
  pendingHexBuffer.value = ''
  pendingHexStepIndex.value = null
}

function clearPendingDecimal() {
  pendingDecimalBuffer.value = ''
  pendingDecimalStepIndex.value = null
}

function commitPendingInput() {
  return commitPendingHex() || commitPendingDecimal()
}

function commitPendingHex(options = {}) {
  if (pendingHexStepIndex.value === null || !pendingHexBuffer.value) {
    clearPendingHex()
    return false
  }

  const stepIndex = pendingHexStepIndex.value
  setEventAtStep(stepIndex, parseInt(pendingHexBuffer.value, 16))
  clearPendingHex()

  if (options.moveToNextStep && stepIndex < stepCount.value - 1) {
    selectStep(stepIndex + 1, VALUE_TRACKER_INPUT_CELL_HEX, {
      commitPending: false
    })
  }

  return true
}

function commitPendingDecimal() {
  if (pendingDecimalStepIndex.value === null || !pendingDecimalBuffer.value) {
    clearPendingDecimal()
    return false
  }

  setEventAtStep(pendingDecimalStepIndex.value, Number.parseInt(pendingDecimalBuffer.value, 10))
  clearPendingDecimal()
  return true
}

function scrollSelectedStepIntoView() {
  scrollStepIntoView(selectedStepIndex.value)
}

function getAnchorStepIndex(values) {
  const firstExplicitStepIndex = Array.isArray(values)
    ? values.findIndex((value) => normalizeValueTrackerEventValue(value) !== null)
    : -1

  return firstExplicitStepIndex >= 0 ? firstExplicitStepIndex : 0
}

function formatHex(value) {
  const normalizedValue = normalizeValueTrackerEventValue(value)
  return normalizedValue === null
    ? formatGroupedHex('-'.repeat(VALUE_TRACKER_HEX_DIGIT_COUNT))
    : formatGroupedHex(normalizedValue.toString(16).toUpperCase().padStart(VALUE_TRACKER_HEX_DIGIT_COUNT, '0'))
}

function formatDecimal(value) {
  const normalizedValue = normalizeValueTrackerEventValue(value)
  return normalizedValue === null
    ? '-'.repeat(VALUE_TRACKER_DEC_DIGIT_COUNT)
    : String(normalizedValue).padStart(VALUE_TRACKER_DEC_DIGIT_COUNT, '0')
}

function formatPendingHex(value) {
  return formatGroupedHex(value.padEnd(VALUE_TRACKER_HEX_DIGIT_COUNT, '_'))
}

function formatPendingDecimal(value) {
  return value.padEnd(VALUE_TRACKER_DEC_DIGIT_COUNT, '_')
}

function formatGroupedHex(value) {
  const digits = typeof value === 'string' ? value.toUpperCase() : ''
  const groups = []

  for (let index = 0; index < VALUE_TRACKER_HEX_DIGIT_COUNT; index += 2) {
    groups.push(digits.slice(index, index + 2).padEnd(2, '-'))
  }

  return groups.join(' ')
}

function getHexDigit(key) {
  const normalizedKey = typeof key === 'string' ? key.toUpperCase() : ''
  return /^[0-9A-F]$/.test(normalizedKey) ? normalizedKey : ''
}

function getDecimalDigit(key) {
  return /^[0-9]$/.test(key) ? key : ''
}

function getPendingPreviewValue(stepIndex) {
  if (pendingHexStepIndex.value === stepIndex && pendingHexBuffer.value) {
    return normalizeValueTrackerEventValue(Number.parseInt(pendingHexBuffer.value, 16))
  }

  if (pendingDecimalStepIndex.value === stepIndex && pendingDecimalBuffer.value) {
    return normalizeValueTrackerEventValue(Number.parseInt(pendingDecimalBuffer.value, 10))
  }

  return null
}

function emitUpdate() {
  emit('update', {
    values: draftValues.value
  })
}

function scrollStepIntoView(stepIndex) {
  const viewport = viewportElement.value

  if (!(viewport instanceof HTMLElement)) {
    return
  }

  const rowElement = viewport.querySelector(
    `[data-step-index="${stepIndex}"]`
  )

  if (!(rowElement instanceof HTMLElement)) {
    return
  }

  rowElement.scrollIntoView({
    block: 'nearest'
  })
}
</script>

<style scoped>
.value-tracker-editor {
  border: 1px solid rgb(39 39 42);
  background:
    linear-gradient(180deg, rgba(24, 24, 27, 0.96), rgba(9, 9, 11, 0.98));
}

.value-tracker-editor__header,
.value-tracker-editor__row {
  display: grid;
  grid-template-columns: 5rem 5rem 6rem 6rem;
  gap: 1px;
  align-items: center;
  font-size: 0.75rem;
}

.value-tracker-editor__header {
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid rgb(39 39 42);
  background: rgb(24 24 27);
  color: rgb(113 113 122);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.value-tracker-editor__header span,
.value-tracker-editor__row span {
  padding: 0.45rem 0.75rem;
}

.value-tracker-editor__viewport {
  max-height: 32rem;
  overflow: auto;
  outline: none;
}

.value-tracker-editor__row {
  width: 100%;
  border-bottom: 1px solid rgba(39, 39, 42, 0.7);
  background: rgba(10, 10, 12, 0.94);
  color: rgb(212 212 216);
  text-align: left;
  transition: background-color 140ms ease, opacity 140ms ease;
}

.value-tracker-editor__row:nth-child(even) {
  background: rgba(14, 14, 18, 0.94);
}

.value-tracker-editor__row--held {
  opacity: 0.48;
}

.value-tracker-editor__row--set {
  opacity: 1;
}

.value-tracker-editor__row--selected {
  background: rgba(251, 191, 36, 0.12);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.28);
  opacity: 1;
}

.value-tracker-editor__row--playhead {
  background: rgba(14, 165, 233, 0.12);
  box-shadow: inset 3px 0 0 rgba(56, 189, 248, 0.95);
  opacity: 1;
}

.value-tracker-editor__row--playhead.value-tracker-editor__row--selected {
  background:
    linear-gradient(90deg, rgba(56, 189, 248, 0.16), rgba(251, 191, 36, 0.12));
  box-shadow:
    inset 3px 0 0 rgba(56, 189, 248, 0.95),
    inset 0 0 0 1px rgba(251, 191, 36, 0.28);
}

.value-tracker-editor__step,
.value-tracker-editor__state {
  color: rgb(161 161 170);
}

.value-tracker-editor__hex {
  color: rgb(253 224 71);
  font-weight: 600;
}

.value-tracker-editor__dec {
  color: rgb(228 228 231);
}

.value-tracker-editor__hex,
.value-tracker-editor__dec {
  cursor: text;
}

.value-tracker-editor__cell--selected {
  background: rgba(251, 191, 36, 0.1);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.32);
}
</style>
