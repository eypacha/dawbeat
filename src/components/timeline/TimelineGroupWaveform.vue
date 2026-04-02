<template>
  <div
    v-if="renderedWaveformRuns.length"
    class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
  >
    <div
      v-for="waveformRun in renderedWaveformRuns"
      :key="waveformRun.id"
      class="absolute overflow-hidden"
      :style="waveformRun.style"
    >
      <svg
        v-if="waveformRun.path"
        class="absolute inset-x-0 inset-y-1"
        :viewBox="`0 0 ${waveformRun.svgWidth} ${waveformRun.svgHeight}`"
        preserveAspectRatio="none"
      >
        <line
          class="timeline-group-waveform__baseline"
          :x1="0"
          :x2="waveformRun.svgWidth"
          :y1="waveformRun.svgHeight / 2"
          :y2="waveformRun.svgHeight / 2"
        />
        <path class="timeline-group-waveform__path" :d="waveformRun.path" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { renderFormulaWaveformSegments } from '@/services/formulaWaveformService'
import { getRenderableWaveformSegments } from '@/services/timelineWaveformSegmentService'
import { useDawStore } from '@/stores/dawStore'

const MAX_PREVIEW_POINTS = 192
const MIN_PREVIEW_POINTS = 24
const MIN_VISIBLE_WIDTH = 12
const MIN_WAVEFORM_HEIGHT = 16
const WAVEFORM_HEIGHT_INSET = 2

const props = defineProps({
  groupVisual: {
    type: Object,
    required: true
  }
})

const dawStore = useDawStore()
const { bytebeatType, evalEffects, sampleRate, tickSize, valueTrackerTracks, variableTracks } = storeToRefs(dawStore)
const renderedWaveformRuns = ref([])

let requestVersion = 0

const formulaClipPreviews = computed(() =>
  Array.isArray(props.groupVisual?.clipPreviews)
    ? props.groupVisual.clipPreviews
    : []
)

const waveformRuns = computed(() => {
  const sortedPreviews = formulaClipPreviews.value
    .map((clipPreview) => ({
      ...clipPreview,
      height: Math.max(1, Number(clipPreview?.height) || 0),
      left: Number(clipPreview?.left) || 0,
      segments: getRenderableWaveformSegments({
        duration: clipPreview?.duration,
        expressions: clipPreview?.expressions,
        start: clipPreview?.start,
        tickSize: tickSize.value,
        valueTrackerTracks: valueTrackerTracks.value,
        variableTracks: variableTracks.value
      }),
      top: Number(clipPreview?.top) || 0,
      width: Math.max(1, Number(clipPreview?.width) || 0)
    }))
    .filter((clipPreview) => clipPreview.segments.length)
    .sort((leftClip, rightClip) => leftClip.top - rightClip.top || leftClip.left - rightClip.left)
  const runsByLaneId = new Map()

  for (const clipPreview of sortedPreviews) {
    const laneId = clipPreview.laneId ?? `${clipPreview.top}:${clipPreview.height}`
    const existingRun = runsByLaneId.get(laneId)

    if (existingRun) {
      existingRun.clips.push(clipPreview)
      existingRun.right = Math.max(existingRun.right, clipPreview.left + clipPreview.width)
      continue
    }

    runsByLaneId.set(laneId, {
      clips: [clipPreview],
      height: clipPreview.height,
      id: clipPreview.id,
      laneId,
      left: clipPreview.left,
      right: clipPreview.left + clipPreview.width,
      top: clipPreview.top,
      trackColor: clipPreview.trackColor,
      trackColorBorder: clipPreview.trackColorBorder,
      trackColorLight: clipPreview.trackColorLight
    })
  }

  return [...runsByLaneId.values()]
    .sort((leftRun, rightRun) => leftRun.top - rightRun.top || leftRun.left - rightRun.left)
    .map((run, index) => ({
    ...run,
    id: `${run.laneId ?? 'group'}:${index}:${run.id}`,
    width: Math.max(1, run.right - run.left)
  }))
})

watch(
  () => ({
    bytebeatType: bytebeatType.value,
    evalEffectsKey: JSON.stringify(evalEffects.value),
    runsKey: JSON.stringify(waveformRuns.value),
    sampleRate: sampleRate.value
  }),
  async ({ bytebeatType: nextBytebeatType }) => {
    const nextRequestVersion = requestVersion + 1
    requestVersion = nextRequestVersion

    if (!waveformRuns.value.length) {
      renderedWaveformRuns.value = []
      return
    }

    const nextRenderedRuns = []

    for (const waveformRun of waveformRuns.value) {
      const renderedRun = await renderWaveformRun(
        waveformRun,
        nextBytebeatType,
        evalEffects.value,
        sampleRate.value
      )

      if (requestVersion !== nextRequestVersion) {
        return
      }

      if (renderedRun) {
        nextRenderedRuns.push(renderedRun)
      }
    }

    renderedWaveformRuns.value = nextRenderedRuns
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  requestVersion += 1
})

async function renderWaveformRun(waveformRun, bytebeatTypeValue, evalEffectsValue, sampleRateValue) {
  const svgWidth = Math.max(1, Math.round(waveformRun.width))
  const svgHeight = Math.max(
    MIN_WAVEFORM_HEIGHT,
    Math.round(waveformRun.height) - WAVEFORM_HEIGHT_INSET * 2
  )
  const centerY = svgHeight / 2
  const waveformAmplitude = Math.max(4, svgHeight * 0.38)
  const floorY = Math.min(svgHeight - 2, centerY + waveformAmplitude)
  let path = ''
  let currentX = 0

  for (const clipPreview of waveformRun.clips) {
    const clipLeft = Math.max(0, clipPreview.left - waveformRun.left)
    const clipWidth = Math.max(1, Number(clipPreview.width) || 0)

    if (clipLeft > currentX) {
      path = appendGapToFloor(path, currentX, clipLeft, floorY)
    }

    if (clipPreview.segments.length && clipWidth >= MIN_VISIBLE_WIDTH) {
      const waveform = await renderFormulaWaveformSegments({
        bytebeatType: bytebeatTypeValue,
        evalEffects: evalEffectsValue,
        sampleCount: Math.max(
          MIN_PREVIEW_POINTS,
          Math.min(MAX_PREVIEW_POINTS, Math.round(clipWidth * 1.5))
        ),
        sampleRate: sampleRateValue,
        segments: clipPreview.segments
      })

      const lastIndex = Math.max(1, waveform.length - 1)

      path = waveform.reduce((nextPath, sample, index) => {
        const x = clipLeft + (index / lastIndex) * clipWidth
        const y = centerY - Math.max(-1, Math.min(1, sample)) * waveformAmplitude
        const command = nextPath ? 'L' : 'M'

        return `${nextPath}${command}${x.toFixed(2)},${y.toFixed(2)}`
      }, path)
    }

    currentX = clipLeft + clipWidth
  }

  if (!path) {
    return null
  }

  return {
    id: waveformRun.id,
    path,
    style: {
      '--track-color': waveformRun.trackColor,
      '--track-color-border': waveformRun.trackColorBorder,
      '--track-color-light': waveformRun.trackColorLight,
      height: `${waveformRun.height}px`,
      left: `${waveformRun.left}px`,
      top: `${waveformRun.top}px`,
      width: `${waveformRun.width}px`
    },
    svgHeight,
    svgWidth
  }
}

function appendGapToFloor(path, startX, endX, floorY) {
  if (endX <= startX) {
    return path
  }

  const roundedFloorY = floorY.toFixed(2)
  const roundedStartX = startX.toFixed(2)
  const roundedEndX = endX.toFixed(2)

  if (!path) {
    return `M${roundedStartX},${roundedFloorY}L${roundedEndX},${roundedFloorY}`
  }

  return `${path}L${roundedStartX},${roundedFloorY}L${roundedEndX},${roundedFloorY}`
}
</script>

<style scoped>
.timeline-group-waveform__baseline {
  stroke: color-mix(in srgb, var(--track-color-light) 24%, transparent);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.timeline-group-waveform__path {
  fill: none;
  stroke: color-mix(in srgb, var(--track-color-light) 78%, white 22%);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}
</style>
