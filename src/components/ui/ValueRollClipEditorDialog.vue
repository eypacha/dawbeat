<template>
  <Modal :open="visible" size="xl" :title="title" @close="emit('close')">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">{{ title }}</p>
          <p class="mt-2 text-xs text-zinc-500">
            {{ stepCount }} steps · {{ eventCount }} sets · {{ stepSubdivision }} step/tick
          </p>
        </div>
      </div>
    </template>

    <div class="value-roll-editor__viewport">
      <div
        class="value-roll-editor__ruler-viewport"
        :style="{ height: viewportHeight }"
        @wheel.prevent="handleRulerWheel"
      >
        <div
          class="value-roll-editor__ruler"
          :style="{ height: surfaceHeight, transform: `translateY(-${surfaceScrollTop}px)` }"
        >
        <span
          v-for="label in rulerLabels"
          :key="label.value"
          :style="{ top: `${label.top}px`, height: `${VALUE_ROW_HEIGHT_PX}px` }"
        >
          {{ label.value }}
        </span>
        </div>
      </div>

      <div
        ref="surfaceViewportElement"
        class="value-roll-editor__surface-viewport"
        :style="{ height: viewportHeight }"
        @scroll="handleSurfaceViewportScroll"
      >
        <div
          ref="surfaceElement"
          class="value-roll-editor__surface"
          :style="{ width: surfaceWidth, height: surfaceHeight }"
          @pointerdown="handleSurfacePointerDown"
          @pointerleave="handleSurfacePointerLeave"
          @pointermove="handleSurfacePointerMove"
        >
          <div class="value-roll-editor__grid" />

          <div
            v-for="(value, index) in resolvedValues"
            :key="`${index}:${value}`"
            class="value-roll-editor__column"
            :style="getColumnStyle(value, index)"
          />

          <div
            v-if="hoveredStepIndex !== null"
            class="value-roll-editor__hover"
            :style="hoverIndicatorStyle"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-4 text-xs text-zinc-500">
      <span>
        {{ hoveredStatus }}
      </span>

      <button
        class="border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        type="button"
        @click="clearEvents"
      >
        Clear Events
      </button>
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <Button variant="ghost" @click="emit('close')">Cancel</Button>
        <Button variant="primary" @click="emitSave()">Save</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  VALUE_ROLL_MAX,
  VALUE_ROLL_MIN,
  getValueRollEventCount,
  getValueRollResolvedValues,
  getValueRollStepCount,
  normalizeValueRollValues
} from '@/services/valueRollService'
import { clamp } from '@/utils/timeUtils'

const MIN_SURFACE_WIDTH_PX = 640
const STEP_WIDTH_PX = 18
const VALUE_ROW_HEIGHT_PX = 18
const VISIBLE_VALUE_COUNT = 16
const HELD_STEP_OPACITY = 0.35
const VALUE_RANGE_SIZE = VALUE_ROLL_MAX - VALUE_ROLL_MIN + 1

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
  stepSubdivision: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: 'Edit Value Roll'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const draftValues = ref([])
const hoveredStepIndex = ref(null)
const hoveredValue = ref(null)
const surfaceElement = ref(null)
const surfaceViewportElement = ref(null)
const surfaceScrollTop = ref(0)

let paintPointerId = null
let paintMode = null

const stepCount = computed(() => getValueRollStepCount(props.duration, props.stepSubdivision))
const eventCount = computed(() => getValueRollEventCount(draftValues.value))
const resolvedValues = computed(() =>
  getValueRollResolvedValues(draftValues.value, props.initialHeldValue)
)
const surfaceWidthPx = computed(() => Math.max(stepCount.value * STEP_WIDTH_PX, MIN_SURFACE_WIDTH_PX))
const columnWidthPx = computed(() => surfaceWidthPx.value / Math.max(1, stepCount.value))
const surfaceWidth = computed(() => `${surfaceWidthPx.value}px`)
const surfaceHeight = computed(() => `${VALUE_RANGE_SIZE * VALUE_ROW_HEIGHT_PX}px`)
const viewportHeight = computed(() => `${VISIBLE_VALUE_COUNT * VALUE_ROW_HEIGHT_PX}px`)
const rulerLabels = computed(() =>
  Array.from({ length: VALUE_RANGE_SIZE }, (_entry, index) => VALUE_ROLL_MAX - index).map((value) => ({
    value,
    top: (VALUE_ROLL_MAX - value) * VALUE_ROW_HEIGHT_PX
  }))
)
const hoverIndicatorStyle = computed(() => {
  if (hoveredStepIndex.value === null || hoveredValue.value === null) {
    return {}
  }

  return {
    left: `${hoveredStepIndex.value * columnWidthPx.value}px`,
    top: `${(VALUE_ROLL_MAX - hoveredValue.value) * VALUE_ROW_HEIGHT_PX}px`,
    width: `${columnWidthPx.value}px`,
    height: `${VALUE_ROW_HEIGHT_PX}px`
  }
})
const hoveredStatus = computed(() => {
  if (hoveredStepIndex.value === null || hoveredValue.value === null) {
    return 'Click and drag to set values. Hold Shift to clear sets.'
  }

  const explicitValue = draftValues.value[hoveredStepIndex.value]
  const resolvedValue = resolvedValues.value[hoveredStepIndex.value]

  if (explicitValue !== null) {
    return `Step ${hoveredStepIndex.value + 1} · Set ${explicitValue}`
  }

  if (resolvedValue !== null) {
    return `Step ${hoveredStepIndex.value + 1} · Hold ${resolvedValue}`
  }

  return `Step ${hoveredStepIndex.value + 1} · No value yet`
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftValues.value = normalizeValueRollValues(
      props.initialValues,
      props.duration,
      props.stepSubdivision
    )
    hoveredStepIndex.value = null
    hoveredValue.value = null
    await nextTick()
    syncViewportToRelevantValue()
  },
  { immediate: true }
)

watch(
  () => props.initialValues,
  (nextValues) => {
    if (!props.visible) {
      draftValues.value = normalizeValueRollValues(nextValues, props.duration, props.stepSubdivision)
    }
  }
)

function handleSurfacePointerDown(event) {
  if (event.button !== 0 || !surfaceElement.value) {
    return
  }

  event.preventDefault()
  paintPointerId = event.pointerId
  paintMode = event.shiftKey ? 'clear' : 'set'
  paintValueFromPointerEvent(event)
  window.addEventListener('pointermove', handleWindowPointerMove)
  window.addEventListener('pointerup', handleWindowPointerUp)
  window.addEventListener('pointercancel', handleWindowPointerCancel)
}

function handleSurfacePointerMove(event) {
  updateHoveredState(event)
}

function handleSurfacePointerLeave() {
  if (paintPointerId !== null) {
    return
  }

  hoveredStepIndex.value = null
  hoveredValue.value = null
}

function handleWindowPointerMove(event) {
  if (paintPointerId !== event.pointerId) {
    return
  }

  paintValueFromPointerEvent(event)
}

function handleWindowPointerUp(event) {
  if (paintPointerId !== event.pointerId) {
    return
  }

  cleanupPainting()
}

function handleWindowPointerCancel(event) {
  if (paintPointerId !== event.pointerId) {
    return
  }

  cleanupPainting()
}

function paintValueFromPointerEvent(event) {
  if (!surfaceElement.value) {
    return
  }

  const { stepIndex, value } = getStepValueFromPointerEvent(event)

  hoveredStepIndex.value = stepIndex
  hoveredValue.value = value

  if (paintMode === 'clear') {
    if (draftValues.value[stepIndex] === null) {
      return
    }

    const nextValues = [...draftValues.value]
    nextValues[stepIndex] = null
    draftValues.value = nextValues
    return
  }

  if (draftValues.value[stepIndex] === value) {
    return
  }

  const nextValues = [...draftValues.value]
  nextValues[stepIndex] = value
  draftValues.value = nextValues
}

function updateHoveredState(event) {
  if (!surfaceElement.value) {
    return
  }

  const { stepIndex, value } = getStepValueFromPointerEvent(event)
  hoveredStepIndex.value = stepIndex
  hoveredValue.value = value
}

function getStepValueFromPointerEvent(event) {
  const surfaceRect = surfaceElement.value.getBoundingClientRect()
  const relativeX = clamp(event.clientX - surfaceRect.left, 0, surfaceRect.width - 0.0001)
  const relativeY = clamp(event.clientY - surfaceRect.top, 0, surfaceRect.height - 0.0001)
  const stepIndex = clamp(
    Math.floor(relativeX / columnWidthPx.value),
    0,
    stepCount.value - 1
  )
  const rowIndex = clamp(
    Math.floor(relativeY / VALUE_ROW_HEIGHT_PX),
    0,
    VALUE_RANGE_SIZE - 1
  )
  const value = VALUE_ROLL_MAX - rowIndex

  return {
    stepIndex,
    value
  }
}

function getColumnStyle(value, index) {
  const hasExplicitSet = draftValues.value[index] !== null

  return {
    height: `${value === null ? 0 : (Number(value) + 1) * VALUE_ROW_HEIGHT_PX}px`,
    left: `${index * columnWidthPx.value}px`,
    minHeight: value === null ? undefined : `${VALUE_ROW_HEIGHT_PX}px`,
    opacity: value === null ? 0 : hasExplicitSet ? 1 : HELD_STEP_OPACITY,
    width: `${columnWidthPx.value}px`
  }
}

function emitSave() {
  emit('save', {
    values: draftValues.value
  })
}

function clearEvents() {
  draftValues.value = normalizeValueRollValues([], props.duration, props.stepSubdivision)
}

function handleSurfaceViewportScroll(event) {
  surfaceScrollTop.value = event.target instanceof HTMLElement ? event.target.scrollTop : 0
}

function handleRulerWheel(event) {
  if (!(surfaceViewportElement.value instanceof HTMLElement)) {
    return
  }

  surfaceViewportElement.value.scrollTop += event.deltaY
  surfaceScrollTop.value = surfaceViewportElement.value.scrollTop
}

function cleanupPainting() {
  paintPointerId = null
  paintMode = null
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
  window.removeEventListener('pointercancel', handleWindowPointerCancel)
}

onBeforeUnmount(() => {
  cleanupPainting()
})

function syncViewportToRelevantValue() {
  if (!(surfaceViewportElement.value instanceof HTMLElement)) {
    return
  }

  const explicitValues = draftValues.value.filter((value) => value !== null)
  const anchorValue =
    explicitValues[0] ??
    (typeof props.initialHeldValue === 'number' ? props.initialHeldValue : VALUE_ROLL_MIN)
  const targetRow = VALUE_ROLL_MAX - clamp(anchorValue, VALUE_ROLL_MIN, VALUE_ROLL_MAX)
  const centeredOffset = (targetRow - Math.floor(VISIBLE_VALUE_COUNT / 2)) * VALUE_ROW_HEIGHT_PX
  const maxScrollTop = Math.max(
    0,
    VALUE_RANGE_SIZE * VALUE_ROW_HEIGHT_PX - VISIBLE_VALUE_COUNT * VALUE_ROW_HEIGHT_PX
  )

  surfaceViewportElement.value.scrollTop = clamp(centeredOffset, 0, maxScrollTop)
  surfaceScrollTop.value = surfaceViewportElement.value.scrollTop
}
</script>

<style scoped>
.value-roll-editor__viewport {
  display: flex;
  gap: 1rem;
}

.value-roll-editor__ruler-viewport {
  width: 3rem;
  flex-shrink: 0;
  overflow: hidden;
}

.value-roll-editor__ruler {
  position: relative;
  width: 100%;
  border: 1px solid rgb(39 39 42);
  border-radius: 0.375rem;
  background: rgb(9 9 11);
  will-change: transform;
}

.value-roll-editor__ruler span {
  position: absolute;
  left: 0.5rem;
  right: 0.25rem;
  display: flex;
  align-items: center;
  font-size: 0.6875rem;
  line-height: 1;
  color: rgb(113 113 122);
}

.value-roll-editor__surface-viewport {
  min-width: 0;
  flex: 1;
  overflow: auto;
}

.value-roll-editor__surface {
  position: relative;
  min-width: 100%;
  overflow: hidden;
  border: 1px solid rgb(39 39 42);
  border-radius: 0.375rem;
  background: rgb(9 9 11);
  cursor: crosshair;
}

.value-roll-editor__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to top, rgba(113, 113, 122, 0.14) 1px, transparent 1px),
    linear-gradient(to right, rgba(113, 113, 122, 0.1) 1px, transparent 1px);
  background-size: 100% 18px, v-bind(columnWidthPx + 'px') 100%;
}

.value-roll-editor__column {
  position: absolute;
  bottom: 0;
  background: linear-gradient(to top, rgba(245, 158, 11, 0.94), rgba(253, 224, 71, 1));
  box-shadow: inset 0 0 0 1px rgba(120, 53, 15, 0.32);
}

.value-roll-editor__hover {
  position: absolute;
  border: 1px dashed rgba(251, 191, 36, 0.8);
  background: rgba(251, 191, 36, 0.12);
  box-sizing: border-box;
  pointer-events: none;
}
</style>
