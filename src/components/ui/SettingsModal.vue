<template>
  <Modal
    :open="visible"
    panel-class="h-[710px] rounded-none"
    size="lg"
    title="Settings"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <p class="pr-4 text-sm uppercase tracking-[0.24em] text-zinc-500">Settings</p>
        <IconButton :icon="X" label="Close" size="sm" variant="text" @click="emit('close')" />
      </div>
    </template>

    <Tabs v-model="activeTab" :items="settingsTabs" class="flex h-full min-h-0 flex-col">
      <template #default="{ activeTabId }">
        <section
          v-if="activeTabId === 'general'"
          class="space-y-4"
        >
          <label class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950/70 p-4">
            <div>
              <p class="text-sm text-zinc-200">Show clip waveforms</p>
              <p class="text-xs text-zinc-500">Render formula previews inside timeline clips.</p>
            </div>

            <input
              :checked="showClipWaveforms"
              class="h-4 w-4 border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500"
              type="checkbox"
              @change="handleShowClipWaveformsChange"
            >
          </label>

          <label class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950/70 p-4">
            <div>
              <p class="text-sm text-zinc-200">Show evaluated panel</p>
              <p class="text-xs text-zinc-500">Display the real-time playback expression under the main layout.</p>
            </div>

            <input
              :checked="showEvaluatedPanel"
              class="h-4 w-4 border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500"
              type="checkbox"
              @change="handleShowEvaluatedPanelChange"
            >
          </label>

          <div class="flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-950/70 p-4">
            <div>
              <p class="text-sm text-zinc-300">Reset local storage</p>
              <p class="text-xs text-zinc-500">Clear the autosaved project and reload the demo state.</p>
            </div>
            <Button size="xs" variant="danger" @click="resetConfirmVisible = true">Reset</Button>
          </div>
        </section>

        <section
          v-else-if="activeTabId === 'midi'"
          class="space-y-4"
        >
          <div class="border border-zinc-800 bg-zinc-900/60 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm text-zinc-200">MIDI input</p>
                  <span class="border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    {{ midiEnableLabel }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-zinc-500">
                  {{ midiStatusText }}
                </p>
                <p class="mt-2 text-xs text-zinc-500">
                  Enable MIDI for bindings, live input and clock sync.
                </p>
              </div>

              <div class="flex shrink-0 gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  @click="handleMidiRefresh"
                >
                  Refresh
                </Button>

                <Button
                  size="xs"
                  :disabled="midiState.initializing || !midiState.supported"
                  :variant="midiState.enabled ? 'primary' : 'default'"
                  @click="handleMidiEnable"
                >
                  {{ midiEnableLabel }}
                </Button>
              </div>
            </div>

            <p v-if="midiState.error" class="mt-3 text-xs text-red-300">
              {{ midiState.error }}
            </p>
          </div>

          <div class="border border-zinc-800 bg-zinc-950/40 p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm text-zinc-200">MIDI Clock receive</p>
                  <span class="border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    {{ midiClockTransportState }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-zinc-500">
                  {{ midiClockStatusText }}
                </p>
              </div>

              <input
                :checked="midiClockState.enabled"
                class="mt-1 h-4 w-4 border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500"
                :disabled="midiState.initializing || !midiState.supported"
                type="checkbox"
                @change="handleMidiClockEnabledChange"
              >
            </div>

            <label class="mt-4 block">
              <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Clock input</span>
              <select
                class="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                :disabled="!midiClockState.enabled || !midiState.inputs.length"
                :value="midiClockState.selectedInputId"
                @change="handleMidiClockInputChange"
              >
                <option value="">Select MIDI input</option>
                <option
                  v-for="midiInput in midiState.inputs"
                  :key="midiInput.id"
                  :value="midiInput.id"
                >
                  {{ midiInput.name }}
                </option>
              </select>
            </label>

            <div class="mt-4 grid gap-3 text-xs text-zinc-400 sm:grid-cols-2">
              <div class="border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">State</p>
                <p class="mt-1 text-sm text-zinc-200">{{ midiClockTransportState }}</p>
              </div>

              <div class="border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">BPM</p>
                <p class="mt-1 text-sm text-zinc-200">{{ midiClockBpmLabel }}</p>
              </div>

              <div class="border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Effective Hz</p>
                <p class="mt-1 text-sm text-zinc-200">{{ midiClockSampleRateLabel }}</p>
              </div>

              <div class="border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Source</p>
                <p class="mt-1 text-sm text-zinc-200">{{ midiClockInputLabel }}</p>
              </div>
            </div>
          </div>

          <div>
            <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Inputs</p>
            <div v-if="midiState.inputs.length" class="mt-2 grid gap-2 md:grid-cols-2">
              <div
                v-for="midiInput in midiState.inputs"
                :key="midiInput.id"
                class="border border-zinc-800 bg-zinc-900/70 px-3 py-2"
              >
                <p class="text-sm text-zinc-200">{{ midiInput.name }}</p>
                <p class="mt-1 text-xs text-zinc-500">
                  {{ formatMidiInputMeta(midiInput) }}
                </p>
              </div>
            </div>
            <p v-else class="mt-2 text-xs text-zinc-500">
              No MIDI inputs detected yet.
            </p>
          </div>

          <div>
            <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Recent messages</p>
            <div class="mt-2 max-h-52 space-y-2 overflow-auto pr-1">
              <div
                v-for="message in midiState.recentMessages"
                :key="message.id"
                class="border border-zinc-800 bg-zinc-900/70 px-3 py-2"
              >
                <p class="text-sm text-zinc-200">{{ formatMidiDebugMessage(message) }}</p>
              </div>
              <p v-if="!midiState.recentMessages.length" class="text-xs text-zinc-500">
                No MIDI messages received yet.
              </p>
            </div>
          </div>
        </section>
      </template>
    </Tabs>
  </Modal>

  <ConfirmDialog
    confirm-label="Reset Project"
    message="This will delete the autosaved project in local storage and replace the current work with the demo state."
    title="Reset Local Storage?"
    :visible="resetConfirmVisible"
    @cancel="resetConfirmVisible = false"
    @confirm="handleResetProject"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'
import Tabs from '@/components/ui/Tabs.vue'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { formatBpmValue } from '@/services/bpmService'
import { midiClockState, setMidiClockInput, setMidiClockReceiveEnabled } from '@/services/midiClockService'
import {
  enableMidiInput,
  formatMidiDebugMessage,
  midiState,
  refreshMidiInputs
} from '@/services/midiInputService'
import { enqueueSnackbar } from '@/services/notifications'
import { clearProjectStorage } from '@/services/projectPersistence'
import { useDawStore } from '@/stores/dawStore'

defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const dawStore = useDawStore()
const { showClipWaveforms, showEvaluatedPanel } = storeToRefs(dawStore)
const { stop } = useTransportPlayback()
const activeTab = ref('general')
const resetConfirmVisible = ref(false)
const settingsTabs = [
  {
    id: 'general',
    label: 'General'
  },
  {
    id: 'midi',
    label: 'MIDI'
  }
]
const midiEnableLabel = computed(() => {
  if (midiState.initializing) {
    return 'Enabling...'
  }

  return midiState.enabled ? 'Enabled' : 'Enable MIDI'
})
const midiStatusText = computed(() => {
  if (!midiState.supported) {
    return 'This browser does not support Web MIDI.'
  }

  if (!midiState.enabled) {
    return 'Enable MIDI to inspect software keyboards, virtual ports and hardware devices.'
  }

  return `${midiState.inputs.length} MIDI input${midiState.inputs.length === 1 ? '' : 's'} available.`
})
const midiClockTransportState = computed(() => {
  if (!midiClockState.enabled) {
    return 'Disabled'
  }

  if (!midiClockState.locked) {
    return 'Unlocked'
  }

  return midiClockState.running ? 'Running' : 'Stopped'
})
const midiClockStatusText = computed(() => {
  if (!midiState.supported) {
    return 'This browser does not support Web MIDI.'
  }

  if (!midiClockState.enabled) {
    return 'Enable receive mode to slave the app to an external MIDI Clock input.'
  }

  if (!midiClockState.selectedInputId) {
    return 'Select a single MIDI input to listen for clock.'
  }

  if (!midiClockState.locked) {
    return 'Waiting for timing clock from the selected MIDI input.'
  }

  return midiClockState.running
    ? 'External MIDI Clock is locked and currently driving transport.'
    : 'External MIDI Clock is locked and transport is stopped.'
})
const midiClockBpmLabel = computed(() =>
  midiClockState.locked && Number.isFinite(midiClockState.externalBpm)
    ? formatBpmValue(midiClockState.externalBpm)
    : '--'
)
const midiClockSampleRateLabel = computed(() =>
  midiClockState.locked && Number.isFinite(midiClockState.effectiveSampleRate)
    ? formatNumberLabel(midiClockState.effectiveSampleRate)
    : '--'
)
const midiClockInputLabel = computed(() =>
  midiClockState.syncSourceName || 'No input selected'
)

function handleShowClipWaveformsChange(event) {
  dawStore.setShowClipWaveforms(event.target.checked)
}

function handleShowEvaluatedPanelChange(event) {
  dawStore.setShowEvaluatedPanel(event.target.checked)
}

async function handleMidiEnable() {
  await enableMidiInput()
}

async function handleMidiClockEnabledChange(event) {
  const enabled = await setMidiClockReceiveEnabled(event.target.checked)

  if (!enabled) {
    event.target.checked = false
  }
}

function handleMidiClockInputChange(event) {
  setMidiClockInput(event.target.value)
}

function handleMidiRefresh() {
  if (!refreshMidiInputs()) {
    void enableMidiInput()
  }
}

function formatMidiInputMeta(midiInput) {
  const manufacturer = midiInput.manufacturer || 'Unknown manufacturer'
  return `${manufacturer} · ${midiInput.state} · ${midiInput.connection}`
}

function formatNumberLabel(value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return '--'
  }

  if (Number.isInteger(normalizedValue)) {
    return String(normalizedValue)
  }

  return normalizedValue
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}

async function handleResetProject() {
  resetConfirmVisible.value = false
  await stop()
  clearProjectStorage()
  dawStore.resetProject()
  enqueueSnackbar('Project storage reset', { variant: 'success' })
  emit('close')
}
</script>
