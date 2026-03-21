<template>
  <Panel as="header" padding="none">
    <div :class="toolbarLayoutClassName">
      <div :class="leftGroupClassName">
        <div class="shrink-0">
          <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
        </div>

        <Divider v-if="!compactLayout" />

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
            :icon="Download"
            label="Save JSON"
            size="sm"
            title="Download the current project as JSON"
            @click="handleProjectDownload"
          />
        </div>

        <Divider v-if="!compactLayout" />

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

      <div class="flex shrink-0 items-center justify-center gap-2 text-xs text-zinc-400">
        <IconButton
          :class="isValueTrackerRecording ? 'border-rose-400/70 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-rose-500/50 hover:text-rose-200'"
          label="Record"
          :title="isValueTrackerRecording
            ? 'Stop Value Tracker recording'
            : 'Record into the active Value Tracker track'"
          @click="toggleRecord"
        >
          <Circle class="h-4 w-4 fill-current" :stroke-width="2.25" />
        </IconButton>

        <IconButton
          :icon="Play"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing"
          label="Play"
          title="Start playback"
          @click="play"
        />

        <IconButton
          :icon="Pause"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing"
          label="Pause"
          title="Pause playback"
          @click="pause"
        />

        <IconButton
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing && time === 0"
          label="Stop"
          title="Stop playback"
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
            class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1"
            :title="bpmMeasureHint"
          >
            <input
              v-model="bpmDraft"
              class="w-14 bg-transparent text-right text-xs text-zinc-100 outline-none"
              inputmode="decimal"
              spellcheck="false"
              title="Set the target BPM. This rewrites the sample rate for the current unit."
              type="text"
              @blur="commitBpm"
              @keydown.enter.prevent="commitBpm"
              @keydown.esc.prevent="resetBpmDraft"
            >
            <span class="text-zinc-500">bpm</span>
            <span class="h-4 w-px bg-zinc-800" />
            <input
              v-model="bpmMeasureDraft"
              class="w-16 bg-transparent text-center font-mono text-xs text-zinc-100 outline-none"
              spellcheck="false"
              title="Set the BPM unit with t >> n or t / n"
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
              class="w-14 bg-transparent text-right text-xs text-zinc-100 outline-none"
              :max="MAX_SAMPLE_RATE"
              :min="MIN_SAMPLE_RATE"
              step="1"
              title="Set the playback sample rate"
              type="number"
              @blur="commitSampleRate"
              @keydown.enter.prevent="commitSampleRate"
              @keydown.esc.prevent="resetSampleRateDraft"
            >
            <span class="text-zinc-500">hz</span>
          </div>
        </div>

        <Divider v-if="!compactLayout" />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <IconButton
            v-if="compactLayout"
            :icon="BookOpen"
            :class="activeDrawer === 'library' ? 'border-sky-500/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'"
            label="Toggle Library"
            size="sm"
            :title="activeDrawer === 'library' ? 'Close the Library drawer' : 'Open the Library drawer'"
            @click="emit('toggle-library-drawer')"
          />

          <IconButton
            v-if="compactLayout"
            :icon="SlidersHorizontal"
            :class="activeDrawer === 'effects' ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'"
            label="Toggle Effects"
            size="sm"
            :title="activeDrawer === 'effects' ? 'Close the Effects drawer' : 'Open the Effects drawer'"
            @click="emit('toggle-effects-drawer')"
          />

          <button
            class="border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-default disabled:opacity-40"
            :disabled="exportingWav"
            :title="exportingWav ? 'Rendering the project to WAV' : 'Export the current project as WAV audio'"
            type="button"
            @click="handleWavExport"
          >
            {{ exportingWav ? 'Exporting...' : 'Export WAV' }}
          </button>

          <IconButton
            :icon="Settings2"
            label="Settings"
            size="sm"
            title="Open app settings"
            @click="settingsVisible = true"
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

    <SettingsModal :visible="settingsVisible" @close="settingsVisible = false" />
  </Panel>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { BookOpen, Circle, Download, FilePlus, FolderOpen, Pause, Play, Redo2, Repeat, Settings2, SlidersHorizontal, Square, Undo2 } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import {
  formatBpmValue,
  getBpmFromSampleRate,
  getSampleRateFromBpm,
  isBpmMeasureExpressionValid,
  normalizeBpmMeasureExpression,
  parseBpmMeasureExpression
} from '@/services/bpmService'
import { useDawStore } from '@/stores/dawStore'
import { downloadProjectWav } from '@/services/exportService'
import { downloadProjectFile, importProjectFile } from '@/services/projectPersistence'
import { enqueueSnackbar } from '@/services/notifications'
import { MAX_SAMPLE_RATE, MIN_SAMPLE_RATE, normalizeSampleRate } from '@/utils/audioSettings'
import { ticksToSamples } from '@/utils/timeUtils'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Divider from '@/components/ui/Divider.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'

const props = defineProps({
  activeDrawer: {
    type: String,
    default: null
  },
  compactLayout: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-effects-drawer', 'toggle-library-drawer'])

const dawStore = useDawStore()
const { play, pause, stop, toggleRecord } = useTransportPlayback()
const { bpmMeasure, canRedo, canUndo, isValueTrackerRecording, loopEnabled, playing, sampleRate, tickSize, time } = storeToRefs(dawStore)
const bpmDraft = ref(formatBpmValue(getBpmFromSampleRate(sampleRate.value, bpmMeasure.value)))
const bpmMeasureDraft = ref(bpmMeasure.value)
const projectFileInput = ref(null)
const sampleRateDraft = ref(String(sampleRate.value))
const settingsVisible = ref(false)
const exportingWav = ref(false)
const newProjectConfirmVisible = ref(false)
const transportDisplayMode = ref('sample')
const toolbarLayoutClassName = computed(() =>
  props.compactLayout
    ? 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'
    : 'flex items-center justify-between gap-4 px-4 py-1'
)
const leftGroupClassName = computed(() =>
  props.compactLayout
    ? 'flex min-w-0 flex-wrap items-center gap-3'
    : 'flex min-w-0 flex-1 items-center gap-4'
)
const rightGroupClassName = computed(() =>
  props.compactLayout
    ? 'flex min-w-0 flex-wrap items-center justify-end gap-3'
    : 'flex min-w-0 flex-1 items-center justify-end gap-4'
)

const transportSampleTime = computed(() => {
  const sampleTime = ticksToSamples(time.value, tickSize.value)

  if (!Number.isFinite(sampleTime)) {
    return 0
  }

  return Math.max(0, Math.floor(sampleTime))
})
const transportTime = computed(() => time.value.toFixed(2))
const transportDisplay = computed(() => {
  if (transportDisplayMode.value === 'ticks') {
    return `tick=${transportTime.value}`
  }

  if (transportDisplayMode.value === 'clock') {
    return formatTransportClock(transportSampleTime.value, sampleRate.value)
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
  formatBpmValue(getBpmFromSampleRate(sampleRate.value, bpmMeasure.value))
)
const bpmMeasureHint = computed(() => {
  const parsedMeasure = parseBpmMeasureExpression(bpmMeasure.value)

  if (!parsedMeasure) {
    return 'Set the BPM unit with t >> n or t / n'
  }

  return `Tempo derived from ${bpmMeasure.value}. In bytebeat mode the pattern wraps every 256 values, so one beat spans ${formatSampleCount(parsedMeasure.cycleSamples)} samples.`
})

watch(sampleRate, (nextSampleRate) => {
  sampleRateDraft.value = String(nextSampleRate)
  bpmDraft.value = bpmDisplay.value
})

watch(bpmMeasure, (nextBpmMeasure) => {
  bpmMeasureDraft.value = nextBpmMeasure
  bpmDraft.value = bpmDisplay.value
})

function triggerProjectOpen() {
  projectFileInput.value?.click()
}

function commitSampleRate() {
  dawStore.setSampleRate(sampleRateDraft.value)
  sampleRateDraft.value = String(sampleRate.value)
}

function commitBpm() {
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
  sampleRateDraft.value = String(sampleRate.value)
}

function resetBpmDraft() {
  bpmDraft.value = bpmDisplay.value
}

function resetBpmMeasureDraft() {
  bpmMeasureDraft.value = bpmMeasure.value
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

function handleProjectDownload() {
  downloadProjectFile(dawStore.$state)
}

async function handleNewProjectConfirm() {
  await stop()
  dawStore.resetToEmptyProject()
  newProjectConfirmVisible.value = false
}

async function handleWavExport() {
  if (exportingWav.value) {
    return
  }

  exportingWav.value = true

  try {
    await downloadProjectWav(dawStore.$state)
    enqueueSnackbar('WAV exported', { variant: 'success' })
  } catch (error) {
    enqueueSnackbar(
      error instanceof Error ? error.message : 'WAV export failed',
      { variant: 'error' }
    )
  } finally {
    exportingWav.value = false
  }
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
      await stop()
      dawStore.applyProject(project)
    } catch (error) {
      console.error('No se pudo abrir el proyecto', error)
    }
  } catch (error) {
    enqueueSnackbar('Invalid project file', { variant: 'error' })
  }
}
</script>
