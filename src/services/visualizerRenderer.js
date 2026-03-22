import { clamp } from '@/utils/timeUtils'
import { getVisualizerPaletteById, withAlpha } from '@/utils/visualizerPalettes'

const MAX_CIRCULAR_BAR_COUNT = 88
const MAX_BAR_COUNT = 48
const MIN_BAR_COUNT = 18
const MIN_CIRCULAR_BAR_COUNT = 36
const TARGET_BAR_WIDTH = 10
const TAU = Math.PI * 2
const WATERFALL_GUIDE_ROW_COUNT = 4
const WATERFALL_SNAPSHOT_INTERVAL_MS = 42
const WATERFALL_SNAPSHOT_POINTS = 96
const WATERFALL_VISIBLE_TRACE_COUNT = 12
const VECTORSCOPE_SAMPLE_STEP = 2
const WAVEFORM_SAMPLE_STEP = 4

export function createWaterfallState() {
  return {
    audioHistory: [],
    formulaHistory: [],
    lastSnapshotAt: 0
  }
}

export function resetWaterfallState(state = createWaterfallState()) {
  state.audioHistory = []
  state.formulaHistory = []
  state.lastSnapshotAt = 0
  return state
}

export function updateWaterfallState(
  state = createWaterfallState(),
  currentTimeMs,
  audioWaveform,
  formulaWaveforms = []
) {
  const now = Number.isFinite(Number(currentTimeMs)) ? Number(currentTimeMs) : 0
  const formulaWaveform = mergeWaterfallFormulaWaveform(formulaWaveforms)

  if (
    (state.audioHistory.length || state.formulaHistory.length)
    && now - state.lastSnapshotAt < WATERFALL_SNAPSHOT_INTERVAL_MS
  ) {
    return state
  }

  state.lastSnapshotAt = now
  pushWaterfallSnapshot(
    state.audioHistory,
    sampleWaterfallSnapshot(audioWaveform, WATERFALL_SNAPSHOT_POINTS)
  )
  pushWaterfallSnapshot(
    state.formulaHistory,
    sampleWaterfallSnapshot(formulaWaveform, WATERFALL_SNAPSHOT_POINTS)
  )

  return state
}

export function renderVisualizerFrame(ctx, settings, frameData = {}) {
  const width = settings?.width ?? 0
  const height = settings?.height ?? 0

  if (!ctx || width <= 0 || height <= 0) {
    return
  }

  const {
    colors,
    mode = 'linear',
    showFormulaOverlay = false
  } = normalizeRendererSettings(settings)
  const {
    formulaWaveforms = [],
    level = 0,
    monoWaveform = null,
    overlayExpressions = [],
    spectrum = null,
    stereoWaveform = null,
    waterfallState = createWaterfallState()
  } = frameData

  drawBackground(ctx, width, height, colors)

  if (mode === 'circular') {
    drawCircularGuides(ctx, width, height, colors)
    drawCircularFormulaOverlay(ctx, width, height, formulaWaveforms, colors)
  } else if (mode === 'waterfall') {
    drawWaterfallGuides(ctx, width, height, colors)
  } else if (mode === 'vectorscope') {
    drawVectorscopeGuides(ctx, width, height, colors)
  } else {
    drawFormulaOverlay(ctx, width, height, formulaWaveforms, colors)
  }

  if (!monoWaveform?.length || !spectrum?.length) {
    if (mode === 'circular') {
      drawCircularIdleState(ctx, width, height, colors)
    } else if (mode === 'waterfall') {
      drawWaterfallSnapshots(ctx, width, height, colors, waterfallState)
    } else if (mode === 'vectorscope') {
      drawVectorscopeIdleState(ctx, width, height, colors)
    } else {
      drawIdleState(ctx, width, height, colors)
    }

    if (showFormulaOverlay) {
      drawCanvasFormulaTextOverlay(ctx, width, height, overlayExpressions, colors)
    }

    return
  }

  if (mode === 'circular') {
    drawCircularFrequencyBars(ctx, width, height, spectrum, level, colors)
    drawCircularWaveform(ctx, width, height, monoWaveform, level, colors)
    drawCircularCore(ctx, width, height, level, colors)
  } else if (mode === 'waterfall') {
    drawWaterfallSnapshots(ctx, width, height, colors, waterfallState)
  } else if (mode === 'vectorscope') {
    if (!stereoWaveform?.left?.length || !stereoWaveform?.right?.length) {
      drawVectorscopeIdleState(ctx, width, height, colors)
    } else {
      drawVectorscopeTrace(
        ctx,
        width,
        height,
        stereoWaveform.left,
        stereoWaveform.right,
        level,
        colors
      )
    }
  } else {
    drawFrequencyBars(ctx, width, height, spectrum, colors)
    drawWaveform(ctx, width, height, monoWaveform, level, colors)
  }

  if (showFormulaOverlay) {
    drawCanvasFormulaTextOverlay(ctx, width, height, overlayExpressions, colors)
  }
}

function normalizeRendererSettings(settings = {}) {
  return {
    colors: getVisualizerPaletteById(settings.paletteId).colors,
    mode: settings.mode ?? 'linear',
    showFormulaOverlay: Boolean(settings.showFormulaOverlay)
  }
}

function drawBackground(ctx, width, height, colors) {
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

function drawIdleState(ctx, width, height, colors) {
  ctx.strokeStyle = withAlpha(colors.grid, 0.2)
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

function drawCircularGuides(ctx, width, height, colors) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const maxRadius = Math.max(24, Math.min(width, height) * 0.32)

  ctx.strokeStyle = withAlpha(colors.grid, 0.08)
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

function drawCircularIdleState(ctx, width, height, colors) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const radius = Math.max(18, Math.min(width, height) * 0.18)

  ctx.strokeStyle = withAlpha(colors.grid, 0.2)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.stroke()
}

function drawFrequencyBars(ctx, width, height, spectrum, colors) {
  const availableHeight = height - 22
  const barCount = Math.max(
    MIN_BAR_COUNT,
    Math.min(MAX_BAR_COUNT, Math.floor(width / TARGET_BAR_WIDTH))
  )
  const gap = 2
  const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount)
  const maxIndex = Math.max(1, spectrum.length - 1)
  const bottom = height - 8

  for (let index = 0; index < barCount; index += 1) {
    const spectrumIndex = Math.min(
      maxIndex,
      Math.floor(((index / Math.max(1, barCount - 1)) ** 1.85) * maxIndex)
    )
    const normalizedValue = clamp(spectrum[spectrumIndex] ?? 0, 0, 1)
    const easedValue = normalizedValue ** 1.35
    const barHeight = Math.max(2, easedValue * availableHeight)
    const x = index * (barWidth + gap)
    const y = bottom - barHeight
    const alpha = 0.2 + easedValue * 0.75

    ctx.fillStyle = withAlpha(colors.audio, alpha)
    ctx.fillRect(x, y, barWidth, barHeight)
  }
}

function drawFormulaOverlay(ctx, width, height, waveforms, colors) {
  if (!Array.isArray(waveforms) || !waveforms.length) {
    return
  }

  const offsets = waveforms.length > 1 ? [-height * 0.065, height * 0.065] : [0]
  const waveformColors = waveforms.length > 1
    ? [
        withAlpha(colors.formulaPrimary, 0.82),
        withAlpha(colors.formulaSecondary, 0.62)
      ]
    : [withAlpha(colors.formulaPrimary, 0.82)]

  waveforms.forEach((waveform, index) => {
    drawFormulaChannelWaveform(
      ctx,
      width,
      height,
      waveform,
      offsets[index] ?? 0,
      waveformColors[index] ?? waveformColors[0]
    )
  })
}

function drawCircularFormulaOverlay(ctx, width, height, waveforms, colors) {
  if (!Array.isArray(waveforms) || !waveforms.length) {
    return
  }

  const baseRadius = Math.max(18, Math.min(width, height) * 0.12)
  const radiusStep = Math.max(10, Math.min(width, height) * 0.035)
  const waveformColors = waveforms.length > 1
    ? [
        withAlpha(colors.formulaPrimary, 0.82),
        withAlpha(colors.formulaSecondary, 0.56)
      ]
    : [withAlpha(colors.formulaPrimary, 0.82)]

  waveforms.forEach((waveform, index) => {
    drawCircularFormulaRing(
      ctx,
      width,
      height,
      waveform,
      baseRadius + index * radiusStep,
      waveformColors[index] ?? waveformColors[0]
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

function drawCanvasFormulaTextOverlay(ctx, width, height, expressions, colors) {
  if (!Array.isArray(expressions) || !expressions.length) {
    return
  }

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
  ctx.fillStyle = withAlpha(colors.divider, 0.95)
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

  while (
    trimmedText.length > 0
    && ctx.measureText(`${trimmedText}${ellipsis}`).width > maxWidth
  ) {
    trimmedText = trimmedText.slice(0, -1)
  }

  return `${trimmedText}${ellipsis}`
}

function drawWaveform(ctx, width, height, waveform, level, colors) {
  const centerY = height * 0.54
  const amplitude = height * 0.24 + level * height * 0.14
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = withAlpha(colors.audio, 0.96)
  ctx.lineWidth = 1.75
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += WAVEFORM_SAMPLE_STEP) {
    const normalizedValue = clamp(waveform[index] ?? 0, -1, 1)
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

function drawCircularFrequencyBars(ctx, width, height, spectrum, level, colors) {
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
    const normalizedValue = clamp(spectrum[spectrumIndex] ?? 0, 0, 1)
    const easedValue = normalizedValue ** 1.28
    const barLength = Math.max(4, easedValue * maxBarLength)
    const angle = (-Math.PI / 2) + (index / barCount) * TAU
    const startRadius = innerRadius
    const endRadius = startRadius + barLength
    const alpha = 0.18 + easedValue * 0.78

    ctx.strokeStyle = withAlpha(colors.audio, alpha)
    ctx.lineWidth = 1 + easedValue * 2.2 + level * 0.2
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

function drawCircularWaveform(ctx, width, height, waveform, level, colors) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const baseRadius = Math.max(44, Math.min(width, height) * 0.28)
  const amplitude = Math.max(
    10,
    Math.min(width, height) * 0.06 + level * Math.min(width, height) * 0.035
  )
  const lastIndex = Math.max(1, Math.floor((waveform.length - 1) / WAVEFORM_SAMPLE_STEP))

  ctx.strokeStyle = withAlpha(colors.audio, 0.96)
  ctx.lineWidth = 1.75
  ctx.beginPath()

  for (let index = 0; index < waveform.length; index += WAVEFORM_SAMPLE_STEP) {
    const normalizedValue = clamp(waveform[index] ?? 0, -1, 1)
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

function drawCircularCore(ctx, width, height, level, colors) {
  const { x: centerX, y: centerY } = getCircularCenter(width, height)
  const radius = Math.max(
    8,
    Math.min(width, height) * 0.038 + level * Math.min(width, height) * 0.014
  )
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.6)

  coreGradient.addColorStop(0, withAlpha(colors.audio, 0.95))
  coreGradient.addColorStop(0.35, withAlpha(colors.audioGlow, 0.42))
  coreGradient.addColorStop(1, withAlpha(colors.audioGlow, 0))

  ctx.fillStyle = coreGradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 2.6, 0, TAU)
  ctx.fill()

  ctx.fillStyle = withAlpha(colors.audio, 0.92)
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

function drawVectorscopeGuides(ctx, width, height, colors) {
  const frame = getVectorscopeFrame(width, height)

  ctx.strokeStyle = withAlpha(colors.grid, 0.1)
  ctx.lineWidth = 1
  ctx.strokeRect(frame.x, frame.y, frame.size, frame.size)

  ctx.beginPath()
  ctx.moveTo(frame.x, frame.y)
  ctx.lineTo(frame.x + frame.size, frame.y + frame.size)
  ctx.moveTo(frame.x + frame.size, frame.y)
  ctx.lineTo(frame.x, frame.y + frame.size)
  ctx.stroke()

  ctx.strokeStyle = withAlpha(colors.divider, 0.08)
  ctx.beginPath()
  ctx.moveTo(frame.centerX, frame.y)
  ctx.lineTo(frame.centerX, frame.y + frame.size)
  ctx.moveTo(frame.x, frame.centerY)
  ctx.lineTo(frame.x + frame.size, frame.centerY)
  ctx.stroke()
}

function drawVectorscopeIdleState(ctx, width, height, colors) {
  const frame = getVectorscopeFrame(width, height)

  ctx.fillStyle = withAlpha(colors.audio, 0.28)
  ctx.beginPath()
  ctx.arc(frame.centerX, frame.centerY, Math.max(2.5, frame.size * 0.012), 0, TAU)
  ctx.fill()
}

function drawVectorscopeTrace(ctx, width, height, leftWaveform, rightWaveform, level, colors) {
  const frame = getVectorscopeFrame(width, height)
  const sampleCount = Math.min(leftWaveform.length, rightWaveform.length)

  if (sampleCount <= 0) {
    drawVectorscopeIdleState(ctx, width, height, colors)
    return
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 0

  drawVectorscopePath(ctx, leftWaveform, rightWaveform, frame, {
    lineWidth: 4 + level * 2,
    sampleCount,
    sampleStep: VECTORSCOPE_SAMPLE_STEP,
    strokeStyle: withAlpha(colors.formulaPrimary, 0.16 + level * 0.08)
  })
  drawVectorscopePath(ctx, leftWaveform, rightWaveform, frame, {
    lineWidth: 1.2 + level * 0.8,
    sampleCount,
    sampleStep: VECTORSCOPE_SAMPLE_STEP,
    strokeStyle: withAlpha(colors.audio, 0.42 + level * 0.2)
  })

  ctx.fillStyle = withAlpha(colors.audio, 0.34 + level * 0.18)

  for (let index = 0; index < sampleCount; index += VECTORSCOPE_SAMPLE_STEP * 10) {
    const x = frame.centerX + clamp(leftWaveform[index] ?? 0, -1, 1) * frame.halfSize
    const y = frame.centerY - clamp(rightWaveform[index] ?? 0, -1, 1) * frame.halfSize

    ctx.beginPath()
    ctx.arc(x, y, Math.max(1.2, 1.5 + level * 0.8), 0, TAU)
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
    const x = frame.centerX + clamp(leftWaveform[index] ?? 0, -1, 1) * frame.halfSize
    const y = frame.centerY - clamp(rightWaveform[index] ?? 0, -1, 1) * frame.halfSize

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

  if (history.length > 64) {
    history.length = 64
  }
}

function sampleWaterfallSnapshot(waveform, pointCount) {
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

    snapshot[index] = clamp(waveform[sampleIndex] ?? 0, -1, 1)
  }

  return snapshot
}

function drawWaterfallGuides(ctx, width, height, colors) {
  const centerY = height * 0.5

  drawWaterfallBandGuides(
    ctx,
    createWaterfallBandConfig(width, height, {
      backY: centerY - height * 0.025,
      colorRgb: colors.audioGlow,
      frontY: 0.5,
      valueDirection: -1
    })
  )
  drawWaterfallBandGuides(
    ctx,
    createWaterfallBandConfig(width, height, {
      backY: centerY + height * 0.025,
      colorRgb: colors.formulaPrimary,
      frontY: height - 0.5,
      valueDirection: 1
    })
  )

  ctx.strokeStyle = withAlpha(colors.divider, 0.08)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width * 0.08, centerY)
  ctx.lineTo(width * 0.92, centerY)
  ctx.stroke()
}

function drawWaterfallSnapshots(ctx, width, height, colors, state) {
  const waterfallState = state ?? createWaterfallState()
  const centerY = height * 0.5
  const topBand = createWaterfallBandConfig(width, height, {
    backY: centerY - height * 0.025,
    colorRgb: colors.audio,
    frontY: 0.5,
    valueDirection: -1
  })
  const bottomBand = createWaterfallBandConfig(width, height, {
    backY: centerY + height * 0.025,
    colorRgb: colors.formulaPrimary,
    frontY: height - 0.5,
    valueDirection: 1
  })

  drawWaterfallBand(ctx, waterfallState.audioHistory, topBand)
  drawWaterfallBand(ctx, waterfallState.formulaHistory, bottomBand)
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

function drawWaterfallBand(ctx, history = [], band) {
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
