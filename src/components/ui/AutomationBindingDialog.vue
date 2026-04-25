<template>
  <Modal :open="visible" size="sm" title="Automation MIDI Input" @close="handleCancel">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">Automation MIDI Input</p>
          <p class="mt-2 text-xs text-zinc-500">{{ laneLabel }}</p>
          <p class="mt-1 text-xs text-emerald-300/80">{{ bindingSummary }}</p>
        </div>

        <IconButton label="Close" size="sm" @click="handleCancel">
          x
        </IconButton>
      </div>
    </template>

    <div class="space-y-4">
      <div class="rounded border border-zinc-800 bg-zinc-950/70 p-3">
        <p class="text-sm text-zinc-200">MIDI CC</p>
        <p class="mt-1 text-xs leading-5 text-zinc-500">
          Move a knob or fader to capture the channel and controller. The incoming value maps to this lane range automatically.
        </p>
      </div>

      <label class="block">
        <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Device</span>
        <select
          v-model="draft.deviceId"
          class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
        >
          <option value="">Any device</option>
          <option
            v-for="midiInput in midiInputs"
            :key="midiInput.id"
            :value="midiInput.id"
          >
            {{ midiInput.name }}
          </option>
        </select>
      </label>

      <div class="rounded border border-zinc-800 bg-zinc-950/70 p-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-zinc-200">MIDI Learn</p>
            <p class="mt-1 text-xs text-zinc-500">
              {{ midiLearnStatus }}
            </p>
          </div>

          <Button
            size="xs"
            :variant="isListeningForLearn ? 'danger' : 'primary'"
            :disabled="midiState.initializing || !midiState.enabled"
            @click="handleLearn"
          >
            {{ isListeningForLearn ? 'Stop Learn' : 'Learn' }}
          </Button>
        </div>
      </div>

      <p v-if="midiState.error" class="text-xs text-red-300">
        {{ midiState.error }}
      </p>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <Button v-if="showClearButton" variant="ghost" @click="handleClear">
          Clear Binding
        </Button>

        <div class="ml-auto flex gap-2">
          <Button variant="ghost" @click="handleCancel">Cancel</Button>
          <Button :disabled="!canConfirm" @click="handleConfirm">Save</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  AUTOMATION_BINDING_MIDI_CC,
  createDefaultAutomationBinding,
  getAutomationBindingSummary,
  getAutomationLaneConfig
} from '@/services/automationService'
import {
  getMidiInputDisplayName,
  midiState,
  startMidiLearn,
  stopMidiLearn
} from '@/services/midiInputService'

const props = defineProps({
  initialBinding: {
    type: Object,
    default: () => ({})
  },
  lane: {
    type: Object,
    default: null
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const draft = reactive(createBindingDraft(props.initialBinding))
const isListeningForLearn = ref(false)

const laneLabel = computed(() => getAutomationLaneLabel(props.lane))
const midiInputs = computed(() => midiState.inputs)
const displayedBinding = computed(() => {
  const draftChannel = normalizeDraftNumber(draft.channel)
  const draftController = normalizeDraftNumber(draft.controller)

  if (draftChannel === null || draftController === null) {
    return createDefaultAutomationBinding(props.initialBinding)
  }

  return createDefaultAutomationBinding({
    type: AUTOMATION_BINDING_MIDI_CC,
    deviceId: draft.deviceId || null,
    channel: draftChannel,
    controller: draftController
  })
})
const bindingSummary = computed(() =>
  getAutomationBindingSummary(displayedBinding.value, getMidiInputDisplayName)
)
const canConfirm = computed(() =>
  normalizeDraftNumber(draft.channel) !== null && normalizeDraftNumber(draft.controller) !== null
)
const showClearButton = computed(() => displayedBinding.value.type === AUTOMATION_BINDING_MIDI_CC)
const midiLearnStatus = computed(() => {
  if (!midiState.supported) {
    return 'This browser does not expose Web MIDI.'
  }

  if (!midiState.enabled) {
    return 'Enable MIDI in Settings first, then use Learn.'
  }

  if (isListeningForLearn.value) {
    return 'Listening for the next MIDI CC message.'
  }

  if (!midiInputs.value.length) {
    return 'MIDI is enabled, but no inputs are currently connected.'
  }

  if (draft.deviceId) {
    return 'Press Learn and move a knob or fader from that device.'
  }

  return 'Press Learn and move a knob or fader to capture the device, channel, and controller.'
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      Object.assign(draft, createBindingDraft(props.initialBinding))
      return
    }

    stopLearning()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopLearning()
})

function handleLearn() {
  if (isListeningForLearn.value) {
    stopLearning()
    return
  }

  if (!midiState.enabled) {
    return
  }

  isListeningForLearn.value = true
  startMidiLearn((binding) => {
    if (!props.visible) {
      stopLearning()
      return
    }

    Object.assign(draft, {
      channel: formatNullableNumber(binding.channel),
      controller: formatNullableNumber(binding.controller),
      deviceId: binding.deviceId ?? draft.deviceId ?? ''
    })
    isListeningForLearn.value = false
  }, {
    deviceId: draft.deviceId || null,
    sources: ['midiCc']
  })
}

function handleCancel() {
  stopLearning()
  emit('cancel')
}

function handleConfirm() {
  if (!canConfirm.value) {
    return
  }

  stopLearning()
  emit('confirm', createDefaultAutomationBinding({
    type: AUTOMATION_BINDING_MIDI_CC,
    deviceId: draft.deviceId || null,
    channel: normalizeDraftNumber(draft.channel),
    controller: normalizeDraftNumber(draft.controller)
  }))
}

function handleClear() {
  stopLearning()
  emit('confirm', createDefaultAutomationBinding())
}

function stopLearning() {
  isListeningForLearn.value = false
  stopMidiLearn()
}

function createBindingDraft(binding) {
  const normalizedBinding = createDefaultAutomationBinding(binding)

  return {
    channel: formatNullableNumber(normalizedBinding.channel),
    controller: formatNullableNumber(normalizedBinding.controller),
    deviceId: normalizedBinding.deviceId ?? ''
  }
}

function formatNullableNumber(value) {
  return value === null || typeof value === 'undefined' ? '' : String(value)
}

function normalizeDraftNumber(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) ? numericValue : null
}

function getAutomationLaneLabel(lane) {
  const laneConfig = getAutomationLaneConfig(lane)
  return laneConfig?.label ?? lane?.id ?? 'Automation Lane'
}
</script>
