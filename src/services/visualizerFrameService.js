import { clamp, ticksToSamples } from '@/utils/timeUtils'

export const FORMULA_PREVIEW_MAX_SPAN_SAMPLES = 8192
export const FORMULA_PREVIEW_MIN_SPAN_SAMPLES = 1024
export const FORMULA_PREVIEW_SAMPLE_COUNT = 192
export const FORMULA_PREVIEW_WINDOW_SECONDS = 0.5
export const FORMULA_PREVIEW_WINDOW_STEP_DIVISOR = 2
export const VISUALIZER_ANALYSER_FFT_SIZE = 2048
export const VISUALIZER_ANALYSER_SMOOTHING_FACTOR = 0.78
export const VISUALIZER_MIN_DECIBELS = -96
export const VISUALIZER_MAX_DECIBELS = -18

export function createLiveVisualizerBuffers() {
  return {
    frequencyData: null,
    leftTimeDomainData: null,
    rightTimeDomainData: null,
    timeDomainData: null
  }
}

export function ensureLiveVisualizerBuffers(buffers, analyser, stereoAnalysers) {
  if (!buffers) {
    return createLiveVisualizerBuffers()
  }

  if (!analyser) {
    buffers.frequencyData = null
    buffers.timeDomainData = null
  } else {
    if (!buffers.frequencyData || buffers.frequencyData.length !== analyser.frequencyBinCount) {
      buffers.frequencyData = new Uint8Array(analyser.frequencyBinCount)
    }

    if (!buffers.timeDomainData || buffers.timeDomainData.length !== analyser.fftSize) {
      buffers.timeDomainData = new Uint8Array(analyser.fftSize)
    }
  }

  if (!stereoAnalysers?.left || !stereoAnalysers?.right) {
    buffers.leftTimeDomainData = null
    buffers.rightTimeDomainData = null
    return buffers
  }

  if (!buffers.leftTimeDomainData || buffers.leftTimeDomainData.length !== stereoAnalysers.left.fftSize) {
    buffers.leftTimeDomainData = new Uint8Array(stereoAnalysers.left.fftSize)
  }

  if (!buffers.rightTimeDomainData || buffers.rightTimeDomainData.length !== stereoAnalysers.right.fftSize) {
    buffers.rightTimeDomainData = new Uint8Array(stereoAnalysers.right.fftSize)
  }

  return buffers
}

export function getFormulaPreviewSampleWindow({
  sampleRate,
  tickSize,
  timeTicks
}) {
  const spanSamples = clamp(
    Math.round((Number(sampleRate) || 0) * FORMULA_PREVIEW_WINDOW_SECONDS),
    FORMULA_PREVIEW_MIN_SPAN_SAMPLES,
    FORMULA_PREVIEW_MAX_SPAN_SAMPLES
  )
  const currentSample = Number.isFinite(Number(timeTicks))
    ? ticksToSamples(timeTicks, tickSize)
    : 0
  const stepSamples = Math.max(
    128,
    Math.floor(spanSamples / FORMULA_PREVIEW_WINDOW_STEP_DIVISOR)
  )
  const startSample = Math.max(
    0,
    Math.floor(currentSample / stepSamples) * stepSamples
  )

  return {
    endSample: startSample + spanSamples,
    startSample
  }
}

export function buildLiveVisualizerFrameData({
  analyser,
  stereoAnalysers,
  buffers,
  formulaWaveforms = [],
  overlayExpressions = [],
  previousLevel = 0,
  waterfallState = null
}) {
  if (
    !analyser
    || !buffers?.frequencyData
    || !buffers?.timeDomainData
  ) {
    return createVisualizerFrameData({
      formulaWaveforms,
      overlayExpressions,
      previousLevel,
      waterfallState
    })
  }

  analyser.getByteFrequencyData(buffers.frequencyData)
  analyser.getByteTimeDomainData(buffers.timeDomainData)

  let leftWaveform = null
  let rightWaveform = null

  if (
    stereoAnalysers?.left
    && stereoAnalysers?.right
    && buffers.leftTimeDomainData
    && buffers.rightTimeDomainData
  ) {
    stereoAnalysers.left.getByteTimeDomainData(buffers.leftTimeDomainData)
    stereoAnalysers.right.getByteTimeDomainData(buffers.rightTimeDomainData)
    leftWaveform = normalizeTimeDomainBuffer(buffers.leftTimeDomainData)
    rightWaveform = normalizeTimeDomainBuffer(buffers.rightTimeDomainData)
  }

  return createVisualizerFrameData({
    formulaWaveforms,
    monoWaveform: normalizeTimeDomainBuffer(buffers.timeDomainData),
    overlayExpressions,
    previousLevel,
    spectrum: normalizeFrequencyBuffer(buffers.frequencyData),
    stereoWaveform: leftWaveform && rightWaveform
      ? {
          left: leftWaveform,
          right: rightWaveform
        }
      : null,
    waterfallState
  })
}

export function createVisualizerFrameData({
  formulaWaveforms = [],
  monoWaveform = null,
  overlayExpressions = [],
  previousLevel = 0,
  spectrum = null,
  stereoWaveform = null,
  waterfallState = null
} = {}) {
  const waveform = monoWaveform?.length ? monoWaveform : null
  const normalizedSpectrum = spectrum?.length
    ? spectrum
    : waveform?.length
      ? buildNormalizedSpectrum(waveform)
      : null
  const nextLevel = waveform?.length
    ? smoothSignalLevel(previousLevel, measureSignalLevel(waveform))
    : 0

  return {
    frameData: {
      formulaWaveforms,
      level: nextLevel,
      monoWaveform: waveform,
      overlayExpressions,
      spectrum: normalizedSpectrum,
      stereoWaveform,
      waterfallState
    },
    level: nextLevel
  }
}

export function normalizeTimeDomainBuffer(buffer) {
  if (!buffer?.length) {
    return null
  }

  const waveform = new Float32Array(buffer.length)

  for (let index = 0; index < buffer.length; index += 1) {
    waveform[index] = clamp(((buffer[index] ?? 128) - 128) / 128, -1, 1)
  }

  return waveform
}

export function normalizeFrequencyBuffer(buffer) {
  if (!buffer?.length) {
    return null
  }

  const spectrum = new Float32Array(buffer.length)

  for (let index = 0; index < buffer.length; index += 1) {
    spectrum[index] = clamp((buffer[index] ?? 0) / 255, 0, 1)
  }

  return spectrum
}

export function measureSignalLevel(waveform) {
  if (!waveform?.length) {
    return 0
  }

  let totalPower = 0

  for (let index = 0; index < waveform.length; index += 1) {
    totalPower += waveform[index] * waveform[index]
  }

  return Math.min(1, Math.sqrt(totalPower / waveform.length) * 2.5)
}

export function smoothSignalLevel(previousLevel, nextLevel) {
  return previousLevel * VISUALIZER_ANALYSER_SMOOTHING_FACTOR
    + nextLevel * (1 - VISUALIZER_ANALYSER_SMOOTHING_FACTOR)
}

export function sampleAudioChannelWindow(channelData, endSample, windowSize = VISUALIZER_ANALYSER_FFT_SIZE) {
  const sampleWindow = new Float32Array(windowSize)

  if (!channelData?.length) {
    return sampleWindow
  }

  const normalizedEndSample = Math.max(0, Math.floor(Number(endSample) || 0))
  const startSample = Math.max(0, normalizedEndSample - windowSize)
  const sourceLength = Math.max(0, normalizedEndSample - startSample)
  const destinationOffset = Math.max(0, windowSize - sourceLength)

  for (let index = 0; index < sourceLength; index += 1) {
    sampleWindow[destinationOffset + index] = clamp(channelData[startSample + index] ?? 0, -1, 1)
  }

  return sampleWindow
}

export function mixWaveforms(leftWaveform, rightWaveform) {
  if (!leftWaveform?.length && !rightWaveform?.length) {
    return null
  }

  if (!rightWaveform?.length) {
    return new Float32Array(leftWaveform)
  }

  if (!leftWaveform?.length) {
    return new Float32Array(rightWaveform)
  }

  const mixed = new Float32Array(Math.max(leftWaveform.length, rightWaveform.length))

  for (let index = 0; index < mixed.length; index += 1) {
    mixed[index] = clamp(
      ((leftWaveform[index] ?? 0) + (rightWaveform[index] ?? 0)) * 0.5,
      -1,
      1
    )
  }

  return mixed
}

export function buildNormalizedSpectrum(waveform) {
  if (!waveform?.length) {
    return null
  }

  const size = getNextPowerOfTwo(waveform.length)
  const real = new Float32Array(size)
  const imag = new Float32Array(size)

  for (let index = 0; index < waveform.length; index += 1) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, waveform.length - 1))
    real[index] = (waveform[index] ?? 0) * window
  }

  performFft(real, imag)

  const spectrum = new Float32Array(size / 2)

  for (let index = 0; index < spectrum.length; index += 1) {
    const magnitude = Math.sqrt(real[index] * real[index] + imag[index] * imag[index]) / size
    const decibels = 20 * Math.log10(magnitude + 1e-8)
    spectrum[index] = clamp(
      (decibels - VISUALIZER_MIN_DECIBELS)
        / (VISUALIZER_MAX_DECIBELS - VISUALIZER_MIN_DECIBELS),
      0,
      1
    )
  }

  return spectrum
}

function getNextPowerOfTwo(value) {
  let nextValue = 1

  while (nextValue < value) {
    nextValue <<= 1
  }

  return nextValue
}

function performFft(real, imag) {
  const size = real.length
  let reversedIndex = 0

  for (let index = 0; index < size; index += 1) {
    if (index < reversedIndex) {
      const realValue = real[index]
      const imagValue = imag[index]
      real[index] = real[reversedIndex]
      imag[index] = imag[reversedIndex]
      real[reversedIndex] = realValue
      imag[reversedIndex] = imagValue
    }

    let bit = size >> 1

    while (bit > 0 && reversedIndex >= bit) {
      reversedIndex -= bit
      bit >>= 1
    }

    reversedIndex += bit
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfBlockSize = blockSize >> 1
    const phaseStep = (-2 * Math.PI) / blockSize

    for (let blockStart = 0; blockStart < size; blockStart += blockSize) {
      for (let blockIndex = 0; blockIndex < halfBlockSize; blockIndex += 1) {
        const phase = phaseStep * blockIndex
        const cosine = Math.cos(phase)
        const sine = Math.sin(phase)
        const evenIndex = blockStart + blockIndex
        const oddIndex = evenIndex + halfBlockSize
        const oddReal = real[oddIndex] * cosine - imag[oddIndex] * sine
        const oddImag = real[oddIndex] * sine + imag[oddIndex] * cosine

        real[oddIndex] = real[evenIndex] - oddReal
        imag[oddIndex] = imag[evenIndex] - oddImag
        real[evenIndex] += oddReal
        imag[evenIndex] += oddImag
      }
    }
  }
}
