<template>
  <StartScreen v-if="!audioReady" @start="handleStart" />

  <div v-else class="h-screen overflow-hidden bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
      <Toolbar />

      <main class="app-main-layout min-h-0 flex-1 gap-4 overflow-hidden" :style="mainLayoutStyle">
        <FormulaLibrary :collapsed="libraryCollapsed" @toggle-collapse="toggleLibraryCollapsed" />
        <Timeline />
        <EffectsPanel :collapsed="effectsCollapsed" @toggle-collapse="toggleEffectsCollapsed" />
      </main>

      <EvaluatedPanel v-if="showEvaluatedPanel" />
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
        <TrackUnionOperatorMenu
          v-if="item.action === 'set-track-union-operator'"
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

    <TrackPresentationDialog
      :colors="trackPresentationDialog.colors"
      :initial-color="trackPresentationDialog.trackColor"
      :initial-name="trackPresentationDialog.trackName"
      :visible="trackPresentationDialog.visible"
      @cancel="closeTrackPresentationDialog"
      @confirm="confirmTrackPresentation"
    />

    <FormulaInputDialog
      :initial-name="editingFormulaName"
      :initial-value="editingFormulaValue"
      :show-name="showFormulaDialogNameField"
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
import { computed, reactive, ref, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import StartScreen from '@/components/boot/StartScreen.vue'
import EffectsPanel from '@/components/effects/EffectsPanel.vue'
import EvaluatedPanel from '@/components/evaluated/EvaluatedPanel.vue'
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TrackUnionOperatorMenu from '@/components/timeline/TrackUnionOperatorMenu.vue'
import Toolbar from '@/components/transport/Toolbar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import FormulaInputDialog from '@/components/ui/FormulaInputDialog.vue'
import SnackbarContainer from '@/components/ui/SnackbarContainer.vue'
import TrackPresentationDialog from '@/components/ui/TrackPresentationDialog.vue'
import { provideContextMenu } from '@/composables/useContextMenu'
import { getFormulaById, resolveClipFormula, resolveClipFormulaName } from '@/services/formulaService'
import { initKeyboardShortcuts } from '@/services/keyboardShortcuts'
import { findTimelineClip } from '@/services/dawStoreService'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import { TRACK_COLOR_PALETTE } from '@/utils/colorUtils'

const dawStore = useDawStore()
const contextMenu = provideContextMenu()
const confirmDialog = reactive({
  visible: false,
  message: '',
  trackId: null
})
const trackPresentationDialog = reactive({
  colors: TRACK_COLOR_PALETTE,
  trackColor: TRACK_COLOR_PALETTE[0],
  trackId: null,
  trackName: '',
  visible: false
})
let disposeKeyboardShortcuts = null
const transportPlayback = useTransportPlayback()
const { enableAudio, stop } = transportPlayback
const effectsCollapsed = ref(false)
const libraryCollapsed = ref(false)
const {
  audioReady,
  editingClipId,
  editingFormulaId,
  formulas,
  selectedAutomationPoint,
  selectedClipId,
  selectedClipIds,
  showEvaluatedPanel,
  tracks,
  variableTracks
} = storeToRefs(dawStore)

const editingClipRecord = computed(() => {
  if (!editingClipId.value) {
    return null
  }

  return findTimelineClip(tracks.value, variableTracks.value, editingClipId.value)
})

const editingClipFormula = computed(() => {
  if (!editingClipRecord.value?.clip) {
    return ''
  }

  if (editingClipRecord.value.laneType === 'variable') {
    return editingClipRecord.value.clip.formula ?? ''
  }

  return resolveClipFormula(editingClipRecord.value.clip, formulas.value)
})

const editingClipFormulaName = computed(() => {
  if (!editingClipRecord.value?.clip || editingClipRecord.value.laneType === 'variable') {
    return ''
  }

  return resolveClipFormulaName(editingClipRecord.value.clip, formulas.value)
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

const showFormulaDialogNameField = computed(() => editingClipRecord.value?.laneType !== 'variable')
const formulaDialogTitle = computed(() => {
  if (!editingClipId.value) {
    return 'Edit Library Formula'
  }

  return editingClipRecord.value?.laneType === 'variable'
    ? 'Edit Variable Formula'
    : 'Edit Clip Formula'
})
const mainLayoutStyle = computed(() => ({
  '--effects-width': effectsCollapsed.value ? '56px' : '304px',
  '--library-width': libraryCollapsed.value ? '56px' : '320px'
}))

async function handleStart() {
  await enableAudio()
}

function toggleLibraryCollapsed() {
  libraryCollapsed.value = !libraryCollapsed.value
}

function toggleEffectsCollapsed() {
  effectsCollapsed.value = !effectsCollapsed.value
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (!editingClipId.value) {
      dawStore.clearClipSelection()
      dawStore.clearAutomationPointSelection()
    }

    return
  }

  if (event.key !== 'Delete' && event.key !== 'Backspace') {
    return
  }

  if (editingClipId.value) {
    return
  }

  if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
    return
  }

  if (selectedAutomationPoint.value) {
    dawStore.removeAutomationPoint(
      selectedAutomationPoint.value.laneId,
      selectedAutomationPoint.value.index
    )
    return
  }

  if (!selectedClipIds.value.length && !selectedClipId.value) {
    return
  }

  if (selectedClipIds.value.length > 1) {
    dawStore.removeSelectedClips(selectedClipIds.value)
    return
  }

  if (selectedClipId.value) {
    dawStore.removeClip(selectedClipId.value)
  }
}

function handleGlobalContextMenu(event) {
  if (!(event.target instanceof Element)) {
    event.preventDefault()
    return
  }

  if (event.target.closest('input, textarea, [contenteditable="true"]')) {
    return
  }

  if (event.target.closest('[data-context-menu-enabled="true"]')) {
    return
  }

  event.preventDefault()
}

function handleContextMenuSelect(action, item) {
  if (action === 'add-track') {
    dawStore.addTrack(item.beforeTrackId ?? null)
    return
  }

  if (action === 'duplicate-track') {
    dawStore.duplicateTrack(item.trackId)
    return
  }

  if (action === 'edit-clip') {
    dawStore.setEditingClip(item.clipId)
    return
  }

  if (action === 'copy-clip') {
    dawStore.copyClip(item.clipId)
    return
  }

  if (action === 'create-clip-at-position') {
    dawStore.recordHistoryStep('create-clip-at-position', () => {
      dawStore.addClip(item.trackId, {
        duration: item.duration ?? 1,
        formula: '',
        formulaId: null,
        formulaName: null,
        start: item.start ?? 0
      })
    })
    return
  }

  if (action === 'create-variable-clip-at-position') {
    dawStore.recordHistoryStep('create-variable-clip-at-position', () => {
      dawStore.addVariableClip(item.variableTrackName, {
        duration: item.duration ?? 1,
        formula: '0',
        start: item.start ?? 0
      })
    })
    return
  }

  if (action === 'paste-clips') {
    dawStore.pasteClipboardAtPlayhead()
    return
  }

  if (action === 'delete-track') {
    confirmDialog.trackId = item.trackId
    confirmDialog.message = `Delete ${item.trackName ?? 'this track'}?`
    confirmDialog.visible = true
    return
  }

  if (action === 'delete-automation-lane') {
    dawStore.removeAutomationLane(item.laneId)
    return
  }

  if (action === 'delete-variable-track') {
    dawStore.removeVariableTrack(item.variableTrackName)
    return
  }

  if (action === 'add-clip-formula-to-library') {
    dawStore.addClipFormulaToLibrary(item.trackId, item.clipId)
    return
  }

  if (action === 'delete-clip') {
    dawStore.removeClip(item.clipId)
    return
  }

  if (action === 'detach-clip-formula') {
    dawStore.detachClipFormula(item.trackId, item.clipId)
    return
  }

  if (action === 'edit-track-presentation') {
    trackPresentationDialog.trackColor = item.trackColor ?? TRACK_COLOR_PALETTE[0]
    trackPresentationDialog.trackId = item.trackId
    trackPresentationDialog.trackName = item.trackName ?? ''
    trackPresentationDialog.visible = true
    return
  }
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

function closeTrackPresentationDialog() {
  trackPresentationDialog.trackColor = TRACK_COLOR_PALETTE[0]
  trackPresentationDialog.trackId = null
  trackPresentationDialog.trackName = ''
  trackPresentationDialog.visible = false
}

function confirmTrackPresentation(nextTrackPresentation) {
  if (trackPresentationDialog.trackId) {
    dawStore.updateTrackPresentation(trackPresentationDialog.trackId, nextTrackPresentation)
  }

  closeTrackPresentationDialog()
}

function closeFormulaDialog() {
  dawStore.setEditingClip(null)
  dawStore.setEditingFormula(null)
}

function evaluateFormulaDialog(nextDraft) {
  dawStore.ensureInitializedVariableTracks(nextDraft.variableInitializers)

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
    dawStore.recordHistoryStep('save-clip-formula', () => {
      dawStore.ensureInitializedVariableTracks(nextDraft.variableInitializers)
      dawStore.saveClipFormulaDraftAndName(editingClipId.value, nextDraft)
    })
    closeFormulaDialog()
    return
  }

  if (editingFormulaId.value) {
    dawStore.recordHistoryStep('save-library-formula', () => {
      dawStore.ensureInitializedVariableTracks(nextDraft.variableInitializers)
      dawStore.updateFormula(editingFormulaId.value, {
        code: nextDraft.code,
        name: nextDraft.name
      })
    })
    closeFormulaDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('contextmenu', handleGlobalContextMenu)
  disposeKeyboardShortcuts = initKeyboardShortcuts({
    dawStore,
    transport: transportPlayback
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('contextmenu', handleGlobalContextMenu)
  disposeKeyboardShortcuts?.()
  disposeKeyboardShortcuts = null
  void stop()
})
</script>

<style>
.app-main-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  transition: grid-template-columns 220ms ease;
}

@media (min-width: 1024px) {
  .app-main-layout {
    grid-template-columns: var(--library-width, 320px) minmax(0, 1fr);
  }
}

@media (min-width: 1280px) {
  .app-main-layout {
    grid-template-columns: var(--library-width, 320px) minmax(0, 1fr) var(--effects-width, 304px);
  }
}
</style>
