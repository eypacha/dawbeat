<template>
  <svg
    v-if="waveformPath"
    class="timeline-clip-waveform pointer-events-none absolute inset-x-1 inset-y-1 z-0"
    :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
    preserveAspectRatio="none"
  >
    <line
      class="timeline-clip-waveform__baseline"
      :x1="0"
      :x2="svgWidth"
      :y1="svgHeight / 2"
      :y2="svgHeight / 2"
    />
    <path class="timeline-clip-waveform__path" :d="waveformPath" />
  </svg>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { renderFormulaWaveformSegments } from '@/services/formulaWaveformService'
import {
  collectFormulaReferencedVariableNames,
  getActiveVariableDefinitions,
  getVariableDefinitionChangeTicksInRange,
  prependVariableDefinitions
} from '@/services/variableTrackService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToSamples } from '@/utils/timeUtils'

const MAX_PREVIEW_POINTS = 192
const MIN_PREVIEW_POINTS = 24
const MIN_VISIBLE_WIDTH = 12
const MIN_WAVEFORM_HEIGHT = 16
const WAVEFORM_HEIGHT_INSET = 2

const props = defineProps({
  duration: {
    type: Number,
    required: true
  },
  formula: {
    type: String,
    required: true
  },
  height: {
    type: Number,
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
const { evalEffects, sampleRate, tickSize, valueTrackerTracks, variableTracks } = storeToRefs(dawStore)
const waveformSamples = ref(null)

let requestVersion = 0

const svgWidth = computed(() => Math.max(1, Math.round(props.width)))
const svgHeight = computed(() =>
  Math.max(
    MIN_WAVEFORM_HEIGHT,
    Math.round(Number(props.height) || 0) - WAVEFORM_HEIGHT_INSET * 2
  )
)
const waveformAmplitude = computed(() => Math.max(4, svgHeight.value * 0.38))
const previewPointCount = computed(() =>
  Math.max(MIN_PREVIEW_POINTS, Math.min(MAX_PREVIEW_POINTS, Math.round(props.width * 1.5)))
)
const referencedVariableNames = computed(() =>
  collectFormulaReferencedVariableNames(
    props.formula,
    variableTracks.value,
    valueTrackerTracks.value
  )
)
const waveformSegments = computed(() =>
  getRenderableWaveformSegments({
    duration: props.duration,
    formula: props.formula,
    referencedVariableNames: referencedVariableNames.value,
    start: props.start,
    tickSize: tickSize.value,
    valueTrackerTracks: valueTrackerTracks.value,
    variableTracks: variableTracks.value
  })
)

const waveformPath = computed(() => {
  if (!waveformSamples.value?.length) {
    return ''
  }

  const centerY = svgHeight.value / 2
  const lastIndex = Math.max(1, waveformSamples.value.length - 1)

  return waveformSamples.value.reduce((path, sample, index) => {
    const x = (index / lastIndex) * svgWidth.value
    const y = centerY - Math.max(-1, Math.min(1, sample)) * waveformAmplitude.value
    const command = index === 0 ? 'M' : 'L'

    return `${path}${command}${x.toFixed(2)},${y.toFixed(2)}`
  }, '')
})

watch(
  () => ({
    duration: props.duration,
    evalEffectsKey: JSON.stringify(evalEffects.value),
    segmentsKey: JSON.stringify(waveformSegments.value),
    sampleRate: sampleRate.value,
    width: props.width
  }),
  async ({ duration, sampleRate: nextSampleRate, width }) => {
    const nextRequestVersion = requestVersion + 1
    requestVersion = nextRequestVersion

    if (!waveformSegments.value.length || width < MIN_VISIBLE_WIDTH || duration <= 0) {
      waveformSamples.value = null
      return
    }

    try {
      const waveform = await renderFormulaWaveformSegments({
        evalEffects: evalEffects.value,
        sampleCount: previewPointCount.value,
        sampleRate: nextSampleRate,
        segments: waveformSegments.value
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

function getRenderableWaveformSegments({
  duration,
  formula,
  referencedVariableNames,
  start,
  tickSize,
  valueTrackerTracks,
  variableTracks
}) {
  const trimmedFormula = typeof formula === 'string' ? formula.trim() : ''
  const clipStart = Number(start)
  const clipDuration = Number(duration)
  const clipEnd = clipStart + clipDuration

  if (!trimmedFormula || !Number.isFinite(clipStart) || !Number.isFinite(clipDuration) || clipDuration <= 0) {
    return []
  }

  const changeTicks = getVariableDefinitionChangeTicksInRange(
    clipStart,
    clipEnd,
    variableTracks,
    valueTrackerTracks,
    referencedVariableNames
  )
  const boundaries = [clipStart, ...changeTicks, clipEnd]
  const referencedVariableNameSet = new Set(referencedVariableNames)
  const segments = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStartTick = boundaries[index]
    const segmentEndTick = boundaries[index + 1]

    if (!(segmentEndTick > segmentStartTick)) {
      continue
    }

    const variableDefinitions = getActiveVariableDefinitions(
      segmentStartTick,
      variableTracks,
      valueTrackerTracks,
      {}
    ).filter((variableDefinition) =>
      !referencedVariableNameSet.size || referencedVariableNameSet.has(variableDefinition.name)
    )
    const renderableFormula = prependVariableDefinitions(trimmedFormula, variableDefinitions) ?? trimmedFormula
    const segmentStartSample = ticksToSamples(segmentStartTick, tickSize)
    const segmentEndSample = ticksToSamples(segmentEndTick, tickSize)
    const previousSegment = segments[segments.length - 1]

    if (
      previousSegment &&
      previousSegment.formula === renderableFormula &&
      previousSegment.endSample === segmentStartSample
    ) {
      previousSegment.endSample = segmentEndSample
      continue
    }

    segments.push({
      endSample: segmentEndSample,
      formula: renderableFormula,
      startSample: segmentStartSample
    })
  }

  return segments
}
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
