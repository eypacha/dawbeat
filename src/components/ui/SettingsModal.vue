<template>
  <Modal :open="visible" size="md" title="Settings" @close="emit('close')">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <p class="pr-4 text-sm uppercase tracking-[0.24em] text-zinc-500">Settings</p>
        <IconButton label="Close" size="sm" @click="emit('close')">
          x
        </IconButton>
      </div>
    </template>

    <label class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-zinc-200">Show clip waveforms</p>
        <p class="text-xs text-zinc-500">Render formula previews inside timeline clips.</p>
      </div>

      <input
        :checked="showClipWaveforms"
        class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500"
        type="checkbox"
        @change="handleShowClipWaveformsChange"
      >
    </label>

    <label class="mt-6 flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-zinc-200">Show evaluated panel</p>
        <p class="text-xs text-zinc-500">Display the real-time playback expression under the main layout.</p>
      </div>

      <input
        :checked="showEvaluatedPanel"
        class="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-500"
        type="checkbox"
        @change="handleShowEvaluatedPanelChange"
      >
    </label>

    <div class="mt-6 rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-zinc-200">MIDI input</p>
          <p class="mt-1 text-xs text-zinc-500">
            {{ midiStatusText }}
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

      <div class="mt-4">
        <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Inputs</p>
        <div v-if="midiState.inputs.length" class="mt-2 space-y-2">
          <div
            v-for="midiInput in midiState.inputs"
            :key="midiInput.id"
            class="rounded border border-zinc-800 bg-zinc-900/70 px-3 py-2"
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

      <div class="mt-4">
        <p class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Recent messages</p>
        <div class="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
          <div
            v-for="message in midiState.recentMessages"
            :key="message.id"
            class="rounded border border-zinc-800 bg-zinc-900/70 px-3 py-2"
          >
            <p class="text-sm text-zinc-200">{{ formatMidiDebugMessage(message) }}</p>
          </div>
          <p v-if="!midiState.recentMessages.length" class="text-xs text-zinc-500">
            No MIDI messages received yet.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between gap-4">
      <p class="text-sm text-zinc-300">Reset local storage</p>
      <Button size="xs" variant="danger" @click="handleResetProject">Reset</Button>
    </div>

  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
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

function handleShowClipWaveformsChange(event) {
  dawStore.setShowClipWaveforms(event.target.checked)
}

function handleShowEvaluatedPanelChange(event) {
  dawStore.setShowEvaluatedPanel(event.target.checked)
}

async function handleMidiEnable() {
  await enableMidiInput()
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

async function handleResetProject() {
  await stop()
  clearProjectStorage()
  dawStore.resetProject()
  enqueueSnackbar('Project storage reset', { variant: 'success' })
  emit('close')
}
</script>
