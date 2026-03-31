<template>
  <Modal :open="visible" size="md" title="Export" @close="emit('close')">
    <div class="space-y-5">
      <!-- Format -->
      <div class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Format</p>
        <div class="flex gap-2">
          <button
            v-for="fmt in FORMATS"
            :key="fmt.value"
            class="flex-1 border py-2 text-[11px] uppercase tracking-[0.2em] transition"
            :class="
              format === fmt.value
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
            "
            type="button"
            @click="format = fmt.value"
          >
            {{ fmt.label }}
          </button>
        </div>
      </div>

      <!-- Render mode -->
      <div class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Render</p>
        <div class="flex gap-2">
          <button
            v-for="mode in MODES"
            :key="mode.value"
            class="flex-1 border py-2 text-[11px] uppercase tracking-[0.2em] transition"
            :class="
              renderMode === mode.value
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
            "
            type="button"
            @click="renderMode = mode.value"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Loop count -->
      <div v-if="renderMode === 'loop'" class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Loop count
        </p>
        <div class="flex items-center gap-3">
          <input
            v-model.number="loopCount"
            class="w-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            min="1"
            max="999"
            step="1"
            type="number"
          />
          <span class="shrink-0 text-xs text-zinc-500">
            {{ loopCount === 1 ? 'pass' : 'passes' }}
          </span>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Format settings</p>

        <div v-if="format === 'wav'" class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Sample rate</span>
            <select
              v-model="wavSampleRate"
              class="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 focus:border-zinc-600"
            >
              <option
                v-for="option in wavSampleRateOptions"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Bit depth</span>
            <select
              v-model="wavBitDepth"
              class="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 focus:border-zinc-600"
            >
              <option
                v-for="option in WAV_EXPORT_BIT_DEPTH_OPTIONS"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Sample rate</span>
            <select
              v-model="mp3SampleRate"
              class="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 focus:border-zinc-600"
            >
              <option
                v-for="option in mp3SampleRateOptions"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Bitrate</span>
            <select
              v-model="mp3Bitrate"
              class="mt-2 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-zinc-700 focus:border-zinc-600"
            >
              <option
                v-for="option in MP3_EXPORT_BITRATE_OPTIONS"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <p class="text-xs text-zinc-500">
          <span v-if="format === 'wav'">WAV exports can be written as PCM or 32-bit float.</span>
          <span v-else>MP3 exports use constant bitrate encoding.</span>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-default disabled:opacity-40"
          type="button"
          :disabled="isExporting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="border w-[100px] h-[29px] border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-indigo-200 transition hover:border-indigo-400/70 hover:bg-indigo-500/20 disabled:cursor-default disabled:opacity-40"
          :disabled="isExporting"
          type="button"
          @click="handleExport"
        >
          <span v-if="!isExporting">Export</span>
          <span v-else class="flex items-center justify-center">
            <LoaderCircle class="h-3.5 w-3.5 animate-spin" :stroke-width="2.25" />
          </span>
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import {
  DEFAULT_MP3_EXPORT_OPTIONS,
  DEFAULT_WAV_EXPORT_OPTIONS,
  MP3_EXPORT_BITRATE_OPTIONS,
  MP3_EXPORT_SAMPLE_RATE_OPTIONS,
  normalizeMp3ExportOptions,
  normalizeWavExportOptions,
  WAV_EXPORT_BIT_DEPTH_OPTIONS,
  WAV_EXPORT_SAMPLE_RATE_OPTIONS
} from '@/services/exportSettingsService'
import Modal from '@/components/ui/Modal.vue'

const FORMATS = [
  { label: 'WAV', value: 'wav' },
  { label: 'MP3', value: 'mp3' }
]

const MODES = [
  { label: 'Full render', value: 'full' },
  { label: 'Loop', value: 'loop' }
]

const props = defineProps({
  exporting: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'export'])

const format = ref('wav')
const renderMode = ref('full')
const loopCount = ref(2)
const wavSampleRate = ref(DEFAULT_WAV_EXPORT_OPTIONS.sampleRate)
const wavBitDepth = ref(DEFAULT_WAV_EXPORT_OPTIONS.bitDepth)
const mp3SampleRate = ref(DEFAULT_MP3_EXPORT_OPTIONS.sampleRate)
const mp3Bitrate = ref(DEFAULT_MP3_EXPORT_OPTIONS.bitrate)
const localExporting = ref(false)
const isExporting = computed(() => props.exporting || localExporting.value)
const wavSampleRateOptions = computed(() => WAV_EXPORT_SAMPLE_RATE_OPTIONS)
const mp3SampleRateOptions = computed(() => MP3_EXPORT_SAMPLE_RATE_OPTIONS)

watch(
  () => props.exporting,
  (exporting) => {
    if (!exporting) {
      localExporting.value = false
    }
  }
)

async function handleExport() {
  if (isExporting.value) return

  // Lock immediately in this component so the click feedback is instant.
  localExporting.value = true

  // Yield one UI frame so disabled/progress state is painted before heavy export starts.
  await nextTick()
  await waitForUiPaint()

  emit('export', {
    format: format.value,
    loopCount: renderMode.value === 'loop' ? Math.max(1, loopCount.value) : 1,
    options: resolveExportOptions()
  })
}

function resolveExportOptions() {
  if (format.value === 'mp3') {
    return normalizeMp3ExportOptions({
      bitrate: mp3Bitrate.value,
      sampleRate: mp3SampleRate.value
    })
  }

  return normalizeWavExportOptions({
    bitDepth: wavBitDepth.value,
    sampleRate: wavSampleRate.value
  })
}

function waitForUiPaint() {
  return new Promise((resolve) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    }, 0)
  })
}
</script>
