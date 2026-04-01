import encoderWorkerUrl from 'opus-recorder/dist/encoderWorker.min.js?url'

const DEFAULT_OGG_OPUS_EXPORT_CONFIG = {
  encoderApplication: 2049,
  encoderFrameSize: 20,
  maxFramesPerPage: 40,
  numberOfChannels: 2,
  resampleQuality: 3,
  streamPages: false
}

const OGG_OPUS_UNAVAILABLE_MESSAGE = 'OGG Opus export is unavailable in this browser/build.'
const WORKER_READY_TIMEOUT_MS = 5000
const WORKER_DONE_TIMEOUT_MS = 120000
const OGG_OPUS_ENCODE_CHUNK_SIZE = 4096

export async function encodePcmToOggOpus(
  channelData,
  { bitrate = 128, onProgress = null, sampleRate = 48000 } = {}
) {
  const normalizedChannelData = normalizeChannelData(channelData)
  const normalizedSampleRate = normalizeSampleRate(sampleRate)
  const worker = createEncoderWorker()
  const pages = []
  let totalLength = 0

  const readyState = createDeferred()
  const doneState = createDeferred()

  const handleMessage = (event) => {
    const message = event.data

    if (message?.message === 'page' && message.page) {
      const page = normalizePage(message.page)
      pages.push(page)
      totalLength += page.length
      return
    }

    if (message?.message === 'ready') {
      readyState.resolve()
      return
    }

    if (message?.message === 'done') {
      doneState.resolve()
    }
  }

  const handleError = () => {
    const error = new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
    readyState.reject(error)
    doneState.reject(error)
  }

  worker.addEventListener('message', handleMessage)
  worker.addEventListener('error', handleError)
  worker.addEventListener('messageerror', handleError)

  try {
    worker.postMessage({
      command: 'init',
      ...DEFAULT_OGG_OPUS_EXPORT_CONFIG,
      encoderBitRate: Math.max(1, Math.round(Number(bitrate) || 128)) * 1000,
      encoderSampleRate: normalizedSampleRate,
      originalSampleRate: normalizedSampleRate
    })

    await withTimeout(readyState.promise, WORKER_READY_TIMEOUT_MS)

    reportProgress(onProgress, 0)

    worker.postMessage({
      command: 'getHeaderPages'
    })

    const totalFrames = normalizedChannelData[0].length

    for (let frameOffset = 0; frameOffset < totalFrames; frameOffset += OGG_OPUS_ENCODE_CHUNK_SIZE) {
      const chunkEnd = Math.min(totalFrames, frameOffset + OGG_OPUS_ENCODE_CHUNK_SIZE)
      const chunk = normalizedChannelData.map((channel) => channel.slice(frameOffset, chunkEnd))

      worker.postMessage({
        buffers: chunk,
        command: 'encode'
      }, chunk.map((channel) => channel.buffer))

      reportProgress(onProgress, chunkEnd / totalFrames)
      await waitForWorkerTick()
    }

    worker.postMessage({
      command: 'done'
    })

    await withTimeout(doneState.promise, WORKER_DONE_TIMEOUT_MS)
    reportProgress(onProgress, 1)

    return concatenatePages(pages, totalLength)
  } catch (error) {
    if (error instanceof Error && error.message === OGG_OPUS_UNAVAILABLE_MESSAGE) {
      throw error
    }

    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  } finally {
    worker.removeEventListener('message', handleMessage)
    worker.removeEventListener('error', handleError)
    worker.removeEventListener('messageerror', handleError)
    worker.terminate()
  }
}

function createEncoderWorker() {
  if (typeof Worker !== 'function') {
    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  }

  try {
    return new Worker(encoderWorkerUrl)
  } catch {
    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  }
}

function normalizeChannelData(channelData) {
  if (!Array.isArray(channelData) || channelData.length !== 2) {
    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  }

  const normalizedChannels = channelData.map((channel) =>
    channel instanceof Float32Array ? channel : new Float32Array(channel ?? [])
  )
  const expectedLength = normalizedChannels[0]?.length ?? 0

  if (!expectedLength || normalizedChannels.some((channel) => channel.length !== expectedLength)) {
    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  }

  return normalizedChannels
}

function normalizeSampleRate(sampleRate) {
  const numericSampleRate = Number(sampleRate)

  if (!Number.isFinite(numericSampleRate) || numericSampleRate <= 0) {
    throw new Error(OGG_OPUS_UNAVAILABLE_MESSAGE)
  }

  return Math.round(numericSampleRate)
}

function normalizePage(page) {
  if (page instanceof Uint8Array) {
    return page
  }

  if (page instanceof ArrayBuffer) {
    return new Uint8Array(page)
  }

  return new Uint8Array(page?.buffer ?? [])
}

function concatenatePages(pages, totalLength) {
  const output = new Uint8Array(totalLength)
  let writeOffset = 0

  for (const page of pages) {
    output.set(page, writeOffset)
    writeOffset += page.length
  }

  return output.buffer
}

function createDeferred() {
  let settled = false
  let resolvePromise = () => {}
  let rejectPromise = () => {}

  const promise = new Promise((resolve, reject) => {
    resolvePromise = () => {
      if (settled) {
        return
      }

      settled = true
      resolve()
    }

    rejectPromise = (error) => {
      if (settled) {
        return
      }

      settled = true
      reject(error)
    }
  })

  return {
    promise,
    reject: rejectPromise,
    resolve: resolvePromise
  }
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(OGG_OPUS_UNAVAILABLE_MESSAGE))
    }, timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function reportProgress(onProgress, progress) {
  if (typeof onProgress !== 'function') {
    return
  }

  const numericProgress = Number(progress)
  onProgress(Math.max(0, Math.min(1, Number.isFinite(numericProgress) ? numericProgress : 0)))
}

function waitForWorkerTick() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}
