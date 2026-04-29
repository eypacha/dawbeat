<template>
  <section
    v-if="sharedProjectLoadState === 'loading'"
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100"
  >
    <Panel class="w-full max-w-xl" padding="lg">
      <div class="space-y-3">
        <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Shared project</p>
        <h1 class="text-lg text-zinc-100">Loading snapshot...</h1>
      </div>
    </Panel>
  </section>

  <section
    v-else-if="sharedProjectLoadState === 'not-found'"
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100"
  >
    <Panel class="w-full max-w-xl" padding="lg">
      <div class="space-y-4">
        <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Shared project</p>
        <h1 class="text-xl text-zinc-100">Project not found</h1>
        <button
          class="mx-auto border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50"
          type="button"
          @click="goToDawHome"
        >
          Back to DawBeat
        </button>
      </div>
    </Panel>
  </section>

  <section
    v-else-if="sharedProjectLoadState === 'error'"
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100"
  >
    <Panel class="w-full max-w-xl" padding="lg">
      <div class="space-y-4">
        <p class="text-xs uppercase tracking-[0.22em] text-zinc-500">Shared project</p>
        <h1 class="text-xl text-zinc-100">Could not load shared project</h1>
        <p class="text-sm text-zinc-400">{{ sharedProjectLoadError }}</p>
        <button
          class="mx-auto border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50"
          type="button"
          @click="goToDawHome"
        >
          Back to DawBeat
        </button>
      </div>
    </Panel>
  </section>

  <section
    v-else-if="isMobileLayout"
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100"
  >
    <Panel class="w-full max-w-xl" padding="lg">
      <div class="mt-6 space-y-3 text-sm leading-6 text-zinc-300">
        <p>This web app is only available on desktop, but you can use your phone or tablet as a controller. Just scan the QR code by clicking the mobile icon on an automation track.</p>
      </div>
    </Panel>
  </section>

  <div v-else class="h-screen overflow-hidden bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
      <Toolbar />

      <main class="app-main-layout min-h-0 flex-1 gap-4 overflow-hidden" :style="mainLayoutStyle">
        <FormulaLibrary :collapsed="libraryCollapsed" @toggle-collapse="toggleLibraryCollapsed" />
        <Timeline />
        <EffectsPanel :collapsed="effectsCollapsed" @toggle-collapse="toggleEffectsCollapsed" />
      </main>

      <EvaluatedPanel
        v-if="showEvaluatedPanel"
        @inspect-expression="openFormulaInspectorFromEvaluatedPanel"
      />
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
        <AutomationCurveMenu
          v-if="item.action === 'set-automation-point-curve'"
          :options="item.options"
          :selected-curve="item.selectedCurve"
          @select="handleAutomationCurveSelect(item, $event, close)"
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
      :initial-left-value="editingFormulaLeftValue"
      :initial-right-value="editingFormulaRightValue"
      :initial-stereo="editingFormulaStereo"
      :initial-value="editingFormulaValue"
      :allow-stereo="showFormulaDialogStereoToggle"
      :show-name="showFormulaDialogNameField"
      :visible="isFormulaDialogVisible"
      label="Formula"
      :title="formulaDialogTitle"
      @close="closeFormulaDialog"
      @eval="evaluateFormulaDialog"
      @save="saveFormulaDialog"
    />

    <ValueTrackerClipEditorDialog
      :duration="editingValueTrackerClip?.duration ?? 1"
      :initial-held-value="editingValueTrackerInitialHeldValue"
      :initial-values="editingValueTrackerClip?.values ?? []"
      :playhead-step-index="editingValueTrackerPlayheadStepIndex"
      :step-subdivision="editingValueTrackerClip?.stepSubdivision ?? 4"
      :visible="isValueTrackerDialogVisible"
      @close="closeValueTrackerDialog"
      @update="updateValueTrackerDialog"
    />

    <TextInputDialog
      :initial-value="valueTrackerTrackNameDialog.trackName"
      label="Name"
      title="Rename Value Tracker"
      :visible="valueTrackerTrackNameDialog.visible"
      @cancel="closeValueTrackerTrackNameDialog"
      @confirm="confirmValueTrackerTrackName"
    />

    <TextInputDialog
      :initial-value="timelineSectionLabelDialog.labelName"
      label="Name"
      :title="timelineSectionLabelDialog.labelId ? 'Rename Section Label' : 'New Section Label'"
      :visible="timelineSectionLabelDialog.visible"
      @cancel="closeTimelineSectionLabelDialog"
      @confirm="confirmTimelineSectionLabel"
    />

    <TextInputDialog
      :initial-value="groupNameDialog.groupName"
      label="Name"
      title="Rename Group"
      :visible="groupNameDialog.visible"
      @cancel="closeGroupNameDialog"
      @confirm="confirmGroupName"
    />

    <ValueTrackerBindingDialog
      :initial-binding="valueTrackerTrackBindingDialog.binding"
      :track-name="valueTrackerTrackBindingDialog.trackName"
      :track-variable-name="valueTrackerTrackBindingDialog.trackVariableName"
      :visible="valueTrackerTrackBindingDialog.visible"
      @cancel="closeValueTrackerTrackBindingDialog"
      @confirm="confirmValueTrackerTrackBinding"
    />

    <AutomationBindingDialog
      :initial-binding="automationBindingSelectedLaneBinding"
      :lane="automationBindingSelectedLane"
      :visible="automationBindingDialogState.open"
      @cancel="closeAutomationBindingDialog"
      @confirm="confirmAutomationBinding"
    />

    <AutomationCompanionModal
      :lane="automationCompanionSelectedLane"
      :open="automationCompanionModalState.open"
      @close="closeAutomationCompanionModal"
    />

    <FormulaInspector
      :clip-id="formulaInspectorDialog.clipId"
      :expressions="formulaInspectorDialog.expressions"
      :open="formulaInspectorDialog.visible"
      @close="closeFormulaInspectorDialog"
    />

    <SnackbarContainer />
  </div>
</template>

<script setup>
import { computed, reactive, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import EffectsPanel from '@/components/effects/EffectsPanel.vue'
import EvaluatedPanel from '@/components/evaluated/EvaluatedPanel.vue'
import FormulaInspector from '@/components/ui/FormulaInspector.vue'
import AutomationCurveMenu from '@/components/timeline/AutomationCurveMenu.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TrackUnionOperatorMenu from '@/components/timeline/TrackUnionOperatorMenu.vue'
import Toolbar from '@/components/transport/Toolbar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import FormulaInputDialog from '@/components/ui/FormulaInputDialog.vue'
import AutomationBindingDialog from '@/components/ui/AutomationBindingDialog.vue'
import AutomationCompanionModal from '@/components/ui/AutomationCompanionModal.vue'
import Panel from '@/components/ui/Panel.vue'
import SnackbarContainer from '@/components/ui/SnackbarContainer.vue'
import TextInputDialog from '@/components/ui/TextInputDialog.vue'
import TrackPresentationDialog from '@/components/ui/TrackPresentationDialog.vue'
import ValueTrackerBindingDialog from '@/components/ui/ValueTrackerBindingDialog.vue'
import ValueTrackerClipEditorDialog from '@/components/ui/ValueTrackerClipEditorDialog.vue'
import { provideContextMenu } from '@/composables/useContextMenu'
import {
  automationBindingDialogState,
  closeAutomationBindingDialog
} from '@/services/automationBindingDialogService'
import {
  automationCompanionModalState,
  closeAutomationCompanionModal,
  disposeAutomationCompanionHost,
  installAutomationCompanionHost,
  syncAutomationCompanionHostControllersFromStore
} from '@/services/automationCompanionService'
import {
  getFormulaDraft,
  resolveClipFormulaDraft
} from '@/services/formulaService'
import { initKeyboardShortcuts } from '@/services/keyboardShortcuts'
import { disposeMidiClock, registerMidiClockTransport } from '@/services/midiClockService'
import { disposeMidiInput } from '@/services/midiInputService'
import { registerMidiTransportHandlers } from '@/services/midiTransportService'
import { getNextTimelineSectionLabelName } from '@/services/timelineSectionLabelService'
import { findTimelineClip } from '@/services/dawStoreService'
import { enqueueSnackbar } from '@/services/notifications'
import { getValueTrackerValueAtTime } from '@/services/valueTrackerService'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import { useLibraryStore } from '@/stores/libraryStore'
import { resolveClipFormula, resolveClipFormulaName } from '@/services/formulaService'
import { TRACK_COLOR_PALETTE } from '@/utils/colorUtils'

const dawStore = useDawStore()
const libraryStore = useLibraryStore()
const route = useRoute()
const router = useRouter()
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
const valueTrackerTrackNameDialog = reactive({
  trackId: null,
  trackName: '',
  visible: false
})
const valueTrackerTrackBindingDialog = reactive({
  binding: {},
  trackId: null,
  trackName: '',
  trackVariableName: '',
  visible: false
})
const formulaInspectorDialog = reactive({
  clipId: null,
  expressions: [],
  visible: false
})
const timelineSectionLabelDialog = reactive({
  labelId: null,
  labelName: '',
  labelTime: 0,
  visible: false
})
const groupNameDialog = reactive({
  groupId: null,
  groupName: '',
  visible: false
})
const valueTrackerDialogHistoryActive = ref(false)
let disposeKeyboardShortcuts = null
let disposeMidiClockTransport = null
let disposeMidiTransportHandlers = null
const transportPlayback = useTransportPlayback()
const { stop } = transportPlayback
const effectsCollapsed = ref(false)
const libraryCollapsed = ref(false)
const sharedProjectLoadState = ref('idle')
const sharedProjectLoadError = ref('')
const lastLoadedSharedSnapshotId = ref('')
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const {
  automationLanes,
  editingClipId,
  editingGroup,
  selectedAutomationPoint,
  selectedClipId,
  selectedClipIds,
  selectedTimelineSectionLabelId,
  showEvaluatedPanel,
  time,
  timelineSectionLabels,
  tracks,
  valueTrackerTracks,
  variableTracks
} = storeToRefs(dawStore)

const editingClipRecord = computed(() => {
  if (!editingClipId.value) {
    return null
  }

  return findTimelineClip(tracks.value, variableTracks.value, valueTrackerTracks.value, editingClipId.value)
})

const editingClipFormulaDraft = computed(() => {
  if (!editingClipRecord.value?.clip || editingClipRecord.value.laneType === 'valueTracker') {
    return getFormulaDraft()
  }

  if (editingClipRecord.value.laneType === 'variable') {
    return {
      code: editingClipRecord.value.clip.formula ?? '',
      leftCode: editingClipRecord.value.clip.formula ?? '',
      rightCode: editingClipRecord.value.clip.formula ?? '',
      stereo: false
    }
  }

  return resolveClipFormulaDraft(editingClipRecord.value.clip)
})

const editingValueTrackerClip = computed(() =>
  editingClipRecord.value?.laneType === 'valueTracker' ? editingClipRecord.value.clip : null
)
const editingValueTrackerInitialHeldValue = computed(() => {
  if (editingClipRecord.value?.laneType !== 'valueTracker') {
    return null
  }

  return getValueTrackerValueAtTime(
    editingClipRecord.value.clip.start,
    editingClipRecord.value.lane,
    null
  )
})
const editingValueTrackerPlayheadStepIndex = computed(() => {
  const clip = editingValueTrackerClip.value

  if (!clip) {
    return null
  }

  const stepSubdivision = Number(clip.stepSubdivision) || 1
  const clipEnd = Number(clip.start) + (Number(clip.duration) || 0)

  if (time.value < clip.start || time.value >= clipEnd) {
    return null
  }

  return Math.max(
    0,
    Math.min(
      Math.floor((time.value - clip.start) * stepSubdivision),
      Math.max(0, (clip.values?.length ?? 1) - 1)
    )
  )
})
const isFormulaDialogVisible = computed(
  () => Boolean(editingClipId.value && editingClipRecord.value?.laneType !== 'valueTracker')
)
const isValueTrackerDialogVisible = computed(
  () => Boolean(editingClipId.value && editingClipRecord.value?.laneType === 'valueTracker')
)

const editingFormulaValue = computed(() => editingClipFormulaDraft.value.code)

const editingFormulaLeftValue = computed(() => editingClipFormulaDraft.value.leftCode)

const editingFormulaRightValue = computed(() => editingClipFormulaDraft.value.rightCode)

const editingFormulaStereo = computed(() => editingClipFormulaDraft.value.stereo)

const editingFormulaName = computed(() => {
  if (editingClipRecord.value?.laneType !== 'track') {
    return ''
  }

  return editingClipRecord.value.clip?.formulaName ?? ''
})

const showFormulaDialogNameField = computed(() => editingClipRecord.value?.laneType === 'track')
const showFormulaDialogStereoToggle = computed(() => editingClipRecord.value?.laneType !== 'variable')
const formulaDialogTitle = computed(() => {
  return editingClipRecord.value?.laneType === 'variable'
    ? 'Edit Variable Formula'
    : 'Edit Clip Formula'
})
const isMobileLayout = computed(() => viewportWidth.value < 1280)
const automationCompanionSelectedLane = computed(() =>
  automationCompanionModalState.laneId
    ? dawStore.getAutomationLaneById(automationCompanionModalState.laneId)
    : null
)
const automationBindingSelectedLane = computed(() =>
  automationBindingDialogState.laneId
    ? dawStore.getAutomationLaneById(automationBindingDialogState.laneId)
    : null
)
const automationBindingSelectedLaneBinding = computed(() =>
  automationBindingSelectedLane.value?.binding ?? {}
)
const mainLayoutStyle = computed(() => ({
  '--effects-width': effectsCollapsed.value ? '56px' : '304px',
  '--library-width': libraryCollapsed.value ? '56px' : '280px'
}))

function syncViewportWidth() {
  if (typeof window === 'undefined') {
    return
  }

  viewportWidth.value = window.innerWidth
}

async function consumeSharedProjectRoute(snapshotId) {
  const currentRouteSnapshotId = typeof route.params.id === 'string'
    ? route.params.id.trim()
    : ''

  if (!snapshotId || currentRouteSnapshotId !== snapshotId) {
    return
  }

  await router.replace({ path: '/app' })
}

async function loadSharedProjectFromRoute(snapshotId) {
  const normalizedSnapshotId = typeof snapshotId === 'string' ? snapshotId.trim() : ''

  if (!normalizedSnapshotId) {
    sharedProjectLoadState.value = 'idle'
    sharedProjectLoadError.value = ''
    lastLoadedSharedSnapshotId.value = ''
    return
  }

  if (
    sharedProjectLoadState.value === 'ready' &&
    lastLoadedSharedSnapshotId.value === normalizedSnapshotId
  ) {
    return
  }

  sharedProjectLoadState.value = 'loading'
  sharedProjectLoadError.value = ''

  try {
    await stop()
    const result = await dawStore.loadSharedProject(normalizedSnapshotId)

    if (!result?.ok) {
      sharedProjectLoadState.value = 'not-found'
      return
    }

    lastLoadedSharedSnapshotId.value = normalizedSnapshotId
    sharedProjectLoadState.value = 'ready'
    await consumeSharedProjectRoute(normalizedSnapshotId)
  } catch (error) {
    console.error('Could not load shared snapshot', error)
    sharedProjectLoadState.value = 'error'
    sharedProjectLoadError.value = error instanceof Error
      ? error.message
      : 'Unexpected snapshot loading error.'
  }
}

function goToDawHome() {
  router.replace({ path: '/app' })
}

function toggleEffectsCollapsed() {
  effectsCollapsed.value = !effectsCollapsed.value
}

function toggleLibraryCollapsed() {
  libraryCollapsed.value = !libraryCollapsed.value
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (editingGroup.value) {
      dawStore.exitGroupEdit()
      return
    }

    if (!editingClipId.value) {
      dawStore.clearClipSelection()
      dawStore.clearAutomationPointSelection()
      dawStore.clearTimelineSectionLabelSelection()
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

  if (selectedTimelineSectionLabelId.value) {
    dawStore.removeTimelineSectionLabel(selectedTimelineSectionLabelId.value)
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
  if (action === 'add-to-library') {
    const clip = item.clip
    const draft = resolveClipFormulaDraft(clip)
    const displayFormula = resolveClipFormula(clip)
    const name = resolveClipFormulaName(clip) || displayFormula || 'Unnamed'
    const result = libraryStore.addItem({
      name,
      formula: draft.code,
      leftFormula: draft.leftCode,
      rightFormula: draft.rightCode,
      formulaStereo: draft.stereo,
      duration: clip.duration
    })

    if (!result?.added) {
      const duplicateMessage = result?.reason === 'duplicate-name'
        ? `"${name}" already exists in Library (same name)`
        : `"${name}" already exists in Library (same formula)`
      enqueueSnackbar(duplicateMessage, { variant: 'warning' })
      return
    }

    enqueueSnackbar(`"${name}" added to Library`, { variant: 'success' })
    return
  }

  if (action === 'add-track') {
    dawStore.addTrack(item.beforeTrackId ?? null, item.afterTrackId ?? null)
    return
  }

  if (action === 'duplicate-track') {
    dawStore.duplicateTrack(item.trackId)
    return
  }

  if (action === 'create-value-tracker-clip-at-position') {
    dawStore.recordHistoryStep('create-value-tracker-clip-at-position', () => {
      dawStore.addValueTrackerClip(item.valueTrackerTrackId, {
        duration: item.duration ?? 1,
        start: item.start ?? 0
      })
    })
    return
  }

  if (action === 'edit-clip') {
    dawStore.setEditingClip(item.clipId)
    return
  }

  if (action === 'open-formula-inspector') {
    if (item.clipId) {
      dawStore.selectClip(item.clipId)
      formulaInspectorDialog.clipId = item.clipId
      formulaInspectorDialog.expressions = []
      formulaInspectorDialog.visible = true
    }

    return
  }

  if (action === 'copy-clip') {
    dawStore.copyClip(item.clipId)
    return
  }

  if (action === 'split-clip') {
    dawStore.splitClip(item.clipId, item.splitTime)
    return
  }

  if (action === 'create-group-from-selection') {
    dawStore.createGroup(item?.clipIds ?? dawStore.selectedClipIds)
    return
  }

  if (action === 'edit-group') {
    dawStore.enterGroupEdit(item.groupId)
    return
  }

  if (action === 'rename-group') {
    groupNameDialog.groupId = item.groupId ?? null
    groupNameDialog.groupName = item.groupName ?? ''
    groupNameDialog.visible = true
    return
  }

  if (action === 'ungroup') {
    dawStore.ungroup(item.groupId)
    return
  }

  if (action === 'copy-group') {
    dawStore.copyGroup(item.groupId)
    return
  }

  if (action === 'delete-group') {
    dawStore.deleteGroup(item.groupId)
    return
  }

  if (action === 'create-clip-at-position') {
    dawStore.recordHistoryStep('create-clip-at-position', () => {
      dawStore.addClip(item.trackId, {
        duration: item.duration ?? 1,
        formula: '',
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
    const pasteTarget = {
      laneId: item?.pasteTargetLaneId ?? null,
      laneType: item?.pasteTargetLaneType ?? null
    }

    if (Number.isFinite(item?.start)) {
      dawStore.pasteClipboardAtTick(item.start, pasteTarget)
      return
    }

    dawStore.pasteClipboardAtPlayhead(pasteTarget)
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

  if (action === 'delete-automation-point') {
    dawStore.removeAutomationPoint(item.laneId, item.pointIndex)
    return
  }

  if (action === 'create-timeline-section-label') {
    timelineSectionLabelDialog.labelId = null
    timelineSectionLabelDialog.labelName = getNextTimelineSectionLabelName(timelineSectionLabels.value)
    timelineSectionLabelDialog.labelTime = item.time ?? 0
    timelineSectionLabelDialog.visible = true
    return
  }

  if (action === 'split-all') {
    dawStore.splitAllAtTime(item.time ?? 0)
    return
  }

  if (action === 'add-bar') {
    dawStore.addBarAtTime(item.time ?? 0, item.duration ?? 1)
    return
  }

  if (action === 'edit-timeline-section-label') {
    timelineSectionLabelDialog.labelId = item.labelId ?? null
    timelineSectionLabelDialog.labelName = item.labelName ?? ''
    timelineSectionLabelDialog.labelTime = item.time ?? 0
    timelineSectionLabelDialog.visible = true
    return
  }

  if (action === 'delete-timeline-section-label') {
    dawStore.removeTimelineSectionLabel(item.labelId)
    return
  }

  if (action === 'delete-variable-track') {
    dawStore.removeVariableTrack(item.variableTrackName)
    return
  }

  if (action === 'delete-value-tracker-track') {
    dawStore.removeValueTrackerTrack(item.valueTrackerTrackId)
    return
  }

  if (action === 'delete-clip') {
    dawStore.removeClip(item.clipId)
    return
  }

  if (action === 'edit-track-presentation') {
    trackPresentationDialog.trackColor = item.trackColor ?? TRACK_COLOR_PALETTE[0]
    trackPresentationDialog.trackId = item.trackId
    trackPresentationDialog.trackName = item.trackName ?? ''
    trackPresentationDialog.visible = true
    return
  }

  if (action === 'edit-value-tracker-track-name') {
    valueTrackerTrackNameDialog.trackId = item.valueTrackerTrackId ?? null
    valueTrackerTrackNameDialog.trackName = item.valueTrackerTrackName ?? ''
    valueTrackerTrackNameDialog.visible = true
    return
  }

  if (action === 'edit-value-tracker-track-binding') {
    valueTrackerTrackBindingDialog.binding = item.valueTrackerTrackBinding ?? {}
    valueTrackerTrackBindingDialog.trackId = item.valueTrackerTrackId ?? null
    valueTrackerTrackBindingDialog.trackName = item.valueTrackerTrackName ?? ''
    valueTrackerTrackBindingDialog.trackVariableName = item.valueTrackerTrackVariableName ?? ''
    valueTrackerTrackBindingDialog.visible = true
  }
}

function handleTrackUnionOperatorSelect(item, operator, close) {
  dawStore.setTrackUnionOperator(item.trackId, operator)
  close()
}

function handleAutomationCurveSelect(item, curve, close) {
  dawStore.setAutomationPointCurve(item.laneId, item.pointIndex, curve)
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

function closeValueTrackerTrackNameDialog() {
  valueTrackerTrackNameDialog.trackId = null
  valueTrackerTrackNameDialog.trackName = ''
  valueTrackerTrackNameDialog.visible = false
}

function confirmValueTrackerTrackName(nextName) {
  if (valueTrackerTrackNameDialog.trackId) {
    dawStore.renameValueTrackerTrack(valueTrackerTrackNameDialog.trackId, nextName)
  }

  closeValueTrackerTrackNameDialog()
}

function closeTimelineSectionLabelDialog() {
  timelineSectionLabelDialog.labelId = null
  timelineSectionLabelDialog.labelName = ''
  timelineSectionLabelDialog.labelTime = 0
  timelineSectionLabelDialog.visible = false
}

function closeGroupNameDialog() {
  groupNameDialog.groupId = null
  groupNameDialog.groupName = ''
  groupNameDialog.visible = false
}

function confirmGroupName(nextName) {
  if (groupNameDialog.groupId) {
    dawStore.renameGroup(groupNameDialog.groupId, nextName)
  }

  closeGroupNameDialog()
}

function confirmTimelineSectionLabel(nextName) {
  if (timelineSectionLabelDialog.labelId) {
    dawStore.renameTimelineSectionLabel(timelineSectionLabelDialog.labelId, nextName)
    closeTimelineSectionLabelDialog()
    return
  }

  dawStore.addTimelineSectionLabel({
    name: nextName,
    time: timelineSectionLabelDialog.labelTime
  })
  closeTimelineSectionLabelDialog()
}

function closeValueTrackerTrackBindingDialog() {
  valueTrackerTrackBindingDialog.binding = {}
  valueTrackerTrackBindingDialog.trackId = null
  valueTrackerTrackBindingDialog.trackName = ''
  valueTrackerTrackBindingDialog.trackVariableName = ''
  valueTrackerTrackBindingDialog.visible = false
}

function closeFormulaInspectorDialog() {
  formulaInspectorDialog.clipId = null
  formulaInspectorDialog.expressions = []
  formulaInspectorDialog.visible = false
}

function openFormulaInspectorFromEvaluatedPanel(expression) {
  const code = typeof expression?.code === 'string' ? expression.code.trim() : ''

  if (!code) {
    return
  }

  formulaInspectorDialog.clipId = null
  formulaInspectorDialog.expressions = [code]
  formulaInspectorDialog.visible = true
}

function confirmValueTrackerTrackBinding(nextBinding) {
  if (valueTrackerTrackBindingDialog.trackId) {
    dawStore.updateValueTrackerTrackBinding(valueTrackerTrackBindingDialog.trackId, nextBinding)
  }

  closeValueTrackerTrackBindingDialog()
}

function confirmAutomationBinding(nextBinding) {
  if (automationBindingDialogState.laneId) {
    dawStore.setAutomationLaneBinding(automationBindingDialogState.laneId, nextBinding)
  }

  closeAutomationBindingDialog()
}

function closeFormulaDialog() {
  dawStore.setEditingClip(null)
}

function closeValueTrackerDialog() {
  dawStore.setEditingClip(null)
}

watch(isValueTrackerDialogVisible, (visible) => {
  if (visible) {
    if (!valueTrackerDialogHistoryActive.value) {
      dawStore.beginHistoryTransaction('edit-value-tracker-clip')
      valueTrackerDialogHistoryActive.value = Boolean(dawStore.historyTransaction)
    }

    return
  }

  if (!valueTrackerDialogHistoryActive.value) {
    return
  }

  dawStore.commitHistoryTransaction()
  valueTrackerDialogHistoryActive.value = false
})

watch(automationCompanionSelectedLane, (lane) => {
  if (!automationCompanionModalState.open) {
    return
  }

  if (!lane) {
    closeAutomationCompanionModal()
  }
})

watch(automationBindingSelectedLane, (lane) => {
  if (!automationBindingDialogState.open) {
    return
  }

  if (!lane) {
    closeAutomationBindingDialog()
  }
})

watch(
  automationLanes,
  () => {
    syncAutomationCompanionHostControllersFromStore()
  },
  {
    deep: true
  }
)

function evaluateFormulaDialog(nextDraft) {
  dawStore.ensureInitializedValueTrackerTracks(nextDraft.valueTrackerInitializers)
  dawStore.ensureInitializedVariableTracks(nextDraft.variableInitializers)

  if (editingClipId.value) {
    dawStore.saveClipFormulaDraft(editingClipId.value, nextDraft)
  }
}

function saveFormulaDialog(nextDraft) {
  if (editingClipId.value) {
    dawStore.recordHistoryStep('save-clip-formula', () => {
      dawStore.ensureInitializedValueTrackerTracks(nextDraft.valueTrackerInitializers)
      dawStore.ensureInitializedVariableTracks(nextDraft.variableInitializers)
      dawStore.saveClipFormulaDraftAndName(editingClipId.value, nextDraft)
    })
    closeFormulaDialog()
  }
}

function updateValueTrackerDialog(nextDraft) {
  if (!editingClipId.value) {
    return
  }

  dawStore.saveValueTrackerClipDraft(editingClipId.value, nextDraft)
}

onMounted(() => {
  installAutomationCompanionHost(dawStore)
  void loadSharedProjectFromRoute(route.params.id)
  syncViewportWidth()
  window.addEventListener('resize', syncViewportWidth)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('contextmenu', handleGlobalContextMenu)
  disposeMidiClockTransport = registerMidiClockTransport(transportPlayback)
  disposeMidiTransportHandlers = registerMidiTransportHandlers({
    play: transportPlayback.play,
    stop: transportPlayback.stop,
    loop: () => dawStore.toggleLoop(),
    record: transportPlayback.toggleRecord
  })
  disposeKeyboardShortcuts = initKeyboardShortcuts({
    dawStore,
    transport: transportPlayback
  })
})

watch(
  () => route.params.id,
  (snapshotId) => {
    void loadSharedProjectFromRoute(snapshotId)
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewportWidth)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('contextmenu', handleGlobalContextMenu)
  disposeKeyboardShortcuts?.()
  disposeKeyboardShortcuts = null
  disposeMidiClockTransport?.()
  disposeMidiClockTransport = null
  disposeMidiTransportHandlers?.()
  disposeMidiTransportHandlers = null
  disposeAutomationCompanionHost()
  disposeMidiClock()
  disposeMidiInput()
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
    grid-template-columns: var(--library-width, 280px) minmax(0, 1fr) var(--effects-width, 304px);
  }
}

@media (min-width: 1280px) {
  .app-main-layout {
    grid-template-columns: var(--library-width, 280px) minmax(0, 1fr) var(--effects-width, 304px);
  }
}
</style>
