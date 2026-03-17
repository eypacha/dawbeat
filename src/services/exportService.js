import { getActiveFormula } from '@/engine/timelineEngine'
import { applyEvalEffects } from '@/services/evalEffectService'
import { DEFAULT_SAMPLE_RATE } from '@/utils/audioSettings'
import { validateFormula } from '@/utils/formulaValidation'
import { getClipEnd, samplesToTicks, ticksToSamples } from '@/utils/timeUtils'

const SILENT_EVALUATOR = () => 0
const DEFAULT_EXPORT_WAV_SAMPLE_RATE = 44100

export async function downloadProjectWav(state, filename = createWavFilename()) {
  const wavBuffer = await renderProjectToWav(state)
  const blob = new Blob([wavBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

async function renderProjectToWav(state) {
  const totalTicks = getProjectDurationTicks(state.tracks)

  if (totalTicks <= 0) {
    throw new Error('Project is empty')
  }

  const sourceSampleRate = getSourceSampleRate(state.sampleRate)
  const outputSampleRate = getOutputSampleRate(sourceSampleRate)
  const totalSourceSamples = Math.max(1, Math.ceil(ticksToSamples(totalTicks, state.tickSize)))
  const totalOutputSamples = Math.max(
    1,
    Math.ceil((totalSourceSamples * outputSampleRate) / sourceSampleRate)
  )
  const [leftChannel, rightChannel] = renderTimelineChannels(state, {
    outputSampleRate,
    sourceSampleRate,
    totalOutputSamples,
    totalSourceSamples
  })

  return encodeWavFile({
    channelData: [leftChannel, rightChannel],
    sampleRate: outputSampleRate
  })
}

function renderTimelineChannels(
  state,
  { outputSampleRate, sourceSampleRate, totalOutputSamples, totalSourceSamples }
) {
  const leftChannel = new Float32Array(totalOutputSamples)
  const rightChannel = new Float32Array(totalOutputSamples)
  const boundaries = collectTimelineBoundaries(
    state.tracks,
    state.variableTracks,
    state.tickSize,
    totalSourceSamples
  )
  const evaluatorCache = new Map()

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startSourceSample = boundaries[index]
    const endSourceSample = boundaries[index + 1]

    if (endSourceSample <= startSourceSample) {
      continue
    }

    const startOutputSample = convertSourceBoundaryToOutputSample(
      startSourceSample,
      sourceSampleRate,
      outputSampleRate,
      totalOutputSamples
    )
    const endOutputSample = convertSourceBoundaryToOutputSample(
      endSourceSample,
      sourceSampleRate,
      outputSampleRate,
      totalOutputSamples
    )

    if (endOutputSample <= startOutputSample) {
      continue
    }

    const timeTicks = samplesToTicks(startSourceSample, state.tickSize)
    const activeFormula = getActiveFormula(
      timeTicks,
      state.tracks,
      state.formulas,
      state.variableTracks
    )
    const expressions = getRenderableExpressions(activeFormula, state.evalEffects)

    if (!expressions.length) {
      continue
    }

    const leftEvaluator = getExpressionEvaluator(expressions[0], evaluatorCache)
    const rightEvaluator = getExpressionEvaluator(expressions[1] ?? expressions[0], evaluatorCache)

    for (let outputSample = startOutputSample; outputSample < endOutputSample; outputSample += 1) {
      const sourceSample = convertOutputSampleToSourceSample(
        outputSample,
        sourceSampleRate,
        outputSampleRate
      )

      leftChannel[outputSample] = clampAudioSample(
        evaluateBytebeatSample(leftEvaluator, sourceSample) * state.masterGain
      )
      rightChannel[outputSample] = clampAudioSample(
        evaluateBytebeatSample(rightEvaluator, sourceSample) * state.masterGain
      )
    }
  }

  return [leftChannel, rightChannel]
}

function collectTimelineBoundaries(tracks, variableTracks, tickSize, totalSamples) {
  const boundaries = new Set([0, totalSamples])

  for (const track of tracks) {
    for (const clip of track.clips) {
      boundaries.add(clampSampleBoundary(ticksToSamples(clip.start, tickSize), totalSamples))
      boundaries.add(clampSampleBoundary(ticksToSamples(getClipEnd(clip), tickSize), totalSamples))
    }
  }

  for (const variableTrack of variableTracks ?? []) {
    for (const clip of variableTrack.clips) {
      boundaries.add(clampSampleBoundary(ticksToSamples(clip.start, tickSize), totalSamples))
      boundaries.add(clampSampleBoundary(ticksToSamples(getClipEnd(clip), tickSize), totalSamples))
    }
  }

  return [...boundaries].sort((left, right) => left - right)
}

function clampSampleBoundary(sample, totalSamples) {
  return Math.min(totalSamples, Math.max(0, Math.floor(sample)))
}

function getSourceSampleRate(sampleRate) {
  const numericValue = Number(sampleRate)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_SAMPLE_RATE
  }

  return Math.max(1, Math.floor(numericValue))
}

function getOutputSampleRate(sourceSampleRate) {
  return Math.max(DEFAULT_EXPORT_WAV_SAMPLE_RATE, sourceSampleRate)
}

function convertSourceBoundaryToOutputSample(
  sourceSample,
  sourceSampleRate,
  outputSampleRate,
  totalOutputSamples
) {
  const outputSample = Math.ceil((sourceSample * outputSampleRate) / sourceSampleRate)
  return Math.min(totalOutputSamples, Math.max(0, outputSample))
}

function convertOutputSampleToSourceSample(outputSample, sourceSampleRate, outputSampleRate) {
  return Math.floor((outputSample * sourceSampleRate) / outputSampleRate)
}

function getProjectDurationTicks(tracks) {
  let maxEnd = 0

  for (const track of tracks) {
    for (const clip of track.clips) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  return maxEnd
}

function getRenderableExpressions(activeFormula, evalEffects) {
  if (typeof activeFormula !== 'string' || !activeFormula.trim()) {
    return []
  }

  return applyEvalEffects(activeFormula, evalEffects)
    .filter((expression) => typeof expression === 'string' && expression.trim())
}

function getExpressionEvaluator(expression, cache) {
  if (!expression) {
    return SILENT_EVALUATOR
  }

  const cachedEvaluator = cache.get(expression)

  if (cachedEvaluator) {
    return cachedEvaluator
  }

  let evaluator = SILENT_EVALUATOR

  try {
    if (validateFormula(expression)) {
      // eslint-disable-next-line no-new-func
      evaluator = new Function('t', `return (${expression})`)
    }
  } catch {
    evaluator = SILENT_EVALUATOR
  }

  cache.set(expression, evaluator)
  return evaluator
}

function evaluateBytebeatSample(evaluator, time) {
  try {
    const value = evaluator(time)
    const numericValue = Array.isArray(value) ? value[0] : value

    if (!Number.isFinite(numericValue)) {
      return 0
    }

    return ((numericValue & 255) / 127) - 1
  } catch {
    return 0
  }
}

function clampAudioSample(value) {
  return Math.max(-1, Math.min(1, value))
}

function encodeWavFile({ channelData, sampleRate }) {
  const numChannels = channelData.length
  const numFrames = channelData[0]?.length ?? 0
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44

  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = clampAudioSample(channelData[channel][frame] ?? 0)
      const pcmValue = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, Math.round(pcmValue), true)
      offset += bytesPerSample
    }
  }

  return buffer
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function createWavFilename(now = new Date()) {
  const normalizedDate = now.toISOString().replace(/[:.]/g, '-')
  return `dawbeat-export-${normalizedDate}.wav`
}
