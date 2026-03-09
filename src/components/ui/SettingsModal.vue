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

    <div class="flex items-center justify-between gap-4">
      <p class="text-sm text-zinc-300">Reset local storage</p>
      <Button size="xs" variant="danger" @click="handleResetProject">Reset</Button>
    </div>

  </Modal>
</template>

<script setup>
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
const { stop } = useTransportPlayback()

async function handleResetProject() {
  await stop()
  clearProjectStorage()
  dawStore.resetProject()
  enqueueSnackbar('Project storage reset', { variant: 'success' })
  emit('close')
}
</script>
