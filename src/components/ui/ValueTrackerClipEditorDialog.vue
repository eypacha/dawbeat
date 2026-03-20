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
          <span class="value-tracker-editor__hex">{{ row.hexLabel }}</span>
          <span class="value-tracker-editor__dec">{{ row.decLabel }}</span>
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

const draftValues = ref([])
const pendingHexBuffer = ref('')
const pendingHexStepIndex = ref(null)
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
    const pendingHexLabel =
      pendingHexStepIndex.value === stepIndex && pendingHexBuffer.value
        ? `${pendingHexBuffer.value.padEnd(2, '_')}`
        : null

    return {
      stepIndex,
      stepLabel: String(stepIndex).padStart(3, '0'),
      stateLabel: explicitValue !== null ? 'SET' : resolvedValue !== null ? 'HOLD' : 'EMPTY',
      hexLabel: pendingHexLabel ?? formatHex(explicitValue ?? resolvedValue),
      decLabel:
        explicitValue !== null
          ? String(explicitValue).padStart(3, '0')
          : resolvedValue !== null
            ? String(resolvedValue).padStart(3, '0')
            : '---',
      className: {
        'value-tracker-editor__row--playhead': props.playheadStepIndex === stepIndex,
        'value-tracker-editor__row--selected': selectedStepIndex.value === stepIndex,
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

  if (pendingHexStepIndex.value === currentStepIndex && pendingHexBuffer.value) {
    return `Step ${currentStepIndex + 1} · typing ${pendingHexBuffer.value.padEnd(2, '_')}`
  }

  if (explicitValue !== null) {
    return `Step ${currentStepIndex + 1} · Set ${explicitValue} · 0x${formatHex(explicitValue)}`
  }

  if (resolvedValue !== null) {
    return `Step ${currentStepIndex + 1} · Hold ${resolvedValue} · 0x${formatHex(resolvedValue)}`
  }

  return `Step ${currentStepIndex + 1} · Empty`
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      clearPendingHex()
      return
    }

    draftValues.value = normalizeValueTrackerValues(
      props.initialValues,
      props.duration,
      props.stepSubdivision
    )
    selectedStepIndex.value = getAnchorStepIndex(draftValues.value)
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

function handleViewportKeydown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

  const stepIndex = clamp(selectedStepIndex.value, 0, Math.max(0, stepCount.value - 1))
  const hexDigit = getHexDigit(event.key)

  if (hexDigit) {
    event.preventDefault()
    applyHexDigit(stepIndex, hexDigit)
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

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    clearEventAtStep(stepIndex)
    return
  }

  if (event.key === 'Escape') {
    clearPendingHex()
  }
}

function applyHexDigit(stepIndex, digit) {
  if (pendingHexStepIndex.value !== stepIndex) {
    pendingHexBuffer.value = ''
  }

  pendingHexStepIndex.value = stepIndex
  pendingHexBuffer.value = `${pendingHexBuffer.value}${digit}`.slice(0, 2)

  if (pendingHexBuffer.value.length < 2) {
    return
  }

  setEventAtStep(stepIndex, parseInt(pendingHexBuffer.value, 16))
  clearPendingHex()

  if (stepIndex < stepCount.value - 1) {
    selectStep(stepIndex + 1)
  }
}

function selectStep(stepIndex) {
  selectedStepIndex.value = clamp(stepIndex, 0, Math.max(0, stepCount.value - 1))
  clearPendingHex()

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
  return normalizedValue === null ? '--' : normalizedValue.toString(16).toUpperCase().padStart(2, '0')
}

function getHexDigit(key) {
  const normalizedKey = typeof key === 'string' ? key.toUpperCase() : ''
  return /^[0-9A-F]$/.test(normalizedKey) ? normalizedKey : ''
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
  grid-template-columns: 5rem 5rem 5rem 5rem;
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
</style>
