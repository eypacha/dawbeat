const BYTEBEAT_SCRIPT_URL = '/vendors/ByteBeat.js'
const SILENT_FORMULA = '0'

let audioContext = null
let byteBeatNode = null
let byteBeatNodeClass = null
let loadPromise = null
let initPromise = null
let formulaUpdatePromise = Promise.resolve()
let currentFormula = null
let desiredSampleRate = 8000

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
  currentFormula = null

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
    currentFormula = null
  },

  async setFormula(formula, resetToZero = false) {
    const nextFormula = formula ?? SILENT_FORMULA

    await this.init()

    if (nextFormula === currentFormula) {
      return
    }

    formulaUpdatePromise = formulaUpdatePromise.catch(() => {}).then(async () => {
      if (nextFormula === currentFormula) {
        return
      }

      await byteBeatNode.setExpressions([nextFormula], resetToZero)
      currentFormula = nextFormula
    })

    return formulaUpdatePromise
  },

  getCurrentSample() {
    if (!byteBeatNode) {
      return 0
    }

    return byteBeatNode.getTime()
  },

  setDesiredSampleRate(sampleRate) {
    desiredSampleRate = sampleRate

    if (byteBeatNode) {
      byteBeatNode.setDesiredSampleRate(sampleRate)
    }
  }
}

export default bytebeatService
