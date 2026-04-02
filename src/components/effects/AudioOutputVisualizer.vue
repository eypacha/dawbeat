<template>
  <div
    ref="containerElement"
    class="relative overflow-hidden rounded border"
    :class="containerClassName"
    :style="containerStyle"
  >
    <canvas ref="canvasElement" class="block h-full w-full" />

    <div class="absolute inset-x-3 top-2 flex items-center justify-between gap-3">
      <button
        v-if="showWindowButton"
        aria-label="Open visualizer window"
        class="pointer-events-auto inline-flex h-6 w-6 items-center justify-center border border-zinc-700/50 bg-zinc-950/45 text-zinc-400/70 transition hover:border-zinc-500/70 hover:bg-zinc-950/65 hover:text-zinc-100/90"
        title="Open visualizer window"
        type="button"
        @click="emit('open-window')"
      >
        <AppWindow class="h-3.5 w-3.5" :stroke-width="2.25" />
      </button>

      <span
        class="pointer-events-none ml-auto text-[10px] uppercase tracking-[0.18em]"
        :style="levelStyle"
      >{{ levelLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AppWindow } from 'lucide-vue-next'
import { getActiveFormula } from '@/engine/timelineEngine'
import bytebeatService from '@/services/bytebeatService'
import { applyEvalEffects, getEvaluatedDisplayExpressions } from '@/services/evalEffectService'
import { hasRenderableFormulaInput } from '@/services/formulaService'
import { renderFormulaWaveformChannels } from '@/services/formulaWaveformService'
import { useDawStore } from '@/stores/dawStore'
import { clamp, ticksToSamples } from '@/utils/timeUtils'
import {
  DEFAULT_VISUALIZER_PALETTE_ID,
  getVisualizerPaletteById,
  withAlpha
} from '@/utils/visualizerPalettes'

const props = defineProps({
  fullscreen: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'linear'
  },
  paletteId: {
    type: String,
    default: DEFAULT_VISUALIZER_PALETTE_ID
  },
  showFormulaOverlay: {
    type: Boolean,
    default: false
  },
  showWindowButton: {
    type: Boolean,
    default: false
  },
  windowed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open-window'])

const FORMULA_PREVIEW_MAX_SPAN_SAMPLES = 8192
const FORMULA_PREVIEW_MIN_SPAN_SAMPLES = 1024
const FORMULA_PREVIEW_SAMPLE_COUNT = 192
const FORMULA_PREVIEW_WINDOW_SECONDS = 0.5
const FORMULA_PREVIEW_WINDOW_STEP_DIVISOR = 2
const MAX_CIRCULAR_BAR_COUNT = 88
const MAX_BAR_COUNT = 48
const MIN_BAR_COUNT = 18
const MIN_CIRCULAR_BAR_COUNT = 36
const TARGET_BAR_WIDTH = 10
const TAU = Math.PI * 2
const WATERFALL_HISTORY_LIMIT = 64
const WATERFALL_GUIDE_ROW_COUNT = 4
const WATERFALL_SNAPSHOT_INTERVAL_MS = 42
const WATERFALL_SNAPSHOT_POINTS = 96
const WATERFALL_VISIBLE_TRACE_COUNT = 12
const VECTORSCOPE_SAMPLE_STEP = 2
const WAVEFORM_SAMPLE_STEP = 4
const FFT_MIN_DECIBELS = -120
const FFT_MAX_DECIBELS = -10
const FFT_MIN_LABEL_FREQUENCY = 10

const canvasElement = ref(null)
const containerElement = ref(null)
const formulaWaveforms = ref([])
const level = ref(0)

let animationFrameId = 0
let canvasDisplayHeight = 0
let canvasDisplayWidth = 0
let canvasContext = null
let frequencyData = null
let formulaPreviewRequestVersion = 0
let lastWaterfallSnapshotAt = 0
let leftTimeDomainData = null
let leftFrequencyData = null
let rightTimeDomainData = null
let rightFrequencyData = null
let timeDomainData = null
let resizeObserver = null
let waterfallAudioHistory = []
let waterfallFormulaHistory = []

const dawStore = useDawStore()
const {
  bytebeatType,
  evalEffects,
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
    variableTracks.value,
    valueTrackerTracks.value,
    valueTrackerLiveInputs.value
  )
)
const evaluatedExpressions = computed(() => {
  if (!hasRenderableFormulaInput(activeFormula.value)) {
    return []
  }

  return applyEvalEffects(activeFormula.value, evalEffects.value)
    .filter((expression) => typeof expression === 'string' && expression.trim())
})
const renderExpressions = computed(() => evaluatedExpressions.value.length ? evaluatedExpressions.value : ['0'])
const formulaPreviewSpanSamples = computed(() =>
  clamp(
    Math.round((Number(sampleRate.value) || 0) * FORMULA_PREVIEW_WINDOW_SECONDS),
    FORMULA_PREVIEW_MIN_SPAN_SAMPLES,
    FORMULA_PREVIEW_MAX_SPAN_SAMPLES
  )
)
const formulaPreviewStartSample = computed(() => {
  const currentSample = Number.isFinite(Number(time.value))
    ? ticksToSamples(time.value, tickSize.value)
    : 0
  const step = Math.max(128, Math.floor(formulaPreviewSpanSamples.value / FORMULA_PREVIEW_WINDOW_STEP_DIVISOR))

  return Math.max(0, Math.floor(currentSample / step) * step)
})
const formulaPreviewEndSample = computed(() => formulaPreviewStartSample.value + formulaPreviewSpanSamples.value)

const levelLabel = computed(() => {
  const normalizedLevel = Math.max(0, Math.min(1, level.value))

  return `${Math.round(normalizedLevel * 100)}%`
})
const overlayExpressions = computed(() =>
  getEvaluatedDisplayExpressions(evaluatedExpressions.value, {
    duplicateMono: true
  })
)
const selectedPalette = computed(() => getVisualizerPaletteById(props.paletteId))
const containerClassName = computed(() => {
  if (props.fullscreen) {
    return 'h-full min-h-0'
  }

  if (props.windowed) {
    return 'h-[22rem]'
  }

  return 'h-28'
})
const containerStyle = computed(() => ({
  backgroundColor: selectedPalette.value.colors.background,
  borderColor: withAlpha(selectedPalette.value.colors.border, 0.2),
  containerType: 'inline-size'
}))
const levelStyle = computed(() => ({
  color: withAlpha(selectedPalette.value.colors.audio, 0.6),
  fontSize: 'clamp(0.5rem, 2cqi, 0.75rem)'
}))

onMounted(() => {
  syncCanvasSize()

  resizeObserver = new ResizeObserver(() => {
    syncCanvasSize()
  })

  if (containerElement.value) {
    resizeObserver.observe(containerElement.value)
  }

  renderFrame()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  formulaPreviewRequestVersion += 1
  resetWaterfallHistory()
  resizeObserver?.disconnect()
})

watch(
  () => ({
    bytebeatType: bytebeatType.value,
    endSample: formulaPreviewEndSample.value,
    expressionsKey: JSON.stringify(renderExpressions.value),
    sampleRate: sampleRate.value,
    startSample: formulaPreviewStartSample.value
  }),
  async ({ bytebeatType: nextBytebeatType, endSample, sampleRate: nextSampleRate, startSample }) => {
    const nextRequestVersion = formulaPreviewRequestVersion + 1
    formulaPreviewRequestVersion = nextRequestVersion

    try {
      const waveforms = await renderFormulaWaveformChannels({
        bytebeatType: nextBytebeatType,
        endSample,
        expressions: renderExpressions.value,
        sampleCount: FORMULA_PREVIEW_SAMPLE_COUNT,
        sampleRate: nextSampleRate,
        startSample
      })

      if (formulaPreviewRequestVersion !== nextRequestVersion) {
        return
      }

      formulaWaveforms.value = Array.isArray(waveforms) ? waveforms : []
    } catch {
      if (formulaPreviewRequestVersion !== nextRequestVersion) {
        return
      }

      formulaWaveforms.value = []
    }
  },
  { immediate: true }
)

watch(
  () => props.mode,
  () => {
    resetWaterfallHistory()
  }
)

function getPaletteColors() {
  return selectedPalette.value.colors
}

function renderFrame() {
  drawVisualizer()
  animationFrameId = requestAnimationFrame(renderFrame)
}

function syncCanvasSize() {
  const canvas = canvasElement.value
  const container = containerElement.value

  if (!canvas || !container) {
    return
  }

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const devicePixelRatio = window.devicePixelRatio || 1
  const displayWidth = Math.round(width * devicePixelRatio)
  const displayHeight = Math.round(height * devicePixelRatio)

  canvasDisplayWidth = width
  canvasDisplayHeight = height

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }

  canvasContext = canvas.getContext('2d')

  if (!canvasContext) {
    return
  }

  canvasContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
}

function ensureDataBuffers(analyser) {
  if (!analyser) {
    frequencyData = null
    timeDomainData = null
    return
  }

  if (!frequencyData || frequencyData.length !== analyser.frequencyBinCount) {
    frequencyData = new Uint8Array(analyser.frequencyBinCount)
  }

  if (!timeDomainData || timeDomainData.length !== analyser.fftSize) {
    timeDomainData = new Uint8Array(analyser.fftSize)
  }
}

function ensureStereoDataBuffers(stereoAnalysers) {
  if (!stereoAnalysers?.left || !stereoAnalysers?.right) {
    leftFrequencyData = null
    leftTimeDomainData = null
    rightFrequencyData = null
    rightTimeDomainData = null
    return
  }

  if (!leftFrequencyData || leftFrequencyData.length !== stereoAnalysers.left.frequencyBinCount) {
    leftFrequencyData = new Uint8Array(stereoAnalysers.left.frequencyBinCount)
  }

  if (!rightFrequencyData || rightFrequencyData.length !== stereoAnalysers.right.frequencyBinCount) {
    rightFrequencyData = new Uint8Array(stereoAnalysers.right.frequencyBinCount)
  }

  if (!leftTimeDomainData || leftTimeDomainData.length !== stereoAnalysers.left.fftSize) {
    leftTimeDomainData = new Uint8Array(stereoAnalysers.left.fftSize)
  }

  if (!rightTimeDomainData || rightTimeDomainData.length !== stereoAnalysers.right.fftSize) {
    rightTimeDomainData = new Uint8Array(stereoAnalysers.right.fftSize)
  }
}

function drawVisualizer() {
  const canvas = canvasElement.value
  const ctx = canvasContext
  const width = canvasDisplayWidth || canvas?.clientWidth || 0
  const height = canvasDisplayHeight || canvas?.clientHeight || 0

  if (!ctx || width <= 0 || height <= 0) {
    return
  }

  const analyser = bytebeatService.getOutputAnalyser()
  const stereoAnalysers = bytebeatService.getOutputStereoAnalysers()
  ensureDataBuffers(analyser)
  ensureStereoDataBuffers(stereoAnalysers)
  drawBackground(ctx, width, height)

  if (props.mode === 'circular') {
    drawCircularGuides(ctx, width, height)
    drawCircularFormulaOverlay(ctx, width, height, formulaWaveforms.value)
  } else if (props.mode === 'fft') {
    drawFftGuides(ctx, width, height, analyser)
  } else if (props.mode === 'waterfall') {
    drawWaterfallGuides(ctx, width, height)
  } else if (props.mode === 'vectorscope') {
    drawVectorscopeGuides(ctx, width, height)
  } else {
    drawFormulaOverlay(ctx, width, height, formulaWaveforms.value)
  }

  if (!analyser || !frequencyData || !timeDomainData) {
    level.value = 0

    if (props.mode === 'circular') {
      drawCircularIdleState(ctx, width, height)
    } else if (props.mode === 'fft') {
      drawFftIdleState(ctx, width, height)
    } else if (props.mode === 'waterfall') {
      drawWaterfallSnapshots(ctx, width, height)
    } else if (props.mode === 'vectorscope') {
      drawVectorscopeIdleState(ctx, width, height)
    } else {
      drawIdleState(ctx, width, height)
    }

    drawCanvasFormulaTextOverlay(ctx, width, height, overlayExpressions.value)
    return
  }

  analyser.getByteFrequencyData(frequencyData)
  analyser.getByteTimeDomainData(timeDomainData)

  const nextLevel = measureSignalLevel(timeDomainData)
  level.value = level.value * 0.78 + nextLevel * 0.22

  if (props.mode === 'circular') {
    drawCircularFrequencyBars(ctx, width, height, frequencyData)
    drawCircularWaveform(ctx, width, height, timeDomainData)
    drawCircularCore(ctx, width, height)
  } else if (props.mode === 'fft') {
    const fftTraces = [frequencyData]

    if (
      stereoAnalysers?.left
      && stereoAnalysers?.right
      && leftFrequencyData
      && rightFrequencyData
    ) {
      stereoAnalysers.left.getByteFrequencyData(leftFrequencyData)
      stereoAnalysers.right.getByteFrequencyData(rightFrequencyData)

      if (isStereoSpectrum(leftFrequencyData, rightFrequencyData)) {
        fftTraces[0] = leftFrequencyData
        fftTraces.push(rightFrequencyData)
      }
    }

    drawFftSpectrum(ctx, width, height, analyser, fftTraces)
  } else if (props.mode === 'waterfall') {
    updateWaterfallHistories(timeDomainData, formulaWaveforms.value)
    drawWaterfallSnapshots(ctx, width, height)
  } else if (props.mode === 'vectorscope') {
    if (
      !stereoAnalysers?.left
      || !stereoAnalysers?.right
      || !leftTimeDomainData
      || !rightTimeDomainData
    ) {
      drawVectorscopeIdleState(ctx, width, height)
    } else {
      stereoAnalysers.left.getByteTimeDomainData(leftTimeDomainData)
      stereoAnalysers.right.getByteTimeDomainData(rightTimeDomainData)
      drawVectorscopeTrace(ctx, width, height, leftTimeDomainData, rightTimeDomainData)
    }
  } else {
    drawFrequencyBars(ctx, width, height, frequencyData)
    drawWaveform(ctx, width, height, timeDomainData)
  }

  drawCanvasFormulaTextOverlay(ctx, width, height, overlayExpressions.value)
}

function drawBackground(ctx, width, height) {
  const colors = getPaletteColors()

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = withAlpha(colors.grid, 0.08)
  ctx.lineWidth = 1

  for (let index = 1; index < 4; index += 1) {
    const y = (height * index) / 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawIdleState(ctx, width, height) {
  ctx.strokeStyle = withAlpha(getPaletteColors().grid, 0.2)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, height * 0.6)
  ctx.lineTo(width, height * 0.6)
  ctx.stroke()
}

function getFftFrequencyRange(analyser) {
  const sampleRate = Number(analyser?.context?.sampleRate) || 48000
  const fftSize = Math.max(2, Number(analyser?.fftSize) || 2048)
  const nyquist = sampleRate * 0.5
  const minFrequency = Math.max(sampleRate / fftSize, FFT_MIN_LABEL_FREQUENCY)

  return {
    maxFrequency: Math.max(minFrequency + 1, nyquist),
    minFrequency
  }
}

function toLogFftX(frequency, minFrequency, maxFrequency, width) {
  const safeFrequency = clamp(frequency, minFrequency, maxFrequency)
  const denominator = Math.log(maxFrequency / minFrequency)

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return 0
  }

  return (Math.log(safeFrequency / minFrequency) / denominator) * width
}

function drawFftGuides(ctx, width, height, analyser) {
  const { divider, grid } = getPaletteColors()
  const { maxFrequency, minFrequency } = getFftFrequencyRange(analyser)
  const useSparseLabels = !props.windowed && !props.fullscreen
  let frequencyLabelIndex = 0
  let dbLabelIndex = 0

  ctx.save()
  ctx.strokeStyle = withAlpha(grid, 0.16)
  ctx.fillStyle = withAlpha(divider, 0.85)
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace'
  ctx.lineWidth = 1

  ctx.beginPath()
  for (let baseFrequency = FFT_MIN_LABEL_FREQUENCY; baseFrequency <= maxFrequency; baseFrequency *= 10) {
    for (let step = 1; step < 10; step += 1) {
      const frequency = baseFrequency * step

      if (frequency < minFrequency || frequency > maxFrequency) {
        continue
      }

      const x = toLogFftX(frequency, minFrequency, maxFrequency, width)
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)

      if (step === 1 || step === 2 || step === 5) {
        const shouldDrawLabel = !useSparseLabels || frequencyLabelIndex % 2 === 0
        frequencyLabelIndex += 1

        if (shouldDrawLabel) {
          const label = frequency < 1000
            ? `${Math.round(frequency)}Hz`
            : `${(frequency / 1000).toFixed(frequency >= 10000 ? 0 : 1)}kHz`
          ctx.fillText(label, x + 3, 12)
        }
      }
    }
  }

  const dbRange = FFT_MAX_DECIBELS - FFT_MIN_DECIBELS
  for (let decibel = FFT_MAX_DECIBELS - 10; decibel >= FFT_MIN_DECIBELS; decibel -= 10) {
    const normalized = (FFT_MAX_DECIBELS - decibel) / dbRange
    const y = normalized * height
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)

    const shouldDrawLabel = !useSparseLabels || dbLabelIndex % 2 === 0
    dbLabelIndex += 1

    if (shouldDrawLabel) {
      ctx.fillText(`${decibel}dB`, 4, Math.max(10, y - 3))
    }
  }

  ctx.stroke()
  ctx.restore()
}

function drawFftIdleState(ctx, width, height) {
  const { audio } = getPaletteColors()

  ctx.strokeStyle = withAlpha(audio, 0.18)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, height - 2)
  ctx.lineTo(width, height - 2)
  ctx.stroke()
}

function drawFftSpectrum(ctx, width, height, analyser, traces) {
  if (!Array.isArray(traces) || !traces.length) {
    return
  }

  const colors = getPaletteColors()
  const { maxFrequency, minFrequency } = getFftFrequencyRange(analyser)
  const maxBinFrequency = Math.max(minFrequency + 1, maxFrequency)
  const dbRange = FFT_MAX_DECIBELS - FFT_MIN_DECIBELS
  const stereoStroke = [
    withAlpha(colors.formulaPrimary, 0.9),
    withAlpha(colors.formulaSecondary, 0.9)
  ]

  traces.forEach((spectrum, traceIndex) => {
    if (!spectrum?.length) {
      return
    }

    const strokeStyle = traces.length > 1
      ? stereoStroke[traceIndex] ?? withAlpha(colors.audio, 0.85)
      : withAlpha(colors.audio, 0.9)
    const maxIndex = Math.max(1, spectrum.length - 1)

    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = traces.length > 1 ? 1.2 : 1.35
    ctx.beginPath()

    let started = false
    for (let index = 1; index <= maxIndex; index += 1) {
      const normalizedValue = clamp((spectrum[index] ?? 0) / 255, 0, 1)
      const decibels = FFT_MIN_DECIBELS + normalizedValue * dbRange
      const y = clamp(
        ((FFT_MAX_DECIBELS - decibels) / dbRange) * height,
        0,
        height
      )
      const frequency = (index / maxIndex) * maxBinFrequency
      const x = toLogFftX(frequency, minFrequency, maxFrequency, width)

      if (!started) {
        ctx.moveTo(x, y)
        started = true
        continue
      }

      ctx.lineTo(x, y)
    }

    if (started) {
      ctx.stroke()
    }
  })
}

function isStereoSpectrum(leftSpectrum, rightSpectrum) {
  if (!leftSpectrum?.length || !rightSpectrum?.length) {
    return false
  }

  const sampleCount = Math.min(leftSpectrum.length, rightSpectrum.length)

  if (sampleCount <= 0) {
    return false
  }

  const stride = Math.max(1, Math.floor(sampleCount / 64))

  for (let index = 0; index < sampleCount; index += stride) {
    if (Math.abs((leftSpectrum[index] ?? 0) - (rightSpectrum[index] ?? 0)) >= 3) {
      return true
    }
  }

  return false
}

function getCircularCenter(width, height) {
  return {
    x: width * 0.5,
    y: height * 0.5
  }
}

function resetWaterfallHistory() {
  waterfallAudioHistory = []
  waterfallFormulaHistory = []
  lastWaterfallSnapshotAt = 0
}

function drawCircularGuides(ctx, width, height) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const maxRadius = Math.max(24, Math.min(width, height) * 0.32)

  ctx.strokeStyle = withAlpha(getPaletteColors().grid, 0.08)
  ctx.lineWidth = 1

  for (const ratio of [0.45, 0.72, 1]) {
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius * ratio, 0, TAU)
    ctx.stroke()
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = (-Math.PI / 2) + (index / 8) * TAU
    const innerRadius = maxRadius * 0.24
    const outerRadius = maxRadius

    ctx.beginPath()
    ctx.moveTo(
      centerX + Math.cos(angle) * innerRadius,
      centerY + Math.sin(angle) * innerRadius
    )
    ctx.lineTo(
      centerX + Math.cos(angle) * outerRadius,
      centerY + Math.sin(angle) * outerRadius
    )
    ctx.stroke()
  }
}

function drawCircularIdleState(ctx, width, height) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const radius = Math.max(18, Math.min(width, height) * 0.18)

  ctx.strokeStyle = withAlpha(getPaletteColors().grid, 0.2)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.stroke()
}

function drawFrequencyBars(ctx, width, height, spectrum) {
  const { audio } = getPaletteColors()
  const availableHeight = height - 22
  const barCount = Math.max(MIN_BAR_COUNT, Math.min(MAX_BAR_COUNT, Math.floor(width / TARGET_BAR_WIDTH)))
  const gap = 2
  const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount)
  const maxIndex = Math.max(1, spectrum.length - 1)
  const bottom = height - 8

  for (let index = 0; index < barCount; index += 1) {
    const spectrumIndex = Math.min(
      maxIndex,
      Math.floor(((index / Math.max(1, barCount - 1)) ** 1.85) * maxIndex)
    )
    const normalizedValue = (spectrum[spectrumIndex] ?? 0) / 255
    const easedValue = normalizedValue ** 1.35
    const barHeight = Math.max(2, easedValue * availableHeight)
    const x = index * (barWidth + gap)
    const y = bottom - barHeight
    const alpha = 0.2 + easedValue * 0.75

    ctx.fillStyle = withAlpha(audio, alpha)
    ctx.fillRect(x, y, barWidth, barHeight)
  }
}

function drawFormulaOverlay(ctx, width, height, waveforms) {
  if (!Array.isArray(waveforms) || !waveforms.length) {
    return
  }

  const { formulaPrimary, formulaSecondary } = getPaletteColors()
  const offsets = waveforms.length > 1 ? [-height * 0.065, height * 0.065] : [0]
  const colors = waveforms.length > 1
    ? [withAlpha(formulaPrimary, 0.82), withAlpha(formulaSecondary, 0.62)]
    : [withAlpha(formulaPrimary, 0.82)]

  waveforms.forEach((waveform, index) => {
    drawFormulaChannelWaveform(
      ctx,
      width,
      height,
      waveform,
      offsets[index] ?? 0,
      colors[index] ?? colors[0]
    )
  })
}

function drawCircularFormulaOverlay(ctx, width, height, waveforms) {
  if (!Array.isArray(waveforms) || !waveforms.length) {
    return
  }

  const { formulaPrimary, formulaSecondary } = getPaletteColors()
  const baseRadius = Math.max(18, Math.min(width, height) * 0.12)
  const radiusStep = Math.max(10, Math.min(width, height) * 0.035)
  const colors = waveforms.length > 1
    ? [withAlpha(formulaPrimary, 0.82), withAlpha(formulaSecondary, 0.56)]
    : [withAlpha(formulaPrimary, 0.82)]

  waveforms.forEach((waveform, index) => {
    drawCircularFormulaRing(
      ctx,
      width,
      height,
      waveform,
      baseRadius + index * radiusStep,
      colors[index] ?? colors[0]
    )
  })
}

function drawCircularFormulaRing(ctx, width, height, waveform, baseRadius, strokeStyle) {
  if (!waveform?.length) {
    return
  }

  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const amplitude = Math.max(6, Math.min(width, height) * 0.026)
  const lastIndex = Math.max(1, waveform.length - 1)

  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = 1.1
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += 1) {
    const normalizedValue = clamp(waveform[index] ?? 0, -1, 1)
    const angle = (-Math.PI / 2) + (index / lastIndex) * TAU
    const radius = baseRadius + normalizedValue * amplitude
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    if (index === 0) {
      ctx.moveTo(x, y)
      continue
    }

    ctx.lineTo(x, y)
  }

  ctx.closePath()
  ctx.stroke()
}

function drawFormulaChannelWaveform(ctx, width, height, waveform, centerOffset, strokeStyle) {
  if (!waveform?.length) {
    return
  }

  const centerY = height * 0.54 + centerOffset
  const amplitude = height * 0.14
  const lastIndex = Math.max(1, waveform.length - 1)

  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = 1.15
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += 1) {
    const normalizedValue = clamp(waveform[index] ?? 0, -1, 1)
    const x = (index / lastIndex) * width
    const y = centerY - normalizedValue * amplitude

    if (index === 0) {
      ctx.moveTo(x, y)
      continue
    }

    ctx.lineTo(x, y)
  }

  ctx.stroke()
}

function drawCanvasFormulaTextOverlay(ctx, width, height, expressions) {
  if (!props.showFormulaOverlay || !Array.isArray(expressions) || !expressions.length) {
    return
  }

  const { divider } = getPaletteColors()
  const contentInsetX = clamp(width * 0.055, 24, 64)
  const contentTop = clamp(height * 0.14, 30, 80)
  const contentBottom = clamp(height * 0.08, 18, 40)
  const maxContentWidth = Math.max(0, Math.min(width - contentInsetX * 2, 896))

  if (maxContentWidth <= 0) {
    return
  }

  const contentStartX = (width - maxContentWidth) * 0.5
  const columnGap = expressions.length > 1 ? clamp(maxContentWidth * 0.04, 20, 40) : 0
  const columnWidth = expressions.length > 1
    ? (maxContentWidth - columnGap) / expressions.length
    : maxContentWidth
  const fontSize = clamp(
    columnWidth * (expressions.length > 1 ? 0.047 : 0.037),
    15,
    34
  )
  const lineHeight = Math.max(16, fontSize * 1.55)
  const maxLines = Math.max(1, Math.floor((height - contentTop - contentBottom) / lineHeight))

  ctx.save()
  ctx.fillStyle = withAlpha(divider, 0.95)
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace`
  ctx.shadowBlur = fontSize * 0.9
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  expressions.forEach((expression, expressionIndex) => {
    const x = contentStartX + expressionIndex * (columnWidth + columnGap)
    const lines = getWrappedCanvasPreLines(ctx, expression?.code ?? '', columnWidth, maxLines)

    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, x, contentTop + lineIndex * lineHeight)
    })
  })

  ctx.restore()
}

function getWrappedCanvasPreLines(ctx, text, maxWidth, maxLines) {
  const wrappedLines = []
  const sourceLines = String(text ?? '').replace(/\t/g, '  ').split('\n')

  for (const sourceLine of sourceLines) {
    if (!sourceLine.length) {
      wrappedLines.push('')
      continue
    }

    let currentLine = ''

    for (const character of sourceLine) {
      const nextLine = currentLine + character

      if (currentLine && ctx.measureText(nextLine).width > maxWidth) {
        wrappedLines.push(currentLine)
        currentLine = character
        continue
      }

      currentLine = nextLine
    }

    wrappedLines.push(currentLine)
  }

  if (wrappedLines.length <= maxLines) {
    return wrappedLines
  }

  const visibleLines = wrappedLines.slice(0, maxLines)
  visibleLines[maxLines - 1] = fitCanvasTextWithEllipsis(
    ctx,
    visibleLines[maxLines - 1],
    maxWidth
  )
  return visibleLines
}

function fitCanvasTextWithEllipsis(ctx, text, maxWidth) {
  const ellipsis = '...'

  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }

  let trimmedText = text

  while (trimmedText.length > 0 && ctx.measureText(`${trimmedText}${ellipsis}`).width > maxWidth) {
    trimmedText = trimmedText.slice(0, -1)
  }

  return `${trimmedText}${ellipsis}`
}

function drawWaveform(ctx, width, height, waveform) {
  const { audio } = getPaletteColors()
  const centerY = height * 0.54
  const amplitude = height * 0.24 + level.value * height * 0.14
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = withAlpha(audio, 0.96)
  ctx.lineWidth = 1.75
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += WAVEFORM_SAMPLE_STEP) {
    const normalizedValue = ((waveform[index] ?? 128) - 128) / 128
    const x = ((index / WAVEFORM_SAMPLE_STEP) / lastIndex) * width
    const y = centerY + normalizedValue * amplitude

    if (index === 0) {
      ctx.moveTo(x, y)
      continue
    }

    ctx.lineTo(x, y)
  }

  ctx.stroke()
}

function drawCircularFrequencyBars(ctx, width, height, spectrum) {
  const { audio } = getPaletteColors()
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const innerRadius = Math.max(28, Math.min(width, height) * 0.18)
  const maxBarLength = Math.max(18, Math.min(width, height) * 0.15)
  const barCount = Math.max(
    MIN_CIRCULAR_BAR_COUNT,
    Math.min(MAX_CIRCULAR_BAR_COUNT, Math.floor(Math.min(width, height) * 0.48))
  )
  const maxIndex = Math.max(1, spectrum.length - 1)

  for (let index = 0; index < barCount; index += 1) {
    const spectrumIndex = Math.min(
      maxIndex,
      Math.floor(((index / Math.max(1, barCount - 1)) ** 1.78) * maxIndex)
    )
    const normalizedValue = (spectrum[spectrumIndex] ?? 0) / 255
    const easedValue = normalizedValue ** 1.28
    const barLength = Math.max(4, easedValue * maxBarLength)
    const angle = (-Math.PI / 2) + (index / barCount) * TAU
    const startRadius = innerRadius
    const endRadius = startRadius + barLength
    const alpha = 0.18 + easedValue * 0.78

    ctx.strokeStyle = withAlpha(audio, alpha)
    ctx.lineWidth = 1 + easedValue * 2.2
    ctx.beginPath()
    ctx.moveTo(
      centerX + Math.cos(angle) * startRadius,
      centerY + Math.sin(angle) * startRadius
    )
    ctx.lineTo(
      centerX + Math.cos(angle) * endRadius,
      centerY + Math.sin(angle) * endRadius
    )
    ctx.stroke()
  }
}

function drawCircularWaveform(ctx, width, height, waveform) {
  const { audio } = getPaletteColors()
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const baseRadius = Math.max(44, Math.min(width, height) * 0.28)
  const amplitude = Math.max(10, Math.min(width, height) * 0.06 + level.value * Math.min(width, height) * 0.035)
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = withAlpha(audio, 0.96)
  ctx.lineWidth = 1.75
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += WAVEFORM_SAMPLE_STEP) {
    const normalizedValue = ((waveform[index] ?? 128) - 128) / 128
    const angle = (-Math.PI / 2) + ((index / WAVEFORM_SAMPLE_STEP) / lastIndex) * TAU
    const radius = baseRadius + normalizedValue * amplitude
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    if (index === 0) {
      ctx.moveTo(x, y)
      continue
    }

    ctx.lineTo(x, y)
  }

  ctx.closePath()
  ctx.stroke()
}

function drawCircularCore(ctx, width, height) {
  const { audio, audioGlow } = getPaletteColors()
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const radius = Math.max(8, Math.min(width, height) * 0.038 + level.value * Math.min(width, height) * 0.014)
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.6)

  coreGradient.addColorStop(0, withAlpha(audio, 0.95))
  coreGradient.addColorStop(0.35, withAlpha(audioGlow, 0.42))
  coreGradient.addColorStop(1, withAlpha(audioGlow, 0))

  ctx.fillStyle = coreGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 2.6, 0, TAU)
  ctx.fill()

  ctx.fillStyle = withAlpha(audio, 0.92)
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.fill()
}

function getVectorscopeFrame(width, height) {
  const size = Math.max(48, Math.min(width * 0.74, height * 0.72))
  const centerX = width * 0.5
  const centerY = height * 0.5

  return {
    centerX,
    centerY,
    halfSize: size * 0.5,
    size,
    x: centerX - size * 0.5,
    y: centerY - size * 0.5
  }
}

function drawVectorscopeGuides(ctx, width, height) {
  const { divider, grid } = getPaletteColors()
  const frame = getVectorscopeFrame(width, height)

  ctx.strokeStyle = withAlpha(grid, 0.1)
  ctx.lineWidth = 1
  ctx.strokeRect(frame.x, frame.y, frame.size, frame.size)

  ctx.beginPath()
  ctx.moveTo(frame.x, frame.y)
  ctx.lineTo(frame.x + frame.size, frame.y + frame.size)
  ctx.moveTo(frame.x + frame.size, frame.y)
  ctx.lineTo(frame.x, frame.y + frame.size)
  ctx.stroke()

  ctx.strokeStyle = withAlpha(divider, 0.08)
  ctx.beginPath()
  ctx.moveTo(frame.centerX, frame.y)
  ctx.lineTo(frame.centerX, frame.y + frame.size)
  ctx.moveTo(frame.x, frame.centerY)
  ctx.lineTo(frame.x + frame.size, frame.centerY)
  ctx.stroke()
}

function drawVectorscopeIdleState(ctx, width, height) {
  const { audio } = getPaletteColors()
  const frame = getVectorscopeFrame(width, height)

  ctx.fillStyle = withAlpha(audio, 0.28)
  ctx.beginPath()
  ctx.arc(frame.centerX, frame.centerY, Math.max(2.5, frame.size * 0.012), 0, TAU)
  ctx.fill()
}

function drawVectorscopeTrace(ctx, width, height, leftWaveform, rightWaveform) {
  const { audio, formulaPrimary } = getPaletteColors()
  const frame = getVectorscopeFrame(width, height)
  const sampleCount = Math.min(leftWaveform.length, rightWaveform.length)

  if (sampleCount <= 0) {
    drawVectorscopeIdleState(ctx, width, height)
    return
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 0

  drawVectorscopePath(ctx, leftWaveform, rightWaveform, frame, {
    lineWidth: 4 + level.value * 2,
    sampleCount,
    sampleStep: VECTORSCOPE_SAMPLE_STEP,
    strokeStyle: withAlpha(formulaPrimary, 0.16 + level.value * 0.08)
  })
  drawVectorscopePath(ctx, leftWaveform, rightWaveform, frame, {
    lineWidth: 1.2 + level.value * 0.8,
    sampleCount,
    sampleStep: VECTORSCOPE_SAMPLE_STEP,
    strokeStyle: withAlpha(audio, 0.42 + level.value * 0.2)
  })

  ctx.fillStyle = withAlpha(audio, 0.34 + level.value * 0.18)

  for (let index = 0; index < sampleCount; index += VECTORSCOPE_SAMPLE_STEP * 10) {
    const x = frame.centerX + normalizeAnalyserSample(leftWaveform[index]) * frame.halfSize
    const y = frame.centerY - normalizeAnalyserSample(rightWaveform[index]) * frame.halfSize

    ctx.beginPath()
    ctx.arc(x, y, Math.max(1.2, 1.5 + level.value * 0.8), 0, TAU)
    ctx.fill()
  }

  ctx.restore()
}

function drawVectorscopePath(ctx, leftWaveform, rightWaveform, frame, {
  lineWidth,
  sampleCount,
  sampleStep,
  strokeStyle
}) {
  let started = false

  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.beginPath()

  for (let index = 0; index < sampleCount; index += sampleStep) {
    const x = frame.centerX + normalizeAnalyserSample(leftWaveform[index]) * frame.halfSize
    const y = frame.centerY - normalizeAnalyserSample(rightWaveform[index]) * frame.halfSize

    if (!started) {
      ctx.moveTo(x, y)
      started = true
      continue
    }

    ctx.lineTo(x, y)
  }

  if (started) {
    ctx.stroke()
  }
}

function normalizeAnalyserSample(sample) {
  return clamp(((sample ?? 128) - 128) / 128, -1, 1)
}

function updateWaterfallHistories(audioWaveform, waveforms) {
  const now = performance.now()
  const formulaWaveform = mergeWaterfallFormulaWaveform(waveforms)

  if (
    (waterfallAudioHistory.length || waterfallFormulaHistory.length)
    && now - lastWaterfallSnapshotAt < WATERFALL_SNAPSHOT_INTERVAL_MS
  ) {
    return
  }

  lastWaterfallSnapshotAt = now
  pushWaterfallSnapshot(
    waterfallAudioHistory,
    sampleWaterfallSnapshot(audioWaveform, WATERFALL_SNAPSHOT_POINTS)
  )
  pushWaterfallSnapshot(
    waterfallFormulaHistory,
    sampleWaterfallSnapshot(formulaWaveform, WATERFALL_SNAPSHOT_POINTS, { normalized: true })
  )
}

function mergeWaterfallFormulaWaveform(waveforms) {
  const channels = Array.isArray(waveforms)
    ? waveforms.filter((waveform) => Array.isArray(waveform) || ArrayBuffer.isView(waveform))
    : []

  if (!channels.length) {
    return null
  }

  const maxLength = Math.max(
    0,
    ...channels.map((waveform) => Number.isFinite(waveform?.length) ? waveform.length : 0)
  )

  if (maxLength <= 0) {
    return null
  }

  const merged = new Float32Array(maxLength)

  for (let index = 0; index < maxLength; index += 1) {
    let total = 0
    let count = 0

    for (const waveform of channels) {
      const lastIndex = Math.max(0, waveform.length - 1)
      const sampleIndex = lastIndex <= 0
        ? 0
        : Math.min(lastIndex, Math.round((index / Math.max(1, maxLength - 1)) * lastIndex))
      const value = waveform[sampleIndex]

      if (!Number.isFinite(value)) {
        continue
      }

      total += value
      count += 1
    }

    merged[index] = count ? clamp(total / count, -1, 1) : 0
  }

  return merged
}

function pushWaterfallSnapshot(history, snapshot) {
  if (!snapshot?.length) {
    return
  }

  history.unshift(snapshot)

  if (history.length > WATERFALL_HISTORY_LIMIT) {
    history.length = WATERFALL_HISTORY_LIMIT
  }
}

function sampleWaterfallSnapshot(waveform, pointCount, { normalized = false } = {}) {
  if (!waveform?.length) {
    return null
  }

  const snapshot = new Float32Array(pointCount)
  const lastIndex = Math.max(1, waveform.length - 1)

  for (let index = 0; index < pointCount; index += 1) {
    const sampleIndex = Math.min(
      lastIndex,
      Math.floor((index / Math.max(1, pointCount - 1)) * lastIndex)
    )

    const sourceValue = waveform[sampleIndex]
    snapshot[index] = normalized
      ? clamp(sourceValue ?? 0, -1, 1)
      : clamp(((sourceValue ?? 128) - 128) / 128, -1, 1)
  }

  return snapshot
}

function drawWaterfallGuides(ctx, width, height) {
  const { audioGlow, divider, formulaPrimary } = getPaletteColors()
  const centerY = height * 0.5

  drawWaterfallBandGuides(
    ctx,
    createWaterfallBandConfig(width, height, {
      backY: centerY - height * 0.025,
      colorRgb: audioGlow,
      frontY: 0.5,
      valueDirection: -1
    })
  )
  drawWaterfallBandGuides(
    ctx,
    createWaterfallBandConfig(width, height, {
      backY: centerY + height * 0.025,
      colorRgb: formulaPrimary,
      frontY: height - 0.5,
      valueDirection: 1
    })
  )

  ctx.strokeStyle = withAlpha(divider, 0.08)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width * 0.08, centerY)
  ctx.lineTo(width * 0.92, centerY)
  ctx.stroke()
}

function drawWaterfallSnapshots(ctx, width, height) {
  const { audio, formulaPrimary } = getPaletteColors()
  const centerY = height * 0.5
  const topBand = createWaterfallBandConfig(width, height, {
    backY: centerY - height * 0.025,
    colorRgb: audio,
    frontY: 0.5,
    valueDirection: -1
  })
  const bottomBand = createWaterfallBandConfig(width, height, {
    backY: centerY + height * 0.025,
    colorRgb: formulaPrimary,
    frontY: height - 0.5,
    valueDirection: 1
  })

  drawWaterfallBand(ctx, waterfallAudioHistory, topBand)
  drawWaterfallBand(ctx, waterfallFormulaHistory, bottomBand)
}

function createWaterfallBandConfig(width, height, {
  backY,
  colorRgb,
  frontY,
  valueDirection
}) {
  return {
    backHalfWidth: width * 0.13,
    backY,
    centerX: width * 0.5,
    colorRgb,
    frontHalfWidth: Math.max(0, width * 0.5 - 0.5),
    frontY,
    height,
    valueDirection
  }
}

function drawWaterfallBandGuides(ctx, band) {
  ctx.strokeStyle = withAlpha(band.colorRgb, 0.08)
  ctx.lineWidth = 1

  for (let index = 0; index < WATERFALL_GUIDE_ROW_COUNT; index += 1) {
    const depth = index / Math.max(1, WATERFALL_GUIDE_ROW_COUNT - 1)
    const y = band.frontY + depth * (band.backY - band.frontY)
    const halfWidth = band.frontHalfWidth + depth * (band.backHalfWidth - band.frontHalfWidth)

    ctx.beginPath()
    ctx.moveTo(band.centerX - halfWidth, y)
    ctx.lineTo(band.centerX + halfWidth, y)
    ctx.stroke()
  }

  for (const xRatio of [-1, -0.5, 0, 0.5, 1]) {
    ctx.beginPath()
    ctx.moveTo(band.centerX + band.frontHalfWidth * xRatio, band.frontY)
    ctx.lineTo(band.centerX + band.backHalfWidth * xRatio, band.backY)
    ctx.stroke()
  }
}

function drawWaterfallBand(ctx, history, band) {
  const visibleHistory = history.slice(0, WATERFALL_VISIBLE_TRACE_COUNT)

  if (!visibleHistory.length) {
    drawWaterfallIdleTrace(ctx, band)
    return
  }

  for (let historyIndex = visibleHistory.length - 1; historyIndex >= 0; historyIndex -= 1) {
    const snapshot = visibleHistory[historyIndex]
    const depth = visibleHistory.length <= 1
      ? 0
      : historyIndex / Math.max(1, visibleHistory.length - 1)

    drawWaterfallSnapshot(ctx, snapshot, depth, band)
  }
}

function drawWaterfallSnapshot(ctx, snapshot, depth, band) {
  if (!snapshot?.length) {
    return
  }

  const frontness = 1 - depth
  const centerness = depth
  const centerY = band.frontY + depth * (band.backY - band.frontY)
  const halfWidth = band.backHalfWidth + frontness * (band.frontHalfWidth - band.backHalfWidth)
  const amplitude = band.height * (0.015 + frontness * 0.13)
  const alpha = 0.06 + frontness * 0.88
  const lineWidth = 0.65 + frontness * 1.6
  const lastIndex = Math.max(1, snapshot.length - 1)

  ctx.strokeStyle = withAlpha(band.colorRgb, alpha)
  ctx.lineWidth = lineWidth
  ctx.beginPath()

  for (let index = 0; index < snapshot.length; index += 1) {
    const x = band.centerX + (((index / lastIndex) - 0.5) * halfWidth * 2)
    const y = centerY + snapshot[index] * amplitude * band.valueDirection

    if (index === 0) {
      ctx.moveTo(x, y)
      continue
    }

    ctx.lineTo(x, y)
  }

  ctx.stroke()
}

function drawWaterfallIdleTrace(ctx, band) {
  ctx.strokeStyle = withAlpha(band.colorRgb, 0.22)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(band.centerX - band.frontHalfWidth, band.frontY)
  ctx.lineTo(band.centerX + band.frontHalfWidth, band.frontY)
  ctx.stroke()
}

function measureSignalLevel(waveform) {
  if (!waveform?.length) {
    return 0
  }

  let totalPower = 0

  for (let index = 0; index < waveform.length; index += 1) {
    const normalizedValue = ((waveform[index] ?? 128) - 128) / 128
    totalPower += normalizedValue * normalizedValue
  }

  return Math.min(1, Math.sqrt(totalPower / waveform.length) * 2.5)
}
</script>
