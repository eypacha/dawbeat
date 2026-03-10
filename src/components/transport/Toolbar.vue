<template>
  <Panel as="header" padding="none">
    <div class="flex items-center justify-between gap-4 px-4 py-1">
      <div class="flex min-w-0 flex-1 items-center gap-4">
        <div class="shrink-0">
          <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
        </div>

        <Divider />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <IconButton
            :icon="FilePlus"
            label="New Project"
            size="sm"
            @click="newProjectConfirmVisible = true"
          />

          <IconButton
            :icon="FolderOpen"
            label="Open JSON"
            size="sm"
            @click="triggerProjectOpen"
          />

          <IconButton
            :icon="Download"
            label="Save JSON"
            size="sm"
            @click="handleProjectDownload"
          />
        </div>

        <Divider />

        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <IconButton
            :icon="Undo2"
            :class="canUndo ? 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
            :disabled="!canUndo"
            label="Undo"
            @click="dawStore.undo()"
          />

          <IconButton
            :icon="Redo2"
            :class="canRedo ? 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
            :disabled="!canRedo"
            label="Redo"
            @click="dawStore.redo()"
          />
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
        <IconButton
          :icon="Play"
          :class="playing ? 'border-zinc-800 bg-zinc-950 text-zinc-600' : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'"
          :disabled="playing"
          label="Play"
          @click="play"
        />

        <IconButton
          :icon="Pause"
          :class="playing ? 'border-sky-400/60 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing"
          label="Pause"
          @click="pause"
        />

        <IconButton
          :class="playing ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-600'"
          :disabled="!playing && time === 0"
          label="Stop"
          @click="stop"
        >
          <Square class="h-4 w-4 fill-current" :stroke-width="2.25" />
        </IconButton>

        <IconButton
          :icon="Repeat"
          :class="loopEnabled ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'"
          label="Loop"
          @click="dawStore.toggleLoop()"
        />
      </div>

      <div class="flex min-w-0 flex-1 items-center justify-end gap-4">
        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span class="border border-zinc-800 bg-zinc-950 px-3 py-1">{{ transportTime }}</span>
          <div class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1">
            <input
              v-model="sampleRateDraft"
              class="w-14 bg-transparent text-right text-xs text-zinc-100 outline-none"
              max="44100"
              min="256"
              step="1"
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
            type="button"
            @click="handleWavExport"
          >
            {{ exportingWav ? 'Exporting...' : 'Export WAV' }}
          </button>

          <IconButton
            :icon="Settings2"
            label="Settings"
            size="sm"
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
import { Download, FilePlus, FolderOpen, Pause, Play, Redo2, Repeat, Settings2, Square, Undo2 } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import { downloadProjectWav } from '@/services/exportService'
import { downloadProjectFile, importProjectFile } from '@/services/projectPersistence'
import { enqueueSnackbar } from '@/services/notifications'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Divider from '@/components/ui/Divider.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'

const dawStore = useDawStore()
const { play, pause, stop } = useTransportPlayback()
const { canRedo, canUndo, loopEnabled, playing, sampleRate, time } = storeToRefs(dawStore)
const projectFileInput = ref(null)
const sampleRateDraft = ref(String(sampleRate.value))
const settingsVisible = ref(false)
const exportingWav = ref(false)
const newProjectConfirmVisible = ref(false)

const transportTime = computed(() => time.value.toFixed(2))

watch(sampleRate, (nextSampleRate) => {
  sampleRateDraft.value = String(nextSampleRate)
})

function triggerProjectOpen() {
  projectFileInput.value?.click()
}

function commitSampleRate() {
  dawStore.setSampleRate(sampleRateDraft.value)
  sampleRateDraft.value = String(sampleRate.value)
}

function resetSampleRateDraft() {
  sampleRateDraft.value = String(sampleRate.value)
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
