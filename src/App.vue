<template>
  <StartScreen v-if="!audioReady" @start="handleStart" />

  <div v-else class="h-screen overflow-hidden bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
      <TransportBar />

      <main class="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_304px]">
        <FormulaLibrary />
        <Timeline />
        <EffectsPanel />
      </main>
    </div>

    <ContextMenu
      :x="contextMenu.state.x"
      :y="contextMenu.state.y"
      :items="contextMenu.state.items"
      :visible="contextMenu.state.visible"
      @close="contextMenu.closeContextMenu()"
      @select="handleContextMenuSelect"
    >
      <template #submenu="{ item, close }">
        <TrackColorPalette
          v-if="item.action === 'set-track-color'"
          :colors="item.colors"
          :selected-color="item.selectedColor"
          @select="handleTrackColorSelect(item, $event, close)"
        />

        <TrackUnionOperatorMenu
          v-else-if="item.action === 'set-track-union-operator'"
          :options="item.options"
          :selected-operator="item.selectedOperator"
          @select="handleTrackUnionOperatorSelect(item, $event, close)"
        />
      </template>
    </ContextMenu>

    <ConfirmDialog
      confirm-label="Delete Track"
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

    <FormulaInputDialog
      :initial-name="editingFormulaName"
      :initial-value="editingFormulaValue"
      :visible="isFormulaDialogVisible"
      label="Formula"
      :title="formulaDialogTitle"
      @close="closeFormulaDialog"
      @eval="evaluateFormulaDialog"
      @save="saveFormulaDialog"
    />

    <SnackbarContainer />
  </div>
</template>

<script setup>
import { computed, reactive, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import StartScreen from '@/components/boot/StartScreen.vue'
import EffectsPanel from '@/components/effects/EffectsPanel.vue'
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TrackUnionOperatorMenu from '@/components/timeline/TrackUnionOperatorMenu.vue'
import TransportBar from '@/components/transport/TransportBar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import FormulaInputDialog from '@/components/ui/FormulaInputDialog.vue'
import SnackbarContainer from '@/components/ui/SnackbarContainer.vue'
import TextInputDialog from '@/components/ui/TextInputDialog.vue'
import TrackColorPalette from '@/components/timeline/TrackColorPalette.vue'
import { provideContextMenu } from '@/composables/useContextMenu'
import { getFormulaById, resolveClipFormula, resolveClipFormulaName } from '@/services/formulaService'
import { initKeyboardShortcuts } from '@/services/keyboardShortcuts'
import { findTrackWithClip } from '@/services/dawStoreService'
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
let disposeKeyboardShortcuts = null
const transportPlayback = useTransportPlayback()
const { enableAudio, stop } = transportPlayback
const { audioReady, editingClipId, editingFormulaId, formulas, selectedClipId, tracks } = storeToRefs(dawStore)

const editingClipFormula = computed(() => {
  if (!editingClipId.value) {
    return ''
  }

  const result = findTrackWithClip(tracks.value, editingClipId.value)

  if (!result) {
    return ''
  }

  const clip = result.track.clips[result.clipIndex]
  return clip ? resolveClipFormula(clip, formulas.value) : ''
})

const editingClipFormulaName = computed(() => {
  if (!editingClipId.value) {
    return ''
  }

  const result = findTrackWithClip(tracks.value, editingClipId.value)

  if (!result) {
    return ''
  }

  const clip = result.track.clips[result.clipIndex]
  return clip ? resolveClipFormulaName(clip, formulas.value) : ''
})

const editingLibraryFormula = computed(() => {
  if (!editingFormulaId.value) {
    return ''
  }

  return getFormulaById(formulas.value, editingFormulaId.value)?.code ?? ''
})

const editingLibraryFormulaName = computed(() => {
  if (!editingFormulaId.value) {
    return ''
  }

  return getFormulaById(formulas.value, editingFormulaId.value)?.name ?? ''
})

const isFormulaDialogVisible = computed(() => Boolean(editingClipId.value || editingFormulaId.value))

const editingFormulaValue = computed(() => {
  if (editingClipId.value) {
    return editingClipFormula.value
  }

  return editingLibraryFormula.value
})

const editingFormulaName = computed(() => {
  if (editingClipId.value) {
    return editingClipFormulaName.value
  }

  return editingLibraryFormulaName.value
})

const formulaDialogTitle = computed(() =>
  editingClipId.value ? 'Edit Clip Formula' : 'Edit Library Formula'
)

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

  if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
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

  if (action === 'add-clip-formula-to-library') {
    dawStore.addClipFormulaToLibrary(item.trackId, item.clipId)
    return
  }

  if (action === 'detach-clip-formula') {
    dawStore.detachClipFormula(item.trackId, item.clipId)
  }
}

function handleTrackColorSelect(item, color, close) {
  dawStore.setTrackColor(item.trackId, color)
  close()
}

function handleTrackUnionOperatorSelect(item, operator, close) {
  dawStore.setTrackUnionOperator(item.trackId, operator)
  close()
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

function closeFormulaDialog() {
  dawStore.setEditingClip(null)
  dawStore.setEditingFormula(null)
}

function evaluateFormulaDialog(nextDraft) {
  if (editingClipId.value) {
    dawStore.saveClipFormulaDraft(editingClipId.value, nextDraft)
    return
  }

  if (editingFormulaId.value) {
    dawStore.updateFormula(editingFormulaId.value, {
      code: nextDraft.code,
      name: nextDraft.name
    })
  }
}

function saveFormulaDialog(nextDraft) {
  if (editingClipId.value) {
    dawStore.saveClipFormulaDraftAndName(editingClipId.value, nextDraft)
    closeFormulaDialog()
    return
  }

  if (editingFormulaId.value) {
    dawStore.updateFormula(editingFormulaId.value, {
      code: nextDraft.code,
      name: nextDraft.name
    })
    closeFormulaDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  disposeKeyboardShortcuts = initKeyboardShortcuts({
    dawStore,
    transport: transportPlayback
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  disposeKeyboardShortcuts?.()
  disposeKeyboardShortcuts = null
  void stop()
})
</script>
