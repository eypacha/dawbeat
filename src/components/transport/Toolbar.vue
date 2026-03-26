<template>
  <Panel as="header" padding="none">
    <div :class="toolbarLayoutClassName">
      <div :class="leftGroupClassName">
        <div class="shrink-0">
          <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
        </div>

        <Divider />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <IconButton
            :icon="FilePlus"
            label="New Project"
            size="sm"
            title="Create a new empty project"
            @click="newProjectConfirmVisible = true"
          />

          <IconButton
            :icon="FolderOpen"
            label="Open JSON"
            size="sm"
            title="Open a project from a JSON file"
            @click="triggerProjectOpen"
          />

          <IconButton
            :icon="Shuffle"
            label="Shuffle Demo"
            size="sm"
            title="Load a random bundled demo project"
            @click="shuffleDemoConfirmVisible = true"
          />

          <IconButton
            :icon="Download"
            label="Save JSON"
            size="sm"
            title="Download the current project as JSON"
            @click="handleProjectDownload"
          />

          <IconButton
            :icon="Share"
            label="Share"
            size="sm"
            title="Compartir proyecto (nombre, descripción)"
            @click="projectInfoDialogVisible = true"
          />

          <div class="flex w-44 items-center px-1 py-1">
            <button
              v-if="!isEditingProjectTitle"
              class="w-full truncate text-left text-xs text-zinc-300 transition hover:text-zinc-100"
              type="button"
              title="Project title used for JSON and audio export filenames"
              @click="beginProjectTitleEdit"
            >
              {{ projectTitle }}
            </button>

            <input
              v-else
              ref="projectTitleInput"
              v-model="projectTitleDraft"
              class="w-full border-b border-zinc-700 bg-transparent text-xs text-zinc-100 outline-none"
              spellcheck="false"
              title="Project title used for JSON and audio export filenames"
              type="text"
              @blur="commitProjectTitle"
              @keydown.enter.prevent="commitProjectTitle"
              @keydown.esc.prevent="resetProjectTitleDraft"
            >
          </div>


          <span
            v-if="isSharedProject"
            class="border border-emerald-700/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200"
            title="This project was loaded from a shared snapshot"
          >
            Shared project
          </span>
        </div>

        <Divider />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <IconButton
            :icon="Undo2"
            :class="canUndo ? 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
            :disabled="!canUndo"
            label="Undo"
            title="Undo the last change"
            @click="dawStore.undo()"
          />

          <IconButton
            :icon="Redo2"
            :class="canRedo ? 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
            :disabled="!canRedo"
            label="Redo"
            title="Redo the last undone change"
            @click="dawStore.redo()"
          />
        </div>
      </div>

      <div :class="transportControlsGroupClassName">
        <IconButton
          :class="recordButtonActive ? 'border-rose-400/70 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-rose-500/50 hover:text-rose-200'"
          :disabled="recordButtonDisabled"
          label="Record"
          :title="recordButtonTitle"
          @click="toggleRecord"
        >
          <Circle class="h-4 w-4 fill-current" :stroke-width="2.25" />
        </IconButton>

        <IconButton
          :icon="Play"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing || transportControlsLocked"
          label="Play"
          :title="transportControlTitle('Start playback')"
          @click="play"
        />

        <IconButton
          :icon="Pause"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing || transportControlsLocked"
          label="Pause"
          :title="transportControlTitle('Pause playback')"
          @click="pause"
        />

        <IconButton
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="transportControlsLocked || (!playing && time === 0)"
          label="Stop"
          :title="transportControlTitle('Stop playback')"
          @click="stop"
        >
          <Square class="h-4 w-4 fill-current" :stroke-width="2.25" />
        </IconButton>

        <IconButton
          :icon="Repeat"
          :class="loopEnabled ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'"
          label="Loop"
          :title="loopEnabled ? 'Disable loop playback' : 'Enable loop playback'"
          @click="dawStore.toggleLoop()"
        />

        <Dropdown
          :items="transportOptions"
          @select="handleTransportOptionSelect"
        >
          <template #trigger>
            <IconButton
              :icon="EllipsisVertical"
              class="border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
              label="Transport options"
              title="More transport options"
            />
          </template>
        </Dropdown>
      </div>

      <div :class="rightGroupClassName">
        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button
            class="border border-zinc-800 w-25 bg-zinc-950 px-3 py-1 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
            type="button"
            :title="transportDisplayHint"
            @click="cycleTransportDisplayMode"
          >
            {{ transportDisplay }}
          </button>
          <div
            v-if="midiClockEnabled"
            class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em]"
            :title="midiClockStatusHint"
          >
            <span :class="midiClockLocked ? 'text-emerald-300' : 'text-amber-300'">Clock</span>
            <span class="text-zinc-400">{{ midiClockStatusLabel }}</span>
          </div>
          <div
            class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1"
            :title="bpmMeasureHint"
          >
            <input
              v-model="bpmDraft"
              :class="['w-14 bg-transparent text-right text-xs text-zinc-100 outline-none', midiClockControlsLocked ? 'cursor-not-allowed text-zinc-500' : '']"
              :readonly="midiClockControlsLocked"
              inputmode="decimal"
              spellcheck="false"
              :title="midiClockControlsLocked
                ? 'Tempo is currently locked to external MIDI Clock.'
                : 'Set the target BPM. This rewrites the sample rate for the current unit.'"
              type="text"
              @blur="commitBpm"
              @keydown.enter.prevent="commitBpm"
              @keydown.esc.prevent="resetBpmDraft"
            >
            <span class="text-zinc-500">bpm</span>
            <span class="h-4 w-px bg-zinc-800" />
            <input
              v-model="bpmMeasureDraft"
              :class="['w-16 bg-transparent text-center font-mono text-xs text-zinc-100 outline-none', midiClockControlsLocked ? 'cursor-not-allowed text-zinc-500' : '']"
              :readonly="midiClockControlsLocked"
              spellcheck="false"
              :title="midiClockControlsLocked
                ? 'BPM unit is currently locked to external MIDI Clock.'
                : 'Set the BPM unit with t >> n or t / n'"
              type="text"
              @blur="commitBpmMeasure"
              @keydown.enter.prevent="commitBpmMeasure"
              @keydown.esc.prevent="resetBpmMeasureDraft"
            >
          </div>
          <div
            class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1"
            title="Set the playback sample rate"
          >
            <input
              v-model="sampleRateDraft"
              :class="['w-14 bg-transparent text-right text-xs text-zinc-100 outline-none', midiClockControlsLocked ? 'cursor-not-allowed text-zinc-500' : '']"
              :max="MAX_SAMPLE_RATE"
              :min="MIN_SAMPLE_RATE"
              :readonly="midiClockControlsLocked"
              step="any"
              :title="midiClockControlsLocked
                ? 'Sample rate is currently locked to external MIDI Clock.'
                : 'Set the playback sample rate'"
              type="number"
              @blur="commitSampleRate"
              @keydown.enter.prevent="commitSampleRate"
              @keydown.esc.prevent="resetSampleRateDraft"
            >
            <span class="text-zinc-500">hz</span>
          </div>
        </div>

        <Divider />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button
            class="border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-default disabled:opacity-40"
            :disabled="exportingWav"
            :title="exportingWav ? 'Rendering the project…' : 'Export the current project'"
            type="button"
            @click="exportModalVisible = true"
          >
            <span v-if="!exportingWav">Export</span>
            <span v-else class="flex items-center justify-center">
              <LoaderCircle class="h-3.5 w-3.5 animate-spin" :stroke-width="2.25" />
            </span>
          </button>

          <IconButton
            :icon="Settings2"
            label="Settings"
            size="sm"
            title="Open app settings"
            @click="settingsVisible = true"
          />

          <IconButton
            :icon="Info"
            label="About"
            size="sm"
            title="About DawBeat"
            @click="aboutVisible = true"
          />
        </div>
      </div>
    </div>

    <input
      ref="projectFileInput"
      accept="application/json,.json"
      class="sr-only"
      type="file"
      @change="handleProjectFileChange"
    >

    <ConfirmDialog
      confirm-label="Create New"
      :message="'Current project changes will be replaced. Start a new empty project?'"
      title="New Project"
      :visible="newProjectConfirmVisible"
      @cancel="newProjectConfirmVisible = false"
      @confirm="handleNewProjectConfirm"
    />

    <ConfirmDialog
      confirm-label="Load Demo"
      :message="'Current project changes will be replaced. Load a random demo project?'"
      title="Shuffle Demo"
      :visible="shuffleDemoConfirmVisible"
      @cancel="shuffleDemoConfirmVisible = false"
      @confirm="handleRandomDemoProjectConfirm"
    />

    <SettingsModal :visible="settingsVisible" @close="settingsVisible = false" />

    <AboutModal :visible="aboutVisible" @close="aboutVisible = false" />

    <ExportModal
      :exporting="exportingWav"
      :visible="exportModalVisible"
      @close="exportModalVisible = false"
      @export="handleExport"
    />

    <ProjectInfoDialog
      :description="projectDescription"
      :name="projectTitle"
      :author="projectAuthor"
      :license="dawStore.projectLicense"
      :shared="dawStore.shared"
      :shareUrl="shareUrl"
      :open="projectInfoDialogVisible"
      @update:open="projectInfoDialogVisible = $event"
      @save="handleSaveProjectInfo"
      @share="handleShareProjectInfo"
    />
  </Panel>
</template>

<script setup>
const shareUrl = ref('')
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Circle, Download, EllipsisVertical, FilePlus, FolderOpen, Info, LoaderCircle, Pause, Play, Redo2, Repeat, Settings2, Shuffle, Square, Undo2, Share } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { automationCompanionHostState } from '@/services/automationCompanionService'
import { getRandomDemoProjectEntry } from '@/services/demoProjectService'
import {
  formatBpmValue,
  getBpmFromSampleRate,
  getSampleRateFromBpm,
  isBpmMeasureExpressionValid,
  normalizeBpmMeasureExpression,
  parseBpmMeasureExpression
} from '@/services/bpmService'
import { midiClockState } from '@/services/midiClockService'
import { useDawStore } from '@/stores/dawStore'
import { downloadProjectMp3, downloadProjectWav } from '@/services/exportService'
import ExportModal from '@/components/ui/ExportModal.vue'
import { downloadProjectFile, importProjectFile } from '@/services/projectPersistence'
import { enqueueSnackbar } from '@/services/notifications'
import { MAX_SAMPLE_RATE, MIN_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { SNAP_SUBDIVISION_OPTIONS } from '@/utils/timeUtils'
import { ticksToSamples } from '@/utils/timeUtils'
import AboutModal from '@/components/ui/AboutModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Divider from '@/components/ui/Divider.vue'
import Dropdown from '@/components/ui/Dropdown.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'
import ProjectInfoDialog from '@/components/ui/ProjectInfoDialog.vue'

const dawStore = useDawStore()
const { play, pause, stop, toggleRecord } = useTransportPlayback()
const { automationRecordingArmed, bpmMeasure, canRedo, canUndo, isValueTrackerRecording, loopEnabled, playing, projectTitle, projectDescription, projectAuthor, sampleRate, sharedProjectMeta, snapSubdivision, snapToGridEnabled, tickSize, time, timelineAutoscrollEnabled } = storeToRefs(dawStore)
const bpmDraft = ref(formatBpmValue(getBpmFromSampleRate(sampleRate.value, bpmMeasure.value)))
const bpmMeasureDraft = ref(bpmMeasure.value)
const projectTitleDraft = ref(projectTitle.value)
const projectDescriptionDraft = ref(projectDescription.value)
const projectTitleInput = ref(null)
const isEditingProjectTitle = ref(false)
const projectFileInput = ref(null)
const sampleRateDraft = ref(String(sampleRate.value))
const aboutVisible = ref(false)
const settingsVisible = ref(false)
const exportingWav = ref(false)
const exportModalVisible = ref(false)
const newProjectConfirmVisible = ref(false)
const shuffleDemoConfirmVisible = ref(false)
const sharingProject = ref(false)
const lastShuffledDemoProjectId = ref(null)
const transportDisplayMode = ref('sample')
const projectInfoDialogVisible = ref(false)
const toolbarLayoutClassName = 'grid grid-cols-[max-content_minmax(0,1fr)_max-content_minmax(0,1fr)_max-content] items-center gap-4 px-4 py-1'
const leftGroupClassName = 'col-[1] flex min-w-0 items-center gap-4'
const transportControlsGroupClassName = 'col-[3] flex shrink-0 items-center justify-center gap-2 text-xs text-zinc-400'
const rightGroupClassName = 'col-[5] flex min-w-0 items-center justify-end gap-4'

const transportSampleTime = computed(() => {
  const sampleTime = ticksToSamples(time.value, tickSize.value)

  if (!Number.isFinite(sampleTime)) {
    return 0
  }

  return Math.max(0, Math.floor(sampleTime))
})
const transportTime = computed(() => time.value.toFixed(2))
const midiClockEnabled = computed(() => midiClockState.enabled)
const midiClockLocked = computed(() =>
  midiClockState.enabled && midiClockState.locked && Number.isFinite(midiClockState.effectiveSampleRate)
)
const midiClockControlsLocked = computed(() => midiClockLocked.value)
const transportControlsLocked = computed(() => midiClockLocked.value)
const displayedSampleRate = computed(() => {
  if (midiClockLocked.value) {
    return midiClockState.effectiveSampleRate
  }

  return sampleRate.value
})
const transportDisplay = computed(() => {
  if (transportDisplayMode.value === 'ticks') {
    return `tick=${transportTime.value}`
  }

  if (transportDisplayMode.value === 'clock') {
    return formatTransportClock(transportSampleTime.value, displayedSampleRate.value)
  }

  return `t=${transportSampleTime.value}`
})
const transportDisplayHint = computed(() => {
  if (transportDisplayMode.value === 'ticks') {
    return 'Click to show elapsed time'
  }

  if (transportDisplayMode.value === 'clock') {
    return 'Click to show t'
  }

  return 'Click to show raw ticks'
})
const bpmDisplay = computed(() =>
  midiClockLocked.value && Number.isFinite(midiClockState.externalBpm)
    ? formatBpmValue(midiClockState.externalBpm)
    : formatBpmValue(getBpmFromSampleRate(sampleRate.value, bpmMeasure.value))
)
const bpmMeasureHint = computed(() => {
  if (midiClockLocked.value) {
    const sourceName = midiClockState.syncSourceName || 'external MIDI Clock'
    return `Tempo is locked to ${sourceName}. BPM, unit and sample rate are read-only until sync is released.`
  }

  const parsedMeasure = parseBpmMeasureExpression(bpmMeasure.value)

  if (!parsedMeasure) {
    return 'Set the BPM unit with t >> n or t / n'
  }

  return `Tempo derived from ${bpmMeasure.value}. In bytebeat mode the pattern wraps every 256 values, so one beat spans ${formatSampleCount(parsedMeasure.cycleSamples)} samples.`
})
const midiClockStatusLabel = computed(() => {
  if (!midiClockEnabled.value) {
    return ''
  }

  if (!midiClockLocked.value) {
    return 'Waiting'
  }

  const bpmLabel = formatBpmValue(midiClockState.externalBpm)
  return midiClockState.running ? `${bpmLabel} bpm / Run` : `${bpmLabel} bpm / Stop`
})
const midiClockStatusHint = computed(() => {
  if (!midiClockEnabled.value) {
    return ''
  }

  const sourceName = midiClockState.syncSourceName || 'No input selected'

  if (!midiClockLocked.value) {
    return `Waiting for MIDI Clock from ${sourceName}.`
  }

  return `${sourceName} is driving the transport at ${formatBpmValue(midiClockState.externalBpm)} bpm.`
})
const hasAutomationCompanionControllers = computed(() => automationCompanionHostState.controllers.length > 0)
const isSharedProject = computed(() => sharedProjectMeta.value?.source === 'shared')
const recordButtonActive = computed(() => isValueTrackerRecording.value || automationRecordingArmed.value)
const recordButtonDisabled = computed(() =>
  hasAutomationCompanionControllers.value
    ? false
    : midiClockLocked.value && !playing.value && !isValueTrackerRecording.value
)
const recordButtonTitle = computed(() => {
  if (isValueTrackerRecording.value) {
    return 'Stop Value Tracker recording'
  }

  if (hasAutomationCompanionControllers.value) {
    return automationRecordingArmed.value
      ? 'Stop writing phone controller moves into automation lanes'
      : 'Arm automation writing for phone controllers'
  }

  if (recordButtonDisabled.value) {
    return 'Start the external MIDI transport before recording.'
  }

  return 'Record into the active Value Tracker track'
})
const transportOptions = computed(() => ([
  {
    action: 'toggle-autoscroll',
    checked: timelineAutoscrollEnabled.value,
    label: 'Autoscroll'
  },
  {
    action: 'toggle-snap-to-grid',
    checked: snapToGridEnabled.value,
    label: 'Snap to grid'
  },
  {
    action: 'snap-subdivision-submenu',
    disabled: !snapToGridEnabled.value,
    label: 'Snap amount',
    children: SNAP_SUBDIVISION_OPTIONS.map((subdivision) => ({
      action: 'set-snap-subdivision',
      checked: snapSubdivision.value === subdivision,
      label: formatSnapSubdivisionLabel(subdivision),
      subdivision
    }))
  },
  {
    action: 'zoom-submenu',
    label: 'Zoom',
    children: [
      {
        action: 'zoom-to-loop',
        label: 'Zoom to loop'
      },
      {
        action: 'zoom-to-fit-project',
        label: 'Zoom to fit project'
      },
      {
        action: 'reset-zoom',
        label: 'Reset zoom'
      }
    ]
  }
]))

watch([sampleRate, bpmMeasure, midiClockLocked, () => midiClockState.effectiveSampleRate, () => midiClockState.externalBpm], () => {
  sampleRateDraft.value = formatSampleRateValue(displayedSampleRate.value)
  bpmDraft.value = bpmDisplay.value
  bpmMeasureDraft.value = bpmMeasure.value
})

watch(projectTitle, () => {
  if (isEditingProjectTitle.value) {
    return
  }

  projectTitleDraft.value = projectTitle.value
})

function triggerProjectOpen() {
  projectFileInput.value?.click()
}

function commitSampleRate() {
  if (midiClockControlsLocked.value) {
    sampleRateDraft.value = formatSampleRateValue(displayedSampleRate.value)
    return
  }

  dawStore.setSampleRate(sampleRateDraft.value)
  sampleRateDraft.value = formatSampleRateValue(sampleRate.value)
}

function commitBpm() {
  if (midiClockControlsLocked.value) {
    bpmDraft.value = bpmDisplay.value
    return
  }

  const rawTargetSampleRate = getSampleRateFromBpm(bpmDraft.value, bpmMeasure.value)

  if (!rawTargetSampleRate) {
    enqueueSnackbar('Invalid BPM value. Use a number greater than 0.', {
      variant: 'error'
    })
    bpmDraft.value = bpmDisplay.value
    return
  }

  const normalizedTargetSampleRate = normalizeSampleRate(rawTargetSampleRate, sampleRate.value)
  dawStore.setSampleRate(normalizedTargetSampleRate)
  sampleRateDraft.value = String(sampleRate.value)
  bpmDraft.value = bpmDisplay.value

  if (rawTargetSampleRate < MIN_SAMPLE_RATE || rawTargetSampleRate > MAX_SAMPLE_RATE) {
    enqueueSnackbar(
      `That BPM needs a sample rate outside ${MIN_SAMPLE_RATE}-${MAX_SAMPLE_RATE} hz. Using ${normalizedTargetSampleRate} hz instead.`,
      { variant: 'warning' }
    )
  }
}

function commitBpmMeasure() {
  if (midiClockControlsLocked.value) {
    bpmMeasureDraft.value = bpmMeasure.value
    return
  }

  if (!isBpmMeasureExpressionValid(bpmMeasureDraft.value)) {
    enqueueSnackbar('Invalid BPM unit. Use t >> n or t / n.', {
      variant: 'error'
    })
    bpmMeasureDraft.value = bpmMeasure.value
    return
  }

  dawStore.setBpmMeasure(bpmMeasureDraft.value)
  bpmMeasureDraft.value = normalizeBpmMeasureExpression(bpmMeasure.value)
}

function resetSampleRateDraft() {
  sampleRateDraft.value = formatSampleRateValue(displayedSampleRate.value)
}

function resetBpmDraft() {
  bpmDraft.value = bpmDisplay.value
}

function resetBpmMeasureDraft() {
  bpmMeasureDraft.value = bpmMeasure.value
}

function commitProjectTitle() {
  dawStore.setProjectTitle(projectTitleDraft.value)
  projectTitleDraft.value = projectTitle.value
  isEditingProjectTitle.value = false
}

function resetProjectTitleDraft() {
  projectTitleDraft.value = projectTitle.value
  isEditingProjectTitle.value = false
}

async function beginProjectTitleEdit() {
  projectTitleDraft.value = projectTitle.value
  isEditingProjectTitle.value = true
  await nextTick()
  projectTitleInput.value?.focus()
  projectTitleInput.value?.select()
}

function commitProjectDescription() {
  dawStore.setProjectDescription(projectDescriptionDraft.value)
}

function resetProjectDescriptionDraft() {
  projectDescriptionDraft.value = projectDescription.value
}

function handleSaveProjectInfo(data) {
  dawStore.setProjectTitle(data.name)
  dawStore.setProjectDescription(data.description)
  dawStore.setProjectAuthor(data.author)
  dawStore.setProjectLicense(data.license)
  projectInfoDialogVisible.value = false
}

async function handleShareProjectInfo() {
  console.log('[SHARE] Share button clicked')
  try {
    console.log('[SHARE] Calling dawStore.shareProject()')
    const { shareUrl: url, snapshotId, reused } = await dawStore.shareProject()
    console.log('[SHARE] shareProject() result:', { url, snapshotId, reused })
    shareUrl.value = url
    dawStore.shared = true
    if (reused) {
      console.log('[SHARE] Project already existed, reused snapshotId:', snapshotId)
    } else {
      console.log('[SHARE] New project shared, new snapshotId:', snapshotId)
    }
    console.log('[SHARE] Final share URL:', url)
  } catch (err) {
    console.error('[SHARE] Error sharing project:', err)
  }
}

function cycleTransportDisplayMode() {
  if (transportDisplayMode.value === 'sample') {
    transportDisplayMode.value = 'ticks'
    return
  }

  if (transportDisplayMode.value === 'ticks') {
    transportDisplayMode.value = 'clock'
    return
  }

  transportDisplayMode.value = 'sample'
}

function handleTransportOptionSelect(item) {
  if (!item?.action) {
    return
  }

  if (item.action === 'toggle-autoscroll') {
    dawStore.setTimelineAutoscrollEnabled(!timelineAutoscrollEnabled.value)
    return
  }

  if (item.action === 'toggle-snap-to-grid') {
    dawStore.setSnapToGridEnabled(!snapToGridEnabled.value)
    return
  }

  if (item.action === 'set-snap-subdivision') {
    dawStore.setSnapSubdivision(item.subdivision)
    return
  }

  if (item.action === 'zoom-to-loop') {
    window.dispatchEvent(new CustomEvent('dawbeat:timeline-zoom-command', {
      detail: { command: 'zoom-to-loop' }
    }))
    return
  }

  if (item.action === 'zoom-to-fit-project') {
    window.dispatchEvent(new CustomEvent('dawbeat:timeline-zoom-command', {
      detail: { command: 'zoom-to-fit-project' }
    }))
    return
  }

  if (item.action === 'reset-zoom') {
    window.dispatchEvent(new CustomEvent('dawbeat:timeline-zoom-command', {
      detail: { command: 'reset-zoom' }
    }))
  }
}

function formatSnapSubdivisionLabel(subdivision) {
  if (subdivision === 1) {
    return '1'
  }

  return `1/${subdivision}`
}

function formatTransportClock(sampleTime, currentSampleRate) {
  const normalizedSampleTime = Number(sampleTime)
  const normalizedSampleRate = Number(currentSampleRate)

  if (!Number.isFinite(normalizedSampleTime) || !Number.isFinite(normalizedSampleRate) || normalizedSampleRate <= 0) {
    return '00:00:000'
  }

  const totalMilliseconds = Math.floor((normalizedSampleTime / normalizedSampleRate) * 1000)
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const milliseconds = totalMilliseconds % 1000

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}

function formatSampleCount(value) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/\.?0+$/, '')
}

function formatSampleRateValue(value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return '0'
  }

  if (Number.isInteger(normalizedValue)) {
    return String(normalizedValue)
  }

  return normalizedValue
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}

function transportControlTitle(defaultTitle) {
  return transportControlsLocked.value
    ? 'Transport is currently controlled by external MIDI Clock.'
    : defaultTitle
}

function handleProjectDownload() {
  downloadProjectFile(dawStore.$state)
}

// Safari loses the user-gesture context after any async await, so navigator.clipboard.writeText
// called after a network request will always throw on Safari. Instead we start a ClipboardItem
// write synchronously (preserving the gesture) and resolve it with the actual text later.
function startDeferredClipboardWrite() {
  if (typeof ClipboardItem === 'undefined' || !navigator?.clipboard?.write) {
    return null
  }

  let resolveBlob
  const blobPromise = new Promise((resolve) => {
    resolveBlob = resolve
  })
  const writePromise = navigator.clipboard
    .write([new ClipboardItem({ 'text/plain': blobPromise })])
    .then(() => true)
    .catch(() => false)

  return { writePromise, resolveBlob }
}

async function copyTextToClipboard(value) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return false
    }
  }

  return false
}

async function handleShareProject() {
  if (sharingProject.value) {
    return
  }

  sharingProject.value = true

  try {
    // Initiate the clipboard write synchronously before any await so Safari keeps the user gesture.
    const deferred = startDeferredClipboardWrite()

    console.log('[SHARE] Calling dawStore.shareProject() from handleShareProject')
    const { shareUrl, snapshotId, reused } = await dawStore.shareProject()
    console.log('[SHARE] shareProject() result:', { shareUrl, snapshotId, reused })

    let copied = false

    if (deferred) {
      deferred.resolveBlob(new Blob([shareUrl], { type: 'text/plain' }))
      copied = await deferred.writePromise
    }

    if (!copied) {
      copied = await copyTextToClipboard(shareUrl)
    }

    if (reused) {
      console.log('[SHARE] Project already existed, reused snapshotId:', snapshotId)
      enqueueSnackbar(copied ? 'Link to existing snapshot copied' : `This project was already shared. URL: ${shareUrl}`,
        {
          variant: copied ? 'info' : 'info',
          duration: copied ? undefined : null
        }
      )
    } else {
      console.log('[SHARE] New project shared, new snapshotId:', snapshotId)
      enqueueSnackbar(copied ? 'Link to new snapshot copied' : `New share URL: ${shareUrl}`,
        {
          variant: copied ? 'success' : 'success',
          duration: copied ? undefined : null
        }
      )
    }
    console.log('[SHARE] Final share URL:', shareUrl)
  } catch (error) {
    console.error('[SHARE] Could not create shared snapshot', error)
    enqueueSnackbar('Could not create a share link.', { variant: 'error' })
  } finally {
    sharingProject.value = false
  }
}

async function applyIncomingProject(project) {
  await stop()
  dawStore.applyProject(project)
}

async function handleNewProjectConfirm() {
  await stop()
  dawStore.resetToEmptyProject()
  lastShuffledDemoProjectId.value = null
  newProjectConfirmVisible.value = false
}

async function handleRandomDemoProject() {
  const demoProjectEntry = getRandomDemoProjectEntry({
    excludeId: lastShuffledDemoProjectId.value
  })

  if (!demoProjectEntry) {
    enqueueSnackbar('No bundled demo projects are available.', { variant: 'warning' })
    return
  }

  try {
    await applyIncomingProject(demoProjectEntry.project)
    lastShuffledDemoProjectId.value = demoProjectEntry.id
    enqueueSnackbar(`Loaded demo: ${demoProjectEntry.name}`, { variant: 'success' })
  } catch (error) {
    console.error('Could not load the demo project', error)
    enqueueSnackbar('Could not load the selected demo project.', { variant: 'error' })
  }
}

async function handleRandomDemoProjectConfirm() {
  shuffleDemoConfirmVisible.value = false
  await handleRandomDemoProject()
}

async function handleExport({ format, loopCount }) {
  if (exportingWav.value) {
    return
  }

  exportingWav.value = true

  // Let Vue flush state and the browser paint the progress bar before heavy export work.
  await nextTick()
  await waitForAnimationFrame()

  try {
    if (format === 'mp3') {
      await downloadProjectMp3(dawStore.$state, { loopCount })
      enqueueSnackbar('MP3 exported', { variant: 'success' })
    } else {
      await downloadProjectWav(dawStore.$state, { loopCount })
      enqueueSnackbar('WAV exported', { variant: 'success' })
    }
    exportModalVisible.value = false
  } catch (error) {
    enqueueSnackbar(
      error instanceof Error ? error.message : 'Export failed',
      { variant: 'error' }
    )
  } finally {
    exportingWav.value = false
  }
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })
}

async function handleProjectFileChange(event) {
  const [file] = event.target.files ?? []
  event.target.value = ''

  if (!file) {
    return
  }

  try {
    const project = await importProjectFile(file)

    try {
      await applyIncomingProject(project)
      lastShuffledDemoProjectId.value = null
    } catch (error) {
      console.error('Could not open the project', error)
      enqueueSnackbar('Could not open the project.', { variant: 'error' })
    }
  } catch (error) {
    enqueueSnackbar('Invalid project file', { variant: 'error' })
  }
}
</script>
