import { Compressor, Context as ToneContext, EQ3, Limiter, connect as toneConnect } from 'tone'
import {
  normalizeDecibels,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime
} from '@/services/audioEffectService'
import { loadByteBeatNodeClass } from '@/services/bytebeatNodeLoader'
import { validateFormula } from '@/utils/formulaValidation'

const SILENT_FORMULA = '0'

let audioContext = null
let toneContext = null
let byteBeatNode = null
let initPromise = null
let formulaUpdatePromise = Promise.resolve()
let currentExpressionsKey = null
let desiredSampleRate = 8000
let sampleOffset = 0
let heldSample = null
let currentAudioEffects = []
let masterGainValue = 1
let masterGainNode = null
const audioEffectNodes = new Map()

function safeDisconnect(node) {
  if (!node) {
    return
  }

  try {
    node.disconnect()
  } catch {
    // Ignore repeated disconnects; Web Audio nodes throw when not connected.
  }
}

function safeDispose(node) {
  if (!node || typeof node.dispose !== 'function') {
    return
  }

  try {
    node.dispose()
  } catch {
    // Ignore dispose errors when rebuilding the graph.
  }
}

function ensureMasterGainNode() {
  if (!audioContext) {
    return null
  }

  if (!masterGainNode) {
    masterGainNode = new GainNode(audioContext, { gain: masterGainValue })
  }

  return masterGainNode
}

function createAudioEffectNode(effect) {
  if (!audioContext || !toneContext || !effect) {
    return null
  }

  if (effect.type === 'eq') {
    return new EQ3({
      context: toneContext,
      high: 0,
      highFrequency: 2500,
      low: 0,
      lowFrequency: 400,
      mid: 0
    })
  }

  if (effect.type === 'compressor') {
    return new Compressor({
      attack: 0.003,
      context: toneContext,
      knee: 30,
      ratio: 4,
      release: 0.25,
      threshold: -24
    })
  }

  if (effect.type === 'limiter') {
    return new Limiter({
      context: toneContext,
      threshold: -6
    })
  }

  return null
}

function ensureAudioEffectNode(effect) {
  if (!effect) {
    return null
  }

  const existingNode = audioEffectNodes.get(effect.id)

  if (existingNode) {
    return existingNode
  }

  const nextNode = createAudioEffectNode(effect)

  if (!nextNode) {
    return null
  }

  audioEffectNodes.set(effect.id, nextNode)
  return nextNode
}

function syncAudioEffectNode(effect) {
  const node = ensureAudioEffectNode(effect)

  if (!node) {
    return null
  }

  if (effect.type === 'eq') {
    node.low.value = normalizeDecibels(effect.params?.low)
    node.mid.value = normalizeDecibels(effect.params?.mid)
    node.high.value = normalizeDecibels(effect.params?.high)
    node.lowFrequency.value = normalizeFrequency(effect.params?.lowFrequency)
    node.highFrequency.value = normalizeFrequency(effect.params?.highFrequency)
    return node
  }

  if (effect.type === 'compressor') {
    node.threshold.value = normalizeThreshold(effect.params?.threshold)
    node.ratio.value = normalizeRatio(effect.params?.ratio)
    node.attack.value = normalizeTime(effect.params?.attack)
    node.release.value = normalizeTime(effect.params?.release)
    node.knee.value = normalizeKnee(effect.params?.knee)
    return node
  }

  if (effect.type === 'limiter') {
    node.threshold.value = normalizeThreshold(effect.params?.threshold)
    return node
  }

  return node
}

function syncAudioEffectNodes(audioEffects) {
  const activeIds = new Set(audioEffects.map((effect) => effect.id))

  for (const [effectId, node] of audioEffectNodes.entries()) {
    if (activeIds.has(effectId)) {
      continue
    }

    safeDisconnect(node)
    safeDispose(node)
    audioEffectNodes.delete(effectId)
  }

  return audioEffects
    .filter((effect) => effect.enabled)
    .map((effect) => syncAudioEffectNode(effect))
    .filter(Boolean)
}

function connectAudioGraph(audioEffects = currentAudioEffects) {
  if (!byteBeatNode || !audioContext) {
    return
  }

  safeDisconnect(byteBeatNode)
  const outputNode = ensureMasterGainNode()
  const nodes = syncAudioEffectNodes(audioEffects)

  if (!outputNode) {
    return
  }

  safeDisconnect(outputNode)

  if (!nodes.length) {
    toneConnect(byteBeatNode, outputNode)
    outputNode.connect(audioContext.destination)
    return
  }

  for (const node of nodes) {
    safeDisconnect(node)
  }

  let previousNode = byteBeatNode

  for (const node of nodes) {
    toneConnect(previousNode, node)
    previousNode = node
  }

  toneConnect(previousNode, outputNode)
  outputNode.connect(audioContext.destination)
}

function buildCompiledExpressions(expressions) {
  const nextExpressions = Array.isArray(expressions) && expressions.length
    ? expressions.map((expression) => expression ?? SILENT_FORMULA)
    : [SILENT_FORMULA]

  if (sampleOffset === 0) {
    return nextExpressions
  }

  return nextExpressions.map((expression) => `((t) => (${expression}))(t + ${sampleOffset})`)
}

function setSampleOffsetValue(sample) {
  const numericSample = Number(sample)
  sampleOffset = Number.isFinite(numericSample) ? Math.floor(numericSample) : 0
}

function sanitizeCompiledExpressions(compiledExpressions = []) {
  let replacedInvalidExpression = false

  const nextExpressions = compiledExpressions.map((expression) => {
    if (validateFormula(expression)) {
      return expression
    }

    replacedInvalidExpression = true
    return SILENT_FORMULA
  })

  return {
    expressions: nextExpressions,
    replacedInvalidExpression
  }
}

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext
}

async function createNode(providedAudioContext) {
  const AudioContextCtor = getAudioContextConstructor()

  if (!AudioContextCtor) {
    throw new Error('AudioContext no esta disponible en este navegador')
  }

  audioContext = providedAudioContext ?? new AudioContextCtor()
  toneContext = new ToneContext({ context: audioContext })

  const ByteBeatNode = await loadByteBeatNodeClass()
  await ByteBeatNode.setup(audioContext)

  byteBeatNode = new ByteBeatNode(audioContext)
  byteBeatNode.setExpressionType(ByteBeatNode.ExpressionType.infix)
  byteBeatNode.setType(ByteBeatNode.Type.byteBeat)
  byteBeatNode.setDesiredSampleRate(desiredSampleRate)
  await byteBeatNode.setExpressions([SILENT_FORMULA], true)
  ensureMasterGainNode()
  currentExpressionsKey = null

  return byteBeatNode
}

const bytebeatService = {
  async init(providedAudioContext) {
    if (byteBeatNode) {
      return byteBeatNode
    }

    if (!initPromise) {
      initPromise = createNode(providedAudioContext).catch((error) => {
        initPromise = null
        throw error
      })
    }

    return initPromise
  },

  async play({ resetTime = true } = {}) {
    const node = await this.init()

    this.releaseHeldSample()

    if (resetTime) {
      node.reset()
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    connectAudioGraph()
  },

  async unlock() {
    await this.init()

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  },

  async pause() {
    if (!byteBeatNode) {
      return
    }

    heldSample = this.getCurrentSample()
    await this.setExpressions([''], false, true)
  },

  async stop() {
    if (!byteBeatNode) {
      return
    }

    heldSample = null
    byteBeatNode.reset()
    currentExpressionsKey = null
    sampleOffset = 0
    await this.setExpressions([''], true, true)
  },

  async syncAudioEffects(audioEffects = []) {
    await this.init()
    currentAudioEffects = [...audioEffects]
    syncAudioEffectNodes(audioEffects)
  },

  async reconnectAudioGraph(audioEffects = currentAudioEffects) {
    await this.init()
    currentAudioEffects = [...audioEffects]
    connectAudioGraph(audioEffects)
  },

  async setMasterGain(value) {
    await this.init()
    masterGainValue = normalizeMasterGain(value)

    const outputNode = ensureMasterGainNode()

    if (outputNode) {
      outputNode.gain.value = masterGainValue
    }
  },

  async setExpressions(expressions, resetToZero = false, force = false) {
    const compiledExpressions = buildCompiledExpressions(expressions)
    const {
      expressions: playableExpressions,
      replacedInvalidExpression
    } = sanitizeCompiledExpressions(compiledExpressions)
    const nextExpressionsKey = JSON.stringify(playableExpressions)

    await this.init()

    if (!force && nextExpressionsKey === currentExpressionsKey) {
      return
    }

    formulaUpdatePromise = formulaUpdatePromise.catch(() => {}).then(async () => {
      if (!force && nextExpressionsKey === currentExpressionsKey) {
        return
      }

      await byteBeatNode.setExpressions(playableExpressions, resetToZero)
      currentExpressionsKey = nextExpressionsKey
    })

    return formulaUpdatePromise
  },

  async setFormula(formula, resetToZero = false, force = false) {
    return this.setExpressions([formula], resetToZero, force)
  },

  getCurrentSample() {
    if (heldSample !== null) {
      return heldSample
    }

    if (!byteBeatNode) {
      return sampleOffset
    }

    return sampleOffset + byteBeatNode.getTime()
  },

  async seekToSample(sample, expressions) {
    await this.init()

    heldSample = null
    setSampleOffsetValue(Math.max(0, sample))
    byteBeatNode.reset()
    currentExpressionsKey = null

    await this.setExpressions(expressions, true, true)
  },

  setDesiredSampleRate(sampleRate) {
    desiredSampleRate = sampleRate

    if (byteBeatNode) {
      byteBeatNode.setDesiredSampleRate(sampleRate)
    }
  },

  releaseHeldSample() {
    if (heldSample === null || !byteBeatNode) {
      return
    }

    setSampleOffsetValue(heldSample - byteBeatNode.getTime())
    heldSample = null
  },

  holdSample(sample) {
    heldSample = Math.max(0, Math.floor(sample))
  },

  setSampleOffset(sample) {
    heldSample = null
    setSampleOffsetValue(Math.max(0, sample))
  }
}

export default bytebeatService
