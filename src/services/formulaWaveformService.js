import { applyEvalEffects } from '@/services/evalEffectService'
import { loadByteBeatNodeClass } from '@/services/bytebeatNodeLoader'
import { DEFAULT_BYTEBEAT_TYPE, normalizeBytebeatType } from '@/services/bytebeatTypeService'
import { normalizeExpressionList } from '@/services/formulaService'
import { validateFormula } from '@/utils/formulaValidation'

const DEFAULT_SAMPLE_RATE = 8000
const MAX_CACHE_ENTRIES = 200
const MAX_SAMPLE_COUNT = 256
const MIN_SAMPLE_COUNT = 16
const SILENT_FORMULA = '0'

let previewAudioContext = null
let previewNode = null
let initPromise = null
let renderQueue = Promise.resolve()
const previewCache = new Map()

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext
}

function normalizeTimeSample(value, fallback = 0) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.max(0, Math.floor(numericValue))
}

function normalizeSampleCount(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return MIN_SAMPLE_COUNT
  }

  return Math.max(MIN_SAMPLE_COUNT, Math.min(MAX_SAMPLE_COUNT, Math.floor(numericValue)))
}

function sanitizeRenderableExpressions(formula, evalEffects = []) {
  const normalizedFormula = normalizeExpressionList(formula)

  if (!normalizedFormula.length) {
    return [SILENT_FORMULA]
  }

  return sanitizeRenderableExpressionList(
    applyEvalEffects(normalizedFormula, evalEffects)
  )
}

function sanitizeRenderableExpressionList(expressions = []) {
  const normalizedExpressions = Array.isArray(expressions)
    ? expressions
    .filter((expression) => typeof expression === 'string' && expression.trim())
    .map((expression) => (validateFormula(expression) ? expression : SILENT_FORMULA))
    : []

  return normalizedExpressions.length ? normalizedExpressions : [SILENT_FORMULA]
}

function mergeChannels(leftChannel, rightChannel) {
  if (!rightChannel?.length) {
    return new Float32Array(leftChannel)
  }

  const mergedChannel = new Float32Array(leftChannel.length)

  for (let index = 0; index < leftChannel.length; index += 1) {
    mergedChannel[index] = (leftChannel[index] + rightChannel[index]) * 0.5
  }

  return mergedChannel
}

function rememberCachedWaveform(cacheKey, waveform) {
  if (previewCache.has(cacheKey)) {
    previewCache.delete(cacheKey)
  }

  previewCache.set(cacheKey, waveform)

  if (previewCache.size <= MAX_CACHE_ENTRIES) {
    return waveform
  }

  const oldestKey = previewCache.keys().next().value

  if (oldestKey) {
    previewCache.delete(oldestKey)
  }

  return waveform
}

async function createPreviewNode() {
  const AudioContextCtor = getAudioContextConstructor()

  if (!AudioContextCtor) {
    throw new Error('AudioContext no esta disponible en este navegador')
  }

  previewAudioContext = new AudioContextCtor()

  const ByteBeatNode = await loadByteBeatNodeClass()
  await ByteBeatNode.setup(previewAudioContext)

  previewNode = new ByteBeatNode(previewAudioContext)
  previewNode.setExpressionType(ByteBeatNode.ExpressionType.infix)
  previewNode.setType(DEFAULT_BYTEBEAT_TYPE)
  previewNode.setDesiredSampleRate(DEFAULT_SAMPLE_RATE)
  await previewNode.setExpressions([SILENT_FORMULA], true)

  return previewNode
}

async function initPreviewNode() {
  if (previewNode) {
    return previewNode
  }

  if (!initPromise) {
    initPromise = createPreviewNode().catch((error) => {
      initPromise = null
      throw error
    })
  }

  return initPromise
}

async function readWaveformChannel(node, startSample, endSample, sampleCount, channel) {
  let contextId = null
  let stackId = null

  try {
    contextId = await node.createContext()
    stackId = await node.createStack()

    return await node.getSamplesForTimeRange(
      startSample,
      endSample,
      sampleCount,
      contextId,
      stackId,
      channel
    )
  } finally {
    const cleanupTasks = []

    if (contextId !== null) {
      cleanupTasks.push(node.destroyContext(contextId))
    }

    if (stackId !== null) {
      cleanupTasks.push(node.destroyStack(stackId))
    }

    await Promise.allSettled(cleanupTasks)
  }
}

export async function renderFormulaWaveform({
  formula,
  evalEffects = [],
  startSample = 0,
  endSample = 1,
  sampleCount = 64,
  sampleRate = DEFAULT_SAMPLE_RATE,
  bytebeatType = DEFAULT_BYTEBEAT_TYPE
}) {
  const normalizedStartSample = normalizeTimeSample(startSample)
  const normalizedEndSample = Math.max(
    normalizedStartSample + 1,
    normalizeTimeSample(endSample, normalizedStartSample + 1)
  )
  const normalizedSampleCount = normalizeSampleCount(sampleCount)
  const normalizedSampleRate = Math.max(1, normalizeTimeSample(sampleRate, DEFAULT_SAMPLE_RATE))
  const normalizedBytebeatType = normalizeBytebeatType(bytebeatType)
  const expressions = sanitizeRenderableExpressions(formula, evalEffects)
  const cacheKey = JSON.stringify({
    bytebeatType: normalizedBytebeatType,
    endSample: normalizedEndSample,
    expressions,
    sampleCount: normalizedSampleCount,
    sampleRate: normalizedSampleRate,
    startSample: normalizedStartSample
  })
  const cachedWaveform = previewCache.get(cacheKey)

  if (cachedWaveform) {
    return cachedWaveform
  }

  renderQueue = renderQueue.catch(() => {}).then(async () => {
    const node = await initPreviewNode()

    node.setType(normalizedBytebeatType)
    node.setDesiredSampleRate(normalizedSampleRate)
    await node.setExpressions(expressions, true)

    const leftChannel = await readWaveformChannel(
      node,
      normalizedStartSample,
      normalizedEndSample,
      normalizedSampleCount,
      0
    )

    let waveform = new Float32Array(leftChannel)

    if (node.getNumChannels() > 1) {
      const rightChannel = await readWaveformChannel(
        node,
        normalizedStartSample,
        normalizedEndSample,
        normalizedSampleCount,
        1
      )

      waveform = mergeChannels(leftChannel, rightChannel)
    }

    return rememberCachedWaveform(cacheKey, waveform)
  })

  return renderQueue
}

export async function renderFormulaWaveformChannels({
  expressions = [],
  startSample = 0,
  endSample = 1,
  sampleCount = 64,
  sampleRate = DEFAULT_SAMPLE_RATE,
  bytebeatType = DEFAULT_BYTEBEAT_TYPE
}) {
  const normalizedStartSample = normalizeTimeSample(startSample)
  const normalizedEndSample = Math.max(
    normalizedStartSample + 1,
    normalizeTimeSample(endSample, normalizedStartSample + 1)
  )
  const normalizedSampleCount = normalizeSampleCount(sampleCount)
  const normalizedSampleRate = Math.max(1, normalizeTimeSample(sampleRate, DEFAULT_SAMPLE_RATE))
  const normalizedBytebeatType = normalizeBytebeatType(bytebeatType)
  const sanitizedExpressions = sanitizeRenderableExpressionList(expressions)
  const cacheKey = JSON.stringify({
    bytebeatType: normalizedBytebeatType,
    endSample: normalizedEndSample,
    expressions: sanitizedExpressions,
    mode: 'channels',
    sampleCount: normalizedSampleCount,
    sampleRate: normalizedSampleRate,
    startSample: normalizedStartSample
  })
  const cachedWaveforms = previewCache.get(cacheKey)

  if (cachedWaveforms) {
    return cachedWaveforms
  }

  renderQueue = renderQueue.catch(() => {}).then(async () => {
    const node = await initPreviewNode()

    node.setType(normalizedBytebeatType)
    node.setDesiredSampleRate(normalizedSampleRate)
    await node.setExpressions(sanitizedExpressions, true)

    const channels = [
      new Float32Array(
        await readWaveformChannel(
          node,
          normalizedStartSample,
          normalizedEndSample,
          normalizedSampleCount,
          0
        )
      )
    ]

    if (node.getNumChannels() > 1) {
      channels.push(
        new Float32Array(
          await readWaveformChannel(
            node,
            normalizedStartSample,
            normalizedEndSample,
            normalizedSampleCount,
            1
          )
        )
      )
    }

    return rememberCachedWaveform(cacheKey, channels)
  })

  return renderQueue
}

export async function renderFormulaWaveformSegments({
  segments = [],
  evalEffects = [],
  sampleCount = 64,
  sampleRate = DEFAULT_SAMPLE_RATE,
  bytebeatType = DEFAULT_BYTEBEAT_TYPE
}) {
  const normalizedSegments = normalizeWaveformSegments(segments)
  const normalizedSampleCount = normalizeSampleCount(sampleCount)

  if (!normalizedSegments.length) {
    return new Float32Array(0)
  }

  if (normalizedSegments.length === 1) {
    const [segment] = normalizedSegments

    return renderFormulaWaveform({
      bytebeatType,
      endSample: segment.endSample,
      evalEffects,
      formula: segment.expressions,
      sampleCount: normalizedSampleCount,
      sampleRate,
      startSample: segment.startSample
    })
  }

  const segmentSampleCounts = getWaveformSegmentSampleCounts(normalizedSegments, normalizedSampleCount)
  const renderedSegments = []

  for (let index = 0; index < normalizedSegments.length; index += 1) {
    const segment = normalizedSegments[index]
    const waveform = await renderFormulaWaveform({
      bytebeatType,
      endSample: segment.endSample,
      evalEffects,
      formula: segment.expressions,
      sampleCount: segmentSampleCounts[index],
      sampleRate,
      startSample: segment.startSample
    })

    renderedSegments.push(waveform)
  }

  return resampleWaveform(
    mergeRenderedWaveformSegments(renderedSegments),
    normalizedSampleCount
  )
}

function normalizeWaveformSegments(segments) {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments.flatMap((segment) => {
    const expressions = normalizeExpressionList(segment?.expressions ?? segment?.formula, SILENT_FORMULA)
    const startSample = normalizeTimeSample(segment?.startSample)
    const endSample = Math.max(
      startSample + 1,
      normalizeTimeSample(segment?.endSample, startSample + 1)
    )

    if (endSample <= startSample) {
      return []
    }

    return [{
      endSample,
      expressions,
      startSample
    }]
  })
}

function getWaveformSegmentSampleCounts(segments, totalSampleCount) {
  const durations = segments.map((segment) => Math.max(1, segment.endSample - segment.startSample))
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0)
  const allocations = durations.map((duration, index) => {
    const exactCount = totalDuration > 0
      ? (duration / totalDuration) * totalSampleCount
      : totalSampleCount / segments.length

    return {
      exactCount,
      fractionalPart: exactCount - Math.floor(exactCount),
      index,
      sampleCount: Math.max(1, Math.floor(exactCount))
    }
  })

  let allocatedSampleCount = allocations.reduce((sum, allocation) => sum + allocation.sampleCount, 0)

  if (allocatedSampleCount < totalSampleCount) {
    for (const allocation of [...allocations].sort((left, right) => right.fractionalPart - left.fractionalPart)) {
      if (allocatedSampleCount >= totalSampleCount) {
        break
      }

      allocation.sampleCount += 1
      allocatedSampleCount += 1
    }
  } else if (allocatedSampleCount > totalSampleCount) {
    for (const allocation of [...allocations].sort((left, right) => left.fractionalPart - right.fractionalPart)) {
      if (allocatedSampleCount <= totalSampleCount) {
        break
      }

      if (allocation.sampleCount <= 1) {
        continue
      }

      allocation.sampleCount -= 1
      allocatedSampleCount -= 1
    }
  }

  return allocations
    .sort((left, right) => left.index - right.index)
    .map((allocation) => allocation.sampleCount)
}

function mergeRenderedWaveformSegments(renderedSegments) {
  const totalLength = renderedSegments.reduce(
    (sum, waveform) => sum + (waveform?.length ?? 0),
    0
  )
  const mergedWaveform = new Float32Array(totalLength)
  let writeOffset = 0

  for (const waveform of renderedSegments) {
    if (!waveform?.length) {
      continue
    }

    mergedWaveform.set(waveform, writeOffset)
    writeOffset += waveform.length
  }

  return mergedWaveform
}

function resampleWaveform(waveform, sampleCount) {
  const normalizedSampleCount = normalizeSampleCount(sampleCount)

  if (!waveform?.length) {
    return new Float32Array(0)
  }

  if (waveform.length === normalizedSampleCount) {
    return waveform
  }

  if (normalizedSampleCount === 1) {
    return new Float32Array([waveform[0]])
  }

  const resampledWaveform = new Float32Array(normalizedSampleCount)
  const maxSourceIndex = waveform.length - 1

  for (let index = 0; index < normalizedSampleCount; index += 1) {
    const sourcePosition = (index / (normalizedSampleCount - 1)) * maxSourceIndex
    const leftIndex = Math.floor(sourcePosition)
    const rightIndex = Math.min(maxSourceIndex, Math.ceil(sourcePosition))
    const interpolation = sourcePosition - leftIndex
    const leftSample = waveform[leftIndex] ?? 0
    const rightSample = waveform[rightIndex] ?? leftSample

    resampledWaveform[index] = leftSample + (rightSample - leftSample) * interpolation
  }

  return resampledWaveform
}
