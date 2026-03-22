<template>
  <div
    ref="containerElement"
    class="relative overflow-hidden rounded border border-amber-500/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))]"
    :class="containerClassName"
  >
    <canvas ref="canvasElement" class="block h-full w-full" />

    <div
      v-if="showFormulaOverlay && overlayExpressions.length"
      class="pointer-events-none absolute inset-x-0 top-8 flex justify-center px-6"
    >
      <div
        class="grid w-full max-w-[min(100%,56rem)] gap-8 text-center"
        :class="overlayExpressions.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'"
      >
        <section
          v-for="expression in overlayExpressions"
          :key="expression.id"
          class="grid min-h-0 content-start"
        >
          <pre class="overflow-hidden px-4 text-xs leading-6 text-zinc-100/95 whitespace-pre-wrap break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">{{ expression.code }}</pre>
        </section>
      </div>
    </div>

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

      <span class="pointer-events-none ml-auto text-[10px] uppercase tracking-[0.18em] text-amber-100/60">{{ levelLabel }}</span>
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

const props = defineProps({
  fullscreen: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'linear'
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
const WAVEFORM_SAMPLE_STEP = 4

const canvasElement = ref(null)
const containerElement = ref(null)
const formulaWaveforms = ref([])
const level = ref(0)

let animationFrameId = 0
let canvasContext = null
let frequencyData = null
let formulaPreviewRequestVersion = 0
let timeDomainData = null
let resizeObserver = null

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
const containerClassName = computed(() => {
  if (props.fullscreen) {
    return 'h-full min-h-0'
  }

  if (props.windowed) {
    return 'h-[22rem]'
  }

  return 'h-28'
})

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
  resizeObserver?.disconnect()
})

watch(
  () => ({
    endSample: formulaPreviewEndSample.value,
    expressionsKey: JSON.stringify(renderExpressions.value),
    sampleRate: sampleRate.value,
    startSample: formulaPreviewStartSample.value
  }),
  async ({ endSample, sampleRate: nextSampleRate, startSample }) => {
    const nextRequestVersion = formulaPreviewRequestVersion + 1
    formulaPreviewRequestVersion = nextRequestVersion

    try {
      const waveforms = await renderFormulaWaveformChannels({
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

function drawVisualizer() {
  const canvas = canvasElement.value
  const ctx = canvasContext
  const width = canvas?.clientWidth ?? 0
  const height = canvas?.clientHeight ?? 0

  if (!ctx || width <= 0 || height <= 0) {
    return
  }

  const analyser = bytebeatService.getOutputAnalyser()
  ensureDataBuffers(analyser)
  drawBackground(ctx, width, height)

  if (props.mode === 'circular') {
    drawCircularGuides(ctx, width, height)
    drawCircularFormulaOverlay(ctx, width, height, formulaWaveforms.value)
  } else {
    drawFormulaOverlay(ctx, width, height, formulaWaveforms.value)
  }

  if (!analyser || !frequencyData || !timeDomainData) {
    level.value = 0

    if (props.mode === 'circular') {
      drawCircularIdleState(ctx, width, height)
    } else {
      drawIdleState(ctx, width, height)
    }

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
    return
  }

  drawFrequencyBars(ctx, width, height, frequencyData)
  drawWaveform(ctx, width, height, timeDomainData)
}

function drawBackground(ctx, width, height) {
  const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height)
  backgroundGradient.addColorStop(0, 'rgba(56, 189, 248, 0.03)')
  backgroundGradient.addColorStop(0.45, 'rgba(245, 158, 11, 0.08)')
  backgroundGradient.addColorStop(1, 'rgba(9, 9, 11, 0.98)')

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = backgroundGradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.08)'
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
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, height * 0.6)
  ctx.lineTo(width, height * 0.6)
  ctx.stroke()
}

function getCircularCenter(width, height) {
  return {
    x: width * 0.5,
    y: height * 0.5
  }
}

function drawCircularGuides(ctx, width, height) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const maxRadius = Math.max(24, Math.min(width, height) * 0.32)

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.08)'
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

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.stroke()
}

function drawFrequencyBars(ctx, width, height, spectrum) {
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

    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
    ctx.fillRect(x, y, barWidth, barHeight)
  }
}

function drawFormulaOverlay(ctx, width, height, waveforms) {
  if (!Array.isArray(waveforms) || !waveforms.length) {
    return
  }

  const offsets = waveforms.length > 1 ? [-height * 0.065, height * 0.065] : [0]
  const colors = waveforms.length > 1
    ? ['rgba(56, 189, 248, 0.82)', 'rgba(125, 211, 252, 0.62)']
    : ['rgba(56, 189, 248, 0.82)']

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

  const baseRadius = Math.max(18, Math.min(width, height) * 0.12)
  const radiusStep = Math.max(10, Math.min(width, height) * 0.035)
  const colors = waveforms.length > 1
    ? ['rgba(56, 189, 248, 0.82)', 'rgba(125, 211, 252, 0.56)']
    : ['rgba(56, 189, 248, 0.82)']

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

function drawWaveform(ctx, width, height, waveform) {
  const centerY = height * 0.54
  const amplitude = height * 0.24 + level.value * height * 0.14
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = 'rgba(252, 211, 77, 0.96)'
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

    ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`
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
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const baseRadius = Math.max(44, Math.min(width, height) * 0.28)
  const amplitude = Math.max(10, Math.min(width, height) * 0.06 + level.value * Math.min(width, height) * 0.035)
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = 'rgba(252, 211, 77, 0.96)'
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
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const radius = Math.max(8, Math.min(width, height) * 0.038 + level.value * Math.min(width, height) * 0.014)
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.6)

  coreGradient.addColorStop(0, 'rgba(252, 211, 77, 0.95)')
  coreGradient.addColorStop(0.35, 'rgba(245, 158, 11, 0.42)')
  coreGradient.addColorStop(1, 'rgba(245, 158, 11, 0)')

  ctx.fillStyle = coreGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 2.6, 0, TAU)
  ctx.fill()

  ctx.fillStyle = 'rgba(252, 211, 77, 0.92)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.fill()
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
