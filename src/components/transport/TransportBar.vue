<template>
  <Panel as="header" class="px-4 py-2" padding="none">
    <Toolbar gap="lg" wrap>
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">DawBeat</p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
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

        <Divider />
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

        <Divider />
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

        <IconButton
          :icon="Settings2"
          label="Settings"
          size="sm"
          @click="settingsVisible = true"
        />

      </div>
    </Toolbar>

    <input
      ref="projectFileInput"
      accept="application/json,.json"
      class="sr-only"
      type="file"
      @change="handleProjectFileChange"
    >

    <SettingsModal :visible="settingsVisible" @close="settingsVisible = false" />
  </Panel>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Download, FolderOpen, Pause, Play, Repeat, Settings2, Square } from 'lucide-vue-next'
import { useTransportPlayback } from '@/composables/useTransportPlayback'
import { useDawStore } from '@/stores/dawStore'
import { downloadProjectFile, importProjectFile } from '@/services/projectPersistence'
import { enqueueSnackbar } from '@/services/notifications'
import Divider from '@/components/ui/Divider.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'
import Toolbar from '@/components/ui/Toolbar.vue'

const dawStore = useDawStore()
const { play, pause, stop } = useTransportPlayback()
const { loopEnabled, playing, sampleRate, time } = storeToRefs(dawStore)
const projectFileInput = ref(null)
const sampleRateDraft = ref(String(sampleRate.value))
const settingsVisible = ref(false)

const transportTime = computed(() => `${time.value.toFixed(2)} ticks`)

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
