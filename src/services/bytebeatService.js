import { normalizeDelayTime, normalizeMixValue } from '@/services/audioEffectService'
import { Macro_DelayNode } from '@/utils/macroNodes'

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
let delayNode = null

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

function ensureDelayNode() {
  if (!audioContext || delayNode) {
    return delayNode
  }

  delayNode = new Macro_DelayNode(audioContext, {
    delayTime: 0.18,
    feedback: 0.35,
    mix: 0.5
  })

  return delayNode
}

function connectAudioGraph() {
  if (!byteBeatNode || !audioContext) {
    return
  }

  safeDisconnect(byteBeatNode)

  if (!delayNode) {
    byteBeatNode.connect(audioContext.destination)
    return
  }

  safeDisconnect(delayNode)
  delayNode.connect(audioContext.destination)
  byteBeatNode.connect(delayNode)
}

function syncDelayNode(effect) {
  if (!effect || effect.type !== 'delay') {
    if (delayNode && delayNode.effect !== false) {
      delayNode.effect = false
    }

    return
  }

  const node = ensureDelayNode()

  if (!node) {
    return
  }

  const nextEnabled = Boolean(effect.enabled)

  if (node.effect !== nextEnabled) {
    node.effect = nextEnabled
  }

  node.delayTime.value = normalizeDelayTime(effect.params?.delayTime)
  node.feedback.value = normalizeMixValue(effect.params?.feedback)
  node.mix.value = normalizeMixValue(effect.params?.mix)
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

    const delayEffect = audioEffects.find((effect) => effect.type === 'delay') ?? null
    syncDelayNode(delayEffect)
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
