<template>
  <article class="overflow-hidden rounded border border-sky-500/20 bg-zinc-950/70">
    <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
      <div class="min-w-0">
        <p class="text-[10px] uppercase tracking-[0.24em] text-sky-200/75">Formula Preview</p>
        <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{{ previewSummary }}</p>
      </div>
    </div>

    <div
      class="grid gap-px bg-zinc-800"
      :class="displayChannels.length > 1 ? 'xl:grid-cols-2' : 'grid-cols-1'"
    >
      <section
        v-for="channel in displayChannels"
        :key="channel.id"
        class="min-w-0 bg-zinc-950/85"
      >
        <div class="border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {{ channel.label }}
        </div>

        <div class="relative px-3 py-3">
          <svg
            class="block h-24 w-full"
            :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
            preserveAspectRatio="none"
          >
            <line
              :x1="0"
              :x2="SVG_WIDTH"
              :y1="SVG_HEIGHT / 2"
              :y2="SVG_HEIGHT / 2"
              stroke="rgba(56, 189, 248, 0.18)"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
            <path
              :d="channel.path"
              fill="none"
              stroke="rgba(125, 211, 252, 0.96)"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.6"
              vector-effect="non-scaling-stroke"
            />
          </svg>

          <div
            v-if="!hasActiveFormula"
            class="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-600"
          >
            No active formula
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getActiveFormula } from '@/engine/timelineEngine'
import { applyEvalEffects } from '@/services/evalEffectService'
import { renderFormulaWaveformChannels } from '@/services/formulaWaveformService'
import { useDawStore } from '@/stores/dawStore'
import { clamp, ticksToSamples } from '@/utils/timeUtils'

const MAX_PREVIEW_SPAN_SAMPLES = 8192
const MIN_PREVIEW_SPAN_SAMPLES = 1024
const PREVIEW_SAMPLE_COUNT = 192
const PREVIEW_WINDOW_SECONDS = 0.5
const PREVIEW_WINDOW_STEP_DIVISOR = 2
const SVG_HEIGHT = 96
const SVG_WIDTH = 1000
const WAVEFORM_AMPLITUDE = SVG_HEIGHT * 0.34

const channelWaveforms = ref([])

let requestVersion = 0

const dawStore = useDawStore()
const {
  evalEffects,
  formulas,
  sampleRate,
  tickSize,
  time,
  tracks,
  valueTrackerLiveInputs,
  valueTrackerTracks,
  variableTracks
} = storeToRefs(dawStore)

const activeFormula = computed(() =>
  getActiveFormula(
    time.value,
    tracks.value,
    formulas.value,
    variableTracks.value,
    valueTrackerTracks.value,
    valueTrackerLiveInputs.value
  )
)
const evaluatedExpressions = computed(() => {
  if (typeof activeFormula.value !== 'string' || !activeFormula.value.trim()) {
    return []
  }

  return applyEvalEffects(activeFormula.value, evalEffects.value)
    .filter((expression) => typeof expression === 'string' && expression.trim())
})
const hasActiveFormula = computed(() => evaluatedExpressions.value.length > 0)
const renderExpressions = computed(() => hasActiveFormula.value ? evaluatedExpressions.value : ['0'])
const previewSpanSamples = computed(() =>
  clamp(
    Math.round((Number(sampleRate.value) || 0) * PREVIEW_WINDOW_SECONDS),
    MIN_PREVIEW_SPAN_SAMPLES,
    MAX_PREVIEW_SPAN_SAMPLES
  )
)
const previewStartSample = computed(() => {
  const currentSample = Number.isFinite(Number(time.value))
    ? ticksToSamples(time.value, tickSize.value)
    : 0
  const step = Math.max(128, Math.floor(previewSpanSamples.value / PREVIEW_WINDOW_STEP_DIVISOR))

  return Math.max(0, Math.floor(currentSample / step) * step)
})
const previewEndSample = computed(() => previewStartSample.value + previewSpanSamples.value)
const previewSummary = computed(() => {
  const channelLabel = channelWaveforms.value.length > 1 ? 'Stereo' : 'Mono'
  const sampleLabel = `${previewStartSample.value}-${previewEndSample.value}`

  if (!hasActiveFormula.value) {
    return `Idle · ${channelLabel}`
  }

  return `${channelLabel} · t ${sampleLabel}`
})
const displayChannels = computed(() => {
  const waveforms = channelWaveforms.value.length
    ? channelWaveforms.value
    : [new Float32Array(PREVIEW_SAMPLE_COUNT)]

  return waveforms.map((waveform, index) => ({
    id: waveforms.length > 1 ? (index === 0 ? 'left' : 'right') : 'mono',
    label: waveforms.length > 1 ? (index === 0 ? 'L. Channel' : 'R. Channel') : 'Channel',
    path: buildWaveformPath(waveform)
  }))
})

watch(
  () => ({
    endSample: previewEndSample.value,
    expressionsKey: JSON.stringify(renderExpressions.value),
    sampleRate: sampleRate.value,
    startSample: previewStartSample.value
  }),
  async ({ endSample, sampleRate: nextSampleRate, startSample }) => {
    const nextRequestVersion = requestVersion + 1
    requestVersion = nextRequestVersion

    try {
      const waveforms = await renderFormulaWaveformChannels({
        endSample,
        expressions: renderExpressions.value,
        sampleCount: PREVIEW_SAMPLE_COUNT,
        sampleRate: nextSampleRate,
        startSample
      })

      if (requestVersion !== nextRequestVersion) {
        return
      }

      channelWaveforms.value = Array.isArray(waveforms) ? waveforms : []
    } catch {
      if (requestVersion !== nextRequestVersion) {
        return
      }

      channelWaveforms.value = []
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  requestVersion += 1
})

function buildWaveformPath(waveform) {
  if (!waveform?.length) {
    return buildFlatPath()
  }

  const centerY = SVG_HEIGHT / 2
  const lastIndex = Math.max(1, waveform.length - 1)

  return waveform.reduce((path, sample, index) => {
    const x = (index / lastIndex) * SVG_WIDTH
    const y = centerY - clamp(sample, -1, 1) * WAVEFORM_AMPLITUDE
    const command = index === 0 ? 'M' : 'L'

    return `${path}${command}${x.toFixed(2)},${y.toFixed(2)}`
  }, '')
}

function buildFlatPath() {
  const centerY = SVG_HEIGHT / 2
  return `M0,${centerY}L${SVG_WIDTH},${centerY}`
}
</script>
