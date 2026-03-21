<template>
  <div
    ref="containerElement"
    class="relative h-28 overflow-hidden rounded border border-amber-500/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))]"
  >
    <canvas ref="canvasElement" class="block h-full w-full" />

    <div class="pointer-events-none absolute inset-x-3 top-2 flex items-center justify-between gap-3">
      <span class="text-[10px] uppercase tracking-[0.24em] text-amber-200/70">Final Output</span>
      <span class="text-[10px] uppercase tracking-[0.18em] text-amber-100/60">{{ levelLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import bytebeatService from '@/services/bytebeatService'

const MAX_BAR_COUNT = 48
const MIN_BAR_COUNT = 18
const TARGET_BAR_WIDTH = 10
const WAVEFORM_SAMPLE_STEP = 4

const canvasElement = ref(null)
const containerElement = ref(null)
const level = ref(0)

let animationFrameId = 0
let canvasContext = null
let frequencyData = null
let timeDomainData = null
let resizeObserver = null

const levelLabel = computed(() => {
  const normalizedLevel = Math.max(0, Math.min(1, level.value))

  if (normalizedLevel <= 0.01) {
    return 'Silence'
  }

  return `${Math.round(normalizedLevel * 100)}%`
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

  resizeObserver?.disconnect()
})

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

  if (!analyser || !frequencyData || !timeDomainData) {
    level.value = 0
    drawIdleState(ctx, width, height)
    return
  }

  analyser.getByteFrequencyData(frequencyData)
  analyser.getByteTimeDomainData(timeDomainData)

  const nextLevel = measureSignalLevel(timeDomainData)
  level.value = level.value * 0.78 + nextLevel * 0.22

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
