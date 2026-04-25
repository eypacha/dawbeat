<template>
  <Modal :open="visible" size="sm" title="Value Tracker Input" @close="handleCancel">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">Value Tracker Input</p>
          <p class="mt-2 text-xs text-zinc-500">{{ trackName || 'Unnamed Value Tracker' }}</p>
          <p class="mt-1 text-xs text-amber-300/80">Variable · {{ trackVariableName || 'Unassigned' }}</p>
        </div>

        <IconButton label="Close" size="sm" @click="handleCancel">
          x
        </IconButton>
      </div>
    </template>

    <div class="space-y-4">
      <label class="block">
        <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Type</span>
        <select
          v-model="draft.type"
          class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
        >
          <option value="">None</option>
          <option value="midiCc">MIDI CC</option>
          <option value="midiNote">MIDI Note</option>
          <option value="keyboard">Keyboard</option>
        </select>
      </label>

      <template v-if="usesMidiBinding">
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

        <div v-if="draft.type === 'midiCc'" class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Channel</span>
            <input
              :value="draft.channel"
              class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
              max="16"
              min="1"
              placeholder="Any"
              type="number"
              @input="draft.channel = $event.target.value"
            >
          </label>

          <label class="block">
            <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Controller</span>
            <input
              :value="draft.controller"
              class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
              max="127"
              min="0"
              placeholder="Any"
              type="number"
              @input="draft.controller = $event.target.value"
            >
          </label>

          <label class="block col-span-2">
            <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">Bits</span>
            <input
              :value="draft.bits"
              class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500"
              max="16"
              min="1"
              placeholder="8"
              step="1"
              type="number"
              @input="draft.bits = $event.target.value"
            >
            <p class="mt-1 text-[10px] text-zinc-500">1 to 16 bits. 8 gives 0 to 255.</p>
          </label>
        </div>

        <div class="rounded border border-zinc-800 bg-zinc-950/70 p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-zinc-200">MIDI Learn</p>
              <p class="mt-1 text-xs text-zinc-500">
                {{ midiLearnStatus }}
              </p>
            </div>

            <div class="flex shrink-0 gap-2">
              <Button
                size="xs"
                variant="ghost"
                @click="handleEnableMidi"
              >
                {{ midiState.enabled ? 'Refresh' : 'Enable MIDI' }}
              </Button>

              <Button
                v-if="showMidiLearnButton"
                size="xs"
                :variant="isListeningForLearn ? 'danger' : 'primary'"
                :disabled="midiState.initializing"
                @click="handleLearn"
              >
                {{ isListeningForLearn ? 'Stop Learn' : 'Learn' }}
              </Button>
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="draft.type === 'keyboard'" class="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-500">
        Keyboard input still uses the selected Value Tracker target during live play and recording.
      </div>

      <div v-else class="rounded border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-500">
        This track keeps driving its variable from timeline clips, with no live input override.
      </div>

      <p v-if="midiState.error" class="text-xs text-red-300">
        {{ midiState.error }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="handleCancel">Cancel</Button>
        <Button @click="handleConfirm">Save</Button>
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
  enableMidiInput,
  midiState,
  refreshMidiInputs,
  startMidiLearn,
  stopMidiLearn
} from '@/services/midiInputService'
import {
  createDefaultValueTrackerBinding
} from '@/services/valueTrackerService'

const props = defineProps({
  initialBinding: {
    type: Object,
    default: () => ({})
  },
  trackName: {
    type: String,
    default: ''
  },
  trackVariableName: {
    type: String,
    default: ''
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const draft = reactive(createBindingDraft(props.initialBinding))
const isListeningForLearn = ref(false)

const usesMidiBinding = computed(() => draft.type === 'midiCc' || draft.type === 'midiNote')
const showMidiLearnButton = computed(() => draft.type === 'midiCc' || draft.type === 'midiNote')
const midiInputs = computed(() => midiState.inputs)
const midiLearnStatus = computed(() => {
  if (!midiState.supported) {
    return 'This browser does not expose Web MIDI.'
  }

  if (!midiState.enabled) {
    return 'Enable MIDI first, then use Learn or fill the fields manually.'
  }

  if (isListeningForLearn.value) {
    return 'Listening for the next MIDI message.'
  }

  if (!midiInputs.value.length) {
    return 'MIDI is enabled, but no inputs are currently connected.'
  }

  if (draft.type === 'midiNote') {
    if (draft.deviceId) {
      return 'Press Learn and play a key to capture this device and its channel.'
    }

    return 'Press Learn and play a key to capture the device and channel.'
  }

  if (draft.type === 'midiCc') {
    return 'Use Learn to capture the next CC message from the selected device or any connected MIDI input.'
  }

  return `${midiInputs.value.length} MIDI input${midiInputs.value.length === 1 ? '' : 's'} available.`
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

watch(
  () => draft.type,
  () => {
    stopLearning()
  }
)

onBeforeUnmount(() => {
  stopLearning()
})

async function handleEnableMidi() {
  if (midiState.enabled) {
    refreshMidiInputs()
    return
  }

  await enableMidiInput()
}

async function handleLearn() {
  if (draft.type !== 'midiCc' && draft.type !== 'midiNote') {
    return
  }

  if (isListeningForLearn.value) {
    stopLearning()
    return
  }

  const enabled = midiState.enabled || await enableMidiInput()

  if (!enabled) {
    return
  }

  isListeningForLearn.value = true
  startMidiLearn((binding) => {
    if (!props.visible) {
      return
    }

    Object.assign(draft, {
      channel: formatNullableNumber(binding.channel),
      controller: formatNullableNumber(binding.controller),
      deviceId: binding.deviceId ?? draft.deviceId ?? '',
      note: formatNullableNumber(binding.note),
      type: binding.type ?? draft.type
    })
    isListeningForLearn.value = false
  }, {
    deviceId: draft.deviceId || null,
    sources: [draft.type]
  })
}

function handleCancel() {
  stopLearning()
  emit('cancel')
}

function handleConfirm() {
  emit('confirm', getNormalizedDraftBinding())
}

function stopLearning() {
  isListeningForLearn.value = false
  stopMidiLearn()
}

function getNormalizedDraftBinding() {
  return createDefaultValueTrackerBinding({
    channel: normalizeDraftNumber(draft.channel),
    controller: normalizeDraftNumber(draft.controller),
    bits: normalizeDraftNumber(draft.bits),
    deviceId: draft.deviceId || null,
    note: normalizeDraftNumber(draft.note),
    type: draft.type || null
  })
}

function createBindingDraft(binding) {
  const normalizedBinding = createDefaultValueTrackerBinding(binding)

  return {
    channel: formatNullableNumber(normalizedBinding.channel),
    controller: formatNullableNumber(normalizedBinding.controller),
    bits: formatNullableNumber(normalizedBinding.bits),
    deviceId: normalizedBinding.deviceId ?? '',
    note: formatNullableNumber(normalizedBinding.note),
    type: normalizedBinding.type ?? ''
  }
}

function formatNullableNumber(value) {
  return value === null || typeof value === 'undefined' ? '' : String(value)
}

function normalizeDraftNumber(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) ? numericValue : null
}
</script>
