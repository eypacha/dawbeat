<template>
  <Modal :open="visible" :title="title" @close="emit('close')">
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

    <div class="flex gap-4">
      <div class="value-roll-editor__ruler">
        <span v-for="label in rulerLabels" :key="label.value" :style="{ top: `${label.top}%` }">
          {{ label.value }}
        </span>
      </div>

      <div class="min-w-0 flex-1 overflow-x-auto">
        <div
          ref="surfaceElement"
          class="value-roll-editor__surface"
          :style="{ width: surfaceWidth }"
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  getValueRollEventCount,
  getValueRollResolvedValues,
  getValueRollStepCount,
  normalizeValueRollValues
} from '@/services/valueRollService'
import { clamp } from '@/utils/timeUtils'

const MIN_SURFACE_WIDTH_PX = 640
const STEP_WIDTH_PX = 18
const RULER_VALUES = [255, 192, 128, 64, 0]
const HELD_STEP_OPACITY = 0.35

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

let paintPointerId = null
let paintMode = null

const stepCount = computed(() => getValueRollStepCount(props.duration, props.stepSubdivision))
const eventCount = computed(() => getValueRollEventCount(draftValues.value))
const resolvedValues = computed(() =>
  getValueRollResolvedValues(draftValues.value, props.initialHeldValue)
)
const surfaceWidth = computed(() => `${Math.max(stepCount.value * STEP_WIDTH_PX, MIN_SURFACE_WIDTH_PX)}px`)
const rulerLabels = computed(() =>
  RULER_VALUES.map((value) => ({
    value,
    top: ((255 - value) / 255) * 100
  }))
)
const hoverIndicatorStyle = computed(() => {
  if (hoveredStepIndex.value === null || hoveredValue.value === null) {
    return {}
  }

  return {
    left: `${(hoveredStepIndex.value / stepCount.value) * 100}%`,
    top: `${((255 - hoveredValue.value) / 255) * 100}%`,
    width: `${100 / stepCount.value}%`
  }
})
const hoveredStatus = computed(() => {
  if (hoveredStepIndex.value === null || hoveredValue.value === null) {
    return 'Click and drag to set values. Hold Alt/Option to clear sets.'
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
  (visible) => {
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
  paintMode = event.altKey ? 'clear' : 'set'
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
  const relativeY = clamp(event.clientY - surfaceRect.top, 0, surfaceRect.height)
  const stepIndex = clamp(
    Math.floor((relativeX / surfaceRect.width) * stepCount.value),
    0,
    stepCount.value - 1
  )
  const value = clamp(255 - Math.round((relativeY / surfaceRect.height) * 255), 0, 255)

  return {
    stepIndex,
    value
  }
}

function getColumnStyle(value, index) {
  const hasExplicitSet = draftValues.value[index] !== null

  return {
    height: `${value === null ? 0 : (Number(value) / 255) * 100}%`,
    left: `${(index / stepCount.value) * 100}%`,
    minHeight: value === null ? undefined : '2px',
    opacity: value === null ? 0 : hasExplicitSet ? 1 : HELD_STEP_OPACITY,
    width: `${100 / stepCount.value}%`
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
</script>

<style scoped>
.value-roll-editor__ruler {
  position: relative;
  width: 3rem;
  height: 18rem;
  flex-shrink: 0;
  border: 1px solid rgb(39 39 42);
  border-radius: 0.375rem;
  background: rgb(9 9 11);
}

.value-roll-editor__ruler span {
  position: absolute;
  left: 0.5rem;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: rgb(113 113 122);
}

.value-roll-editor__surface {
  position: relative;
  height: 18rem;
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
  background-size: 100% calc(100% / 8), 18px 100%;
}

.value-roll-editor__column {
  position: absolute;
  bottom: 0;
  background: linear-gradient(to top, rgba(245, 158, 11, 0.94), rgba(253, 224, 71, 1));
  box-shadow: inset 0 0 0 1px rgba(120, 53, 15, 0.32);
}

.value-roll-editor__hover {
  position: absolute;
  height: 1px;
  border-top: 1px dashed rgba(251, 191, 36, 0.8);
  pointer-events: none;
}
</style>
