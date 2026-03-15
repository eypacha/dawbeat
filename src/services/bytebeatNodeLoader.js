const BYTEBEAT_SCRIPT_URL = '/vendors/ByteBeat.js'

let byteBeatNodeClass = null
let loadPromise = null

export async function loadByteBeatNodeClass() {
  if (byteBeatNodeClass) {
    return byteBeatNodeClass
  }

  if (typeof window === 'undefined') {
    throw new Error('ByteBeatNode no esta disponible fuera del navegador')
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
