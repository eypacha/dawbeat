<template>
  <Modal :open="visible" size="sm" title="Settings" @close="emit('close')">
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

    <div class="mt-6 flex items-center justify-between gap-4">
      <p class="text-sm text-zinc-300">Reset local storage</p>
      <Button size="xs" variant="danger" @click="handleResetProject">Reset</Button>
    </div>

  </Modal>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
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
const { showClipWaveforms } = storeToRefs(dawStore)
const { stop } = useTransportPlayback()

function handleShowClipWaveformsChange(event) {
  dawStore.setShowClipWaveforms(event.target.checked)
}

async function handleResetProject() {
  await stop()
  clearProjectStorage()
  dawStore.resetProject()
  enqueueSnackbar('Project storage reset', { variant: 'success' })
  emit('close')
}
</script>
