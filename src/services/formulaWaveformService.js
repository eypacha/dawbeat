import { applyEvalEffects } from '@/services/evalEffectService'
import { loadByteBeatNodeClass } from '@/services/bytebeatNodeLoader'
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
  if (typeof formula !== 'string' || !formula.trim()) {
    return [SILENT_FORMULA]
  }

  const expressions = applyEvalEffects(formula, evalEffects)
    .filter((expression) => typeof expression === 'string' && expression.trim())
    .map((expression) => (validateFormula(expression) ? expression : SILENT_FORMULA))

  return expressions.length ? expressions : [SILENT_FORMULA]
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
  previewNode.setType(ByteBeatNode.Type.byteBeat)
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
  sampleRate = DEFAULT_SAMPLE_RATE
}) {
  const normalizedStartSample = normalizeTimeSample(startSample)
  const normalizedEndSample = Math.max(
    normalizedStartSample + 1,
    normalizeTimeSample(endSample, normalizedStartSample + 1)
  )
  const normalizedSampleCount = normalizeSampleCount(sampleCount)
  const normalizedSampleRate = Math.max(1, normalizeTimeSample(sampleRate, DEFAULT_SAMPLE_RATE))
  const expressions = sanitizeRenderableExpressions(formula, evalEffects)
  const cacheKey = JSON.stringify({
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
