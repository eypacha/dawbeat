<template>
  <StartScreen v-if="!audioReady" @start="handleStart" />

  <div v-else class="min-h-screen bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex min-h-screen w-full flex-col gap-4 p-4">
      <TransportBar />

      <main class="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FormulaLibrary />
        <Timeline />
      </main>
    </div>

    <ContextMenu
      :x="contextMenu.state.x"
      :y="contextMenu.state.y"
      :items="contextMenu.state.items"
      :visible="contextMenu.state.visible"
      @close="contextMenu.closeContextMenu()"
      @select="handleContextMenuSelect"
    />

    <ConfirmDialog
      :message="confirmDialog.message"
      :visible="confirmDialog.visible"
      title="Delete Track"
      @cancel="closeConfirmDialog"
      @confirm="confirmTrackDeletion"
    />

    <TextInputDialog
      :initial-value="renameDialog.trackName"
      :visible="renameDialog.visible"
      label="Track Name"
      title="Rename Track"
      @cancel="closeRenameDialog"
      @confirm="confirmTrackRename"
    />
  </div>
</template>

<script setup>
import { reactive, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import StartScreen from '@/components/boot/StartScreen.vue'
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TransportBar from '@/components/transport/TransportBar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import TextInputDialog from '@/components/ui/TextInputDialog.vue'
import { provideContextMenu } from '@/composables/useContextMenu'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const contextMenu = provideContextMenu()
const confirmDialog = reactive({
  visible: false,
  message: '',
  trackId: null
})
const renameDialog = reactive({
  trackId: null,
  trackName: '',
  visible: false
})
const { enableAudio } = useTransportPlayback()
const { audioReady, editingClipId, selectedClipId } = storeToRefs(dawStore)

async function handleStart() {
  await enableAudio()
}

function handleKeydown(event) {
  if (event.key !== 'Delete' && event.key !== 'Backspace') {
    return
  }

  if (!selectedClipId.value) {
    return
  }

  if (editingClipId.value) {
    return
  }

  if (document.activeElement?.tagName === 'INPUT') {
    return
  }

  dawStore.removeClip(selectedClipId.value)
}

function handleContextMenuSelect(action, item) {
  if (action === 'add-track') {
    dawStore.addTrack(item.beforeTrackId ?? null)
    return
  }

  if (action === 'delete-track') {
    confirmDialog.trackId = item.trackId
    confirmDialog.message = `Delete ${item.trackName ?? 'this track'}?`
    confirmDialog.visible = true
    return
  }

  if (action === 'rename-track') {
    renameDialog.trackId = item.trackId
    renameDialog.trackName = item.trackName ?? ''
    renameDialog.visible = true
    return
  }

  if (action === 'set-track-color') {
    dawStore.setTrackColor(item.trackId, item.color)
  }
}

function closeConfirmDialog() {
  confirmDialog.visible = false
  confirmDialog.message = ''
  confirmDialog.trackId = null
}

function confirmTrackDeletion() {
  if (confirmDialog.trackId) {
    dawStore.removeTrack(confirmDialog.trackId)
  }

  closeConfirmDialog()
}

function closeRenameDialog() {
  renameDialog.trackId = null
  renameDialog.trackName = ''
  renameDialog.visible = false
}

function confirmTrackRename(nextName) {
  if (renameDialog.trackId) {
    dawStore.renameTrack(renameDialog.trackId, nextName)
  }

  closeRenameDialog()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
