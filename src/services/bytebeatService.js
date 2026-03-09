import { normalizeDecibels, normalizeDelayTime, normalizeMasterGain, normalizeMixValue, normalizeUnitValue } from '@/services/audioEffectService'
import { Macro_BitCrusherNode, Macro_DelayNode, Macro_ToneControlNode } from '@/utils/macroNodes'

const BYTEBEAT_SCRIPT_URL = '/vendors/ByteBeat.js'
const SILENT_FORMULA = '0'

let audioContext = null
let byteBeatNode = null
let byteBeatNodeClass = null
let loadPromise = null
let initPromise = null
let formulaUpdatePromise = Promise.resolve()
let currentExpressionsKey = null
let desiredSampleRate = 8000
let sampleOffset = 0
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
  if (!audioContext || !effect) {
    return null
  }

  switch (effect.type) {
    case 'bitcrusher':
      return new Macro_BitCrusherNode(audioContext, {
        bits: 0.45
      })

    case 'delay':
      return new Macro_DelayNode(audioContext, {
        delayTime: 0.18,
        feedback: 0.35,
        mix: 0.5
      })

    case 'eq':
      return new Macro_ToneControlNode(audioContext, {
        bass: 0,
        mid: 0,
        treble: 0
      })

    default:
      return null
  }
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

  const nextEnabled = Boolean(effect.enabled)

  if (typeof node.effect !== 'undefined' && node.effect !== nextEnabled) {
    node.effect = nextEnabled
  }

  if (effect.type === 'delay') {
    node.delayTime.value = normalizeDelayTime(effect.params?.delayTime)
    node.feedback.value = normalizeMixValue(effect.params?.feedback)
    node.mix.value = normalizeMixValue(effect.params?.mix)
    return node
  }

  if (effect.type === 'bitcrusher') {
    node.bits.value = normalizeUnitValue(effect.params?.bits)
    return node
  }

  if (effect.type === 'eq') {
    node.bass.value = normalizeDecibels(effect.params?.bass)
    node.mid.value = normalizeDecibels(effect.params?.mid)
    node.treble.value = normalizeDecibels(effect.params?.treble)
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
    audioEffectNodes.delete(effectId)
  }

  return audioEffects
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
    byteBeatNode.connect(outputNode)
    outputNode.connect(audioContext.destination)
    return
  }

  for (const node of nodes) {
    safeDisconnect(node)
  }

  let previousNode = byteBeatNode

  for (const node of nodes) {
    previousNode.connect(node)
    previousNode = node
  }

  previousNode.connect(outputNode)
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

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext
}

async function loadByteBeatNodeClass() {
  if (byteBeatNodeClass) {
    return byteBeatNodeClass
  }

  if (window.ByteBeatNode) {
    byteBeatNodeClass = window.ByteBeatNode
    return byteBeatNodeClass
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = BYTEBEAT_SCRIPT_URL
      script.async = true
      script.onload = () => {
        if (!window.ByteBeatNode) {
          reject(new Error('ByteBeatNode no esta disponible despues de cargar el vendor'))
          return
        }

        byteBeatNodeClass = window.ByteBeatNode
        resolve(byteBeatNodeClass)
      }
      script.onerror = () => reject(new Error(`No se pudo cargar ${BYTEBEAT_SCRIPT_URL}`))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

async function createNode(providedAudioContext) {
  const AudioContextCtor = getAudioContextConstructor()

  if (!AudioContextCtor) {
    throw new Error('AudioContext no esta disponible en este navegador')
  }

  audioContext = providedAudioContext ?? new AudioContextCtor()

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

    safeDisconnect(byteBeatNode)
  },

  async stop() {
    if (!byteBeatNode) {
      return
    }

    safeDisconnect(byteBeatNode)
    byteBeatNode.reset()
    currentExpressionsKey = null
    sampleOffset = 0
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
    const nextExpressionsKey = JSON.stringify(compiledExpressions)

    await this.init()

    if (!force && nextExpressionsKey === currentExpressionsKey) {
      return
    }

    formulaUpdatePromise = formulaUpdatePromise.catch(() => {}).then(async () => {
      if (!force && nextExpressionsKey === currentExpressionsKey) {
        return
      }

      await byteBeatNode.setExpressions(compiledExpressions, resetToZero)
      currentExpressionsKey = nextExpressionsKey
    })

    return formulaUpdatePromise
  },

  async setFormula(formula, resetToZero = false, force = false) {
    return this.setExpressions([formula], resetToZero, force)
  },

  getCurrentSample() {
    if (!byteBeatNode) {
      return sampleOffset
    }

    return sampleOffset + byteBeatNode.getTime()
  },

  async seekToSample(sample, expressions) {
    await this.init()

    sampleOffset = Math.max(0, Math.floor(sample))
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

  setSampleOffset(sample) {
    sampleOffset = Math.max(0, Math.floor(sample))
  }
}

export default bytebeatService
