<template>
  <svg
    v-if="waveformPath"
    class="timeline-clip-waveform pointer-events-none absolute inset-x-1 inset-y-1 z-0"
    :viewBox="`0 0 ${svgWidth} ${SVG_HEIGHT}`"
    preserveAspectRatio="none"
  >
    <line
      class="timeline-clip-waveform__baseline"
      :x1="0"
      :x2="svgWidth"
      :y1="SVG_HEIGHT / 2"
      :y2="SVG_HEIGHT / 2"
    />
    <path class="timeline-clip-waveform__path" :d="waveformPath" />
  </svg>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { renderFormulaWaveform } from '@/services/formulaWaveformService'
import { getActiveVariableDefinitions, prependVariableDefinitions } from '@/services/variableTrackService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToSamples } from '@/utils/timeUtils'

const MAX_PREVIEW_POINTS = 192
const MIN_PREVIEW_POINTS = 24
const MIN_VISIBLE_WIDTH = 12
const SVG_HEIGHT = 32
const WAVEFORM_AMPLITUDE = SVG_HEIGHT * 0.38

const props = defineProps({
  duration: {
    type: Number,
    required: true
  },
  formula: {
    type: String,
    required: true
  },
  start: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  }
})

const dawStore = useDawStore()
const { evalEffects, sampleRate, tickSize, valueTrackerLiveInputs, valueTrackerTracks, variableTracks } = storeToRefs(dawStore)
const waveformSamples = ref(null)

let requestVersion = 0

const svgWidth = computed(() => Math.max(1, Math.round(props.width)))
const previewPointCount = computed(() =>
  Math.max(MIN_PREVIEW_POINTS, Math.min(MAX_PREVIEW_POINTS, Math.round(props.width * 1.5)))
)
const renderableFormula = computed(() =>
  prependVariableDefinitions(
    props.formula,
    getActiveVariableDefinitions(
      props.start,
      variableTracks.value,
      valueTrackerTracks.value,
      valueTrackerLiveInputs.value
    )
  ) ?? props.formula
)

const waveformPath = computed(() => {
  if (!waveformSamples.value?.length) {
    return ''
  }

  const centerY = SVG_HEIGHT / 2
  const lastIndex = Math.max(1, waveformSamples.value.length - 1)

  return waveformSamples.value.reduce((path, sample, index) => {
    const x = (index / lastIndex) * svgWidth.value
    const y = centerY - Math.max(-1, Math.min(1, sample)) * WAVEFORM_AMPLITUDE
    const command = index === 0 ? 'M' : 'L'

    return `${path}${command}${x.toFixed(2)},${y.toFixed(2)}`
  }, '')
})

watch(
  () => ({
    duration: props.duration,
    evalEffectsKey: JSON.stringify(evalEffects.value),
    formula: renderableFormula.value,
    sampleRate: sampleRate.value,
    start: props.start,
    tickSize: tickSize.value,
    width: props.width
  }),
  async ({ duration, formula, sampleRate: nextSampleRate, start, tickSize: nextTickSize, width }) => {
    const nextRequestVersion = requestVersion + 1
    requestVersion = nextRequestVersion

    if (!formula.trim() || width < MIN_VISIBLE_WIDTH || duration <= 0) {
      waveformSamples.value = null
      return
    }

    try {
      const startSample = ticksToSamples(start, nextTickSize)
      const endSample = ticksToSamples(start + duration, nextTickSize)
      const waveform = await renderFormulaWaveform({
        endSample,
        evalEffects: evalEffects.value,
        formula,
        sampleCount: previewPointCount.value,
        sampleRate: nextSampleRate,
        startSample
      })

      if (requestVersion !== nextRequestVersion) {
        return
      }

      waveformSamples.value = waveform
    } catch {
      if (requestVersion !== nextRequestVersion) {
        return
      }

      waveformSamples.value = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  requestVersion += 1
})
</script>

<style scoped>
.timeline-clip-waveform__baseline {
  stroke: color-mix(in srgb, var(--track-color-light) 24%, transparent);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.timeline-clip-waveform__path {
  fill: none;
  stroke: color-mix(in srgb, var(--track-color-light) 78%, white 22%);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}
</style>
