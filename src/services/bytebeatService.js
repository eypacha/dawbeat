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

    node.connect(audioContext.destination)
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

    byteBeatNode.disconnect()
  },

  async stop() {
    if (!byteBeatNode) {
      return
    }

    byteBeatNode.disconnect()
    byteBeatNode.reset()
    currentExpressionsKey = null
    sampleOffset = 0
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
