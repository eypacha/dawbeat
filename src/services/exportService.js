import { Compressor, Context as ToneContext, Distortion, EQ3, FeedbackDelay, Limiter, Reverb, StereoWidener, connect as toneConnect } from 'tone'
import { getActiveFormula } from '@/engine/timelineEngine'
import {
  getAutomationLaneById,
  getSortedAutomationPoints,
  resolveMasterGainAtTime,
  MASTER_GAIN_AUTOMATION_LANE_ID
} from '@/services/automationService'
import {
  normalizeDecay,
  normalizeDecibels,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeWet,
  normalizeWidth
} from '@/services/audioEffectService'
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
  const [processedLeftChannel, processedRightChannel] = await renderAudioEffectsOffline(
    state,
    [leftChannel, rightChannel],
    outputSampleRate
  )

  return encodeWavFile({
    channelData: [processedLeftChannel, processedRightChannel],
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

      leftChannel[outputSample] = evaluateBytebeatSample(leftEvaluator, sourceSample)
      rightChannel[outputSample] = evaluateBytebeatSample(rightEvaluator, sourceSample)
    }
  }

  return [leftChannel, rightChannel]
}

async function renderAudioEffectsOffline(state, channelData, sampleRate) {
  const enabledAudioEffects = (state.audioEffects ?? []).filter(
    (effect) => effect?.enabled && ['eq', 'distortion', 'stereoWidener', 'delay', 'compressor', 'reverb', 'limiter'].includes(effect.type)
  )
  const masterGainLane = getAutomationLaneById(
    state.automationLanes,
    MASTER_GAIN_AUTOMATION_LANE_ID
  )
  const automationPoints = getSortedAutomationPoints(masterGainLane?.points ?? [])
  const hasStaticMasterGain = automationPoints.length <= 1
  const initialMasterGain = resolveMasterGainAtTime(0, state.automationLanes, state.masterGain)

  if (!enabledAudioEffects.length && hasStaticMasterGain && initialMasterGain === 1) {
    return channelData
  }

  if (!enabledAudioEffects.length) {
    return applyMasterGainToChannelData(channelData, state, sampleRate)
  }

  const OfflineAudioContextCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext

  if (!OfflineAudioContextCtor) {
    return applyMasterGainToChannelData(channelData, state, sampleRate)
  }

  const frameCount = channelData[0]?.length ?? 0

  if (!frameCount) {
    return channelData
  }

  const offlineContext = new OfflineAudioContextCtor(2, frameCount, sampleRate)
  const toneContext = new ToneContext({ context: offlineContext })
  const source = offlineContext.createBufferSource()
  const audioBuffer = offlineContext.createBuffer(2, frameCount, sampleRate)

  audioBuffer.copyToChannel(channelData[0], 0)
  audioBuffer.copyToChannel(channelData[1], 1)
  source.buffer = audioBuffer

  const toneNodes = await Promise.all(
    enabledAudioEffects.map((effect) => createOfflineAudioEffectNode(effect, toneContext))
  )
  const nodes = toneNodes.filter(Boolean)

  let previousNode = source

  for (const node of nodes) {
    toneConnect(previousNode, node)
    previousNode = node
  }

  previousNode.connect(offlineContext.destination)

  source.start(0)

  const renderedBuffer = await offlineContext.startRendering()

  for (const node of nodes) {
    safeDispose(node)
  }

  return [
    ...applyMasterGainToChannelData(
      [
        renderedBuffer.getChannelData(0).slice(),
        renderedBuffer.getChannelData(1).slice()
      ],
      state,
      sampleRate
    )
  ]
}

async function createOfflineAudioEffectNode(effect, toneContext) {
  if (!effect) {
    return null
  }

  if (effect.type === 'eq') {
    const node = new EQ3({
      context: toneContext,
      high: 0,
      highFrequency: 2500,
      low: 0,
      lowFrequency: 400,
      mid: 0
    })

    node.low.value = normalizeDecibels(effect.params?.low)
    node.mid.value = normalizeDecibels(effect.params?.mid)
    node.high.value = normalizeDecibels(effect.params?.high)
    node.lowFrequency.value = normalizeFrequency(effect.params?.lowFrequency)
    node.highFrequency.value = normalizeFrequency(effect.params?.highFrequency)

    return node
  }

  if (effect.type === 'distortion') {
    const node = new Distortion({
      context: toneContext,
      distortion: 0.4,
      oversample: '2x',
      wet: 0.35
    })

    node.distortion = normalizeDrive(effect.params?.drive)
    node.wet.value = normalizeWet(effect.params?.wet)
    return node
  }

  if (effect.type === 'stereoWidener') {
    const node = new StereoWidener({
      context: toneContext,
      width: 0.5
    })

    node.width.value = normalizeWidth(effect.params?.width)
    return node
  }

  if (effect.type === 'delay') {
    const node = new FeedbackDelay({
      context: toneContext,
      delayTime: 0.25,
      feedback: 0.35,
      wet: 0.25
    })

    node.delayTime.value = normalizeTime(effect.params?.delayTime)
    node.feedback.value = normalizeFeedback(effect.params?.feedback)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  if (effect.type === 'compressor') {
    const node = new Compressor({
      attack: 0.003,
      context: toneContext,
      knee: 30,
      ratio: 4,
      release: 0.25,
      threshold: -24
    })

    node.threshold.value = normalizeThreshold(effect.params?.threshold)
    node.ratio.value = normalizeRatio(effect.params?.ratio)
    node.attack.value = normalizeTime(effect.params?.attack)
    node.release.value = normalizeTime(effect.params?.release)
    node.knee.value = normalizeKnee(effect.params?.knee)

    return node
  }

  if (effect.type === 'limiter') {
    const node = new Limiter({
      context: toneContext,
      threshold: -6
    })

    node.threshold.value = normalizeThreshold(effect.params?.threshold)
    return node
  }

  if (effect.type === 'reverb') {
    const node = new Reverb({
      context: toneContext,
      decay: 2.5,
      preDelay: 0.02,
      wet: 0.3
    })

    node.wet.value = normalizeWet(effect.params?.wet)
    node.decay = normalizeDecay(effect.params?.decay)
    node.preDelay = normalizeTime(effect.params?.preDelay)
    await node.ready

    return node
  }

  return null
}

function applyMasterGainToChannelData(channelData, state, sampleRate) {
  const automationPoints = getSortedAutomationPoints(
    getAutomationLaneById(state.automationLanes, MASTER_GAIN_AUTOMATION_LANE_ID)?.points ?? []
  )
  const constantGain = resolveMasterGainAtTime(0, state.automationLanes, state.masterGain)

  if (automationPoints.length <= 1 && constantGain === 1) {
    return channelData
  }

  if (automationPoints.length <= 1) {
    return channelData.map((channel) => {
      const nextChannel = new Float32Array(channel.length)

      for (let index = 0; index < channel.length; index += 1) {
        nextChannel[index] = channel[index] * constantGain
      }

      return nextChannel
    })
  }

  const sourceSampleRate = getSourceSampleRate(state.sampleRate)

  return channelData.map((channel) => {
    const nextChannel = new Float32Array(channel.length)

    for (let index = 0; index < channel.length; index += 1) {
      const sourceSample = (index * sourceSampleRate) / sampleRate
      const timeTicks = samplesToTicks(sourceSample, state.tickSize)
      const gain = resolveMasterGainAtTime(timeTicks, state.automationLanes, state.masterGain)
      nextChannel[index] = channel[index] * gain
    }

    return nextChannel
  })
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

function safeDispose(node) {
  if (!node || typeof node.dispose !== 'function') {
    return
  }

  try {
    node.dispose()
  } catch {
    // Ignore dispose failures during export cleanup.
  }
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
