import { Compressor, Context as ToneContext, Distortion, EQ3, FeedbackDelay, Limiter, Reverb, StereoWidener, connect as toneConnect } from 'tone'
import {
  normalizeDecay,
  normalizeDecibels,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeMasterGain,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeWet,
  normalizeWidth
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
let transportMuted = true
let masterGainNode = null
let transportGainNode = null
let transportFadeGeneration = 0
let outputAnalyserNode = null
let outputChannelSplitterNode = null
let outputLeftAnalyserNode = null
let outputRightAnalyserNode = null
const audioEffectNodes = new Map()

/** Short fade on the dedicated transport gain to avoid clicks on play/pause/stop. */
const TRANSPORT_FADE_SEC = 0.012

function bumpTransportFadeGeneration() {
  transportFadeGeneration += 1
  return transportFadeGeneration
}

function waitTransportFadeMs() {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.ceil(TRANSPORT_FADE_SEC * 1000) + 5)
  })
}

function rampTransportGainTo(target) {
  const node = ensureTransportGainNode()

  if (!node || !audioContext) {
    return
  }

  const param = node.gain
  const now = audioContext.currentTime

  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(target, now + TRANSPORT_FADE_SEC)
}

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

function ensureTransportGainNode() {
  if (!audioContext) {
    return null
  }

  if (!transportGainNode) {
    transportGainNode = new GainNode(audioContext, { gain: transportMuted ? 0 : 1 })
  }

  return transportGainNode
}

function ensureOutputAnalyserNode() {
  if (!audioContext) {
    return null
  }

  if (!outputAnalyserNode) {
    outputAnalyserNode = new AnalyserNode(audioContext, {
      fftSize: 2048,
      maxDecibels: -18,
      minDecibels: -96,
      smoothingTimeConstant: 0.82
    })
  }

  return outputAnalyserNode
}

function ensureOutputStereoAnalyserNodes() {
  if (!audioContext) {
    return null
  }

  if (!outputChannelSplitterNode) {
    outputChannelSplitterNode = new ChannelSplitterNode(audioContext, {
      numberOfOutputs: 2
    })
  }

  if (!outputLeftAnalyserNode) {
    outputLeftAnalyserNode = new AnalyserNode(audioContext, {
      fftSize: 2048,
      maxDecibels: -18,
      minDecibels: -96,
      smoothingTimeConstant: 0.82
    })
  }

  if (!outputRightAnalyserNode) {
    outputRightAnalyserNode = new AnalyserNode(audioContext, {
      fftSize: 2048,
      maxDecibels: -18,
      minDecibels: -96,
      smoothingTimeConstant: 0.82
    })
  }

  return {
    left: outputLeftAnalyserNode,
    right: outputRightAnalyserNode,
    splitter: outputChannelSplitterNode
  }
}

function connectOutputNodeToDestination(outputNode) {
  if (!audioContext || !outputNode) {
    return
  }

  const analyserNode = ensureOutputAnalyserNode()
  const stereoNodes = ensureOutputStereoAnalyserNodes()

  outputNode.connect(audioContext.destination)

  if (analyserNode) {
    safeDisconnect(analyserNode)
    outputNode.connect(analyserNode)
  }

  if (!stereoNodes?.splitter || !stereoNodes.left || !stereoNodes.right) {
    return
  }

  safeDisconnect(stereoNodes.splitter)
  outputNode.connect(stereoNodes.splitter)
  stereoNodes.splitter.connect(stereoNodes.left, 0)
  stereoNodes.splitter.connect(stereoNodes.right, 1)
}

async function createAudioEffectNode(effect) {
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

  if (effect.type === 'distortion') {
    return new Distortion({
      context: toneContext,
      distortion: 0.4,
      oversample: '2x',
      wet: 0.35
    })
  }

  if (effect.type === 'stereoWidener') {
    return new StereoWidener({
      context: toneContext,
      width: 0.5
    })
  }

  if (effect.type === 'delay') {
    return new FeedbackDelay({
      context: toneContext,
      delayTime: 0.25,
      feedback: 0.35,
      wet: 0.25
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

  if (effect.type === 'reverb') {
    const node = new Reverb({
      context: toneContext,
      decay: 2.5,
      preDelay: 0.02,
      wet: 0.3
    })

    await node.ready
    return node
  }

  return null
}

async function ensureAudioEffectNode(effect) {
  if (!effect) {
    return null
  }

  const existingNode = audioEffectNodes.get(effect.id)

  if (existingNode) {
    return existingNode
  }

  const nextNode = await createAudioEffectNode(effect)

  if (!nextNode) {
    return null
  }

  audioEffectNodes.set(effect.id, nextNode)
  return nextNode
}

async function syncAudioEffectNode(effect) {
  const node = await ensureAudioEffectNode(effect)

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

  if (effect.type === 'distortion') {
    node.distortion = normalizeDrive(effect.params?.drive)
    node.wet.value = normalizeWet(effect.params?.wet)
    return node
  }

  if (effect.type === 'stereoWidener') {
    node.width.value = normalizeWidth(effect.params?.width)
    return node
  }

  if (effect.type === 'delay') {
    node.delayTime.value = normalizeTime(effect.params?.delayTime)
    node.feedback.value = normalizeFeedback(effect.params?.feedback)
    node.wet.value = normalizeWet(effect.params?.wet)
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

  if (effect.type === 'reverb') {
    node.wet.value = normalizeWet(effect.params?.wet)
    node.decay = normalizeDecay(effect.params?.decay)
    node.preDelay = normalizeTime(effect.params?.preDelay)
    await node.ready
    return node
  }

  return node
}

async function syncAudioEffectNodes(audioEffects) {
  const activeIds = new Set(audioEffects.map((effect) => effect.id))

  for (const [effectId, node] of audioEffectNodes.entries()) {
    if (activeIds.has(effectId)) {
      continue
    }

    safeDisconnect(node)
    safeDispose(node)
    audioEffectNodes.delete(effectId)
  }

  const nodes = await Promise.all(
    audioEffects
      .filter((effect) => effect.enabled)
      .map((effect) => syncAudioEffectNode(effect))
  )

  return nodes.filter(Boolean)
}

async function connectAudioGraph(audioEffects = currentAudioEffects) {
  if (!byteBeatNode || !audioContext) {
    return
  }

  safeDisconnect(byteBeatNode)
  const masterOut = ensureMasterGainNode()
  const transportOut = ensureTransportGainNode()
  const nodes = await syncAudioEffectNodes(audioEffects)

  if (!masterOut || !transportOut) {
    return
  }

  safeDisconnect(masterOut)
  safeDisconnect(transportOut)

  if (!nodes.length) {
    toneConnect(byteBeatNode, masterOut)
  } else {
    for (const node of nodes) {
      safeDisconnect(node)
    }

    let previousNode = byteBeatNode

    for (const node of nodes) {
      toneConnect(previousNode, node)
      previousNode = node
    }

    toneConnect(previousNode, masterOut)
  }

  toneConnect(masterOut, transportOut)
  connectOutputNodeToDestination(transportOut)
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
  ensureTransportGainNode()
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

    bumpTransportFadeGeneration()
    this.releaseHeldSample()
    transportMuted = false

    if (resetTime) {
      node.reset()
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    await connectAudioGraph()
    rampTransportGainTo(1)
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
    transportMuted = true
    const gen = bumpTransportFadeGeneration()
    rampTransportGainTo(0)
    await waitTransportFadeMs()

    if (gen !== transportFadeGeneration) {
      return
    }

    await this.setExpressions([SILENT_FORMULA], false, true)
  },

  async stop() {
    if (!byteBeatNode) {
      return
    }

    heldSample = null
    transportMuted = true
    const gen = bumpTransportFadeGeneration()
    rampTransportGainTo(0)
    await waitTransportFadeMs()

    if (gen !== transportFadeGeneration) {
      return
    }

    byteBeatNode.reset()
    currentExpressionsKey = null
    sampleOffset = 0
    await this.setExpressions([''], true, true)
  },

  async syncAudioEffects(audioEffects = []) {
    await this.init()
    currentAudioEffects = [...audioEffects]
    await syncAudioEffectNodes(audioEffects)
  },

  async reconnectAudioGraph(audioEffects = currentAudioEffects) {
    await this.init()
    currentAudioEffects = [...audioEffects]
    await connectAudioGraph(audioEffects)
  },

  async setMasterGain(value) {
    await this.init()
    masterGainValue = normalizeMasterGain(value)

    const outputNode = ensureMasterGainNode()

    if (outputNode) {
      outputNode.gain.value = masterGainValue
    }
  },

  async syncMasterGainAtTime(currentTime, store) {
    const automationValue =
      typeof store?.getAutomationValueAt === 'function'
        ? store.getAutomationValueAt(currentTime, 'masterGain')
        : null

    const gain = automationValue ?? store?.masterGain ?? masterGainValue
    await this.setMasterGain(gain)
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
  },

  getOutputAnalyser() {
    return ensureOutputAnalyserNode()
  },

  getOutputStereoAnalysers() {
    const stereoNodes = ensureOutputStereoAnalyserNodes()

    if (!stereoNodes) {
      return null
    }

    return {
      left: stereoNodes.left,
      right: stereoNodes.right
    }
  }
}

export default bytebeatService
