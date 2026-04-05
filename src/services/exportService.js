import { AutoWah, BitCrusher, Chebyshev, Chorus, Compressor, Context as ToneContext, Distortion, EQ3, FeedbackDelay, Limiter, Reverb, StereoWidener, Vibrato, connect as toneConnect } from 'tone'
import * as lamejsModule from 'lamejs'
import bitStreamModule from 'lamejs/src/js/BitStream.js'
import lameCoreModule from 'lamejs/src/js/Lame.js'
import mpegModeModule from 'lamejs/src/js/MPEGMode.js'
import { getActiveFormula } from '@/engine/timelineEngine'
import {
  AUTOMATION_CURVE_LINEAR,
  getAutomationLaneByAudioEffectParam,
  getAutomationLaneById,
  getSortedAutomationPoints,
  interpolateAutomationSegmentValue,
  normalizeAutomationCurveType,
  resolveAudioEffectAtTime,
  resolveMasterGainAtTime,
  MASTER_GAIN_AUTOMATION_LANE_ID
} from '@/services/automationService'
import {
  normalizeDecay,
  normalizeDecibels,
  normalizeBits,
  normalizeAutoWahBaseFrequency,
  normalizeAutoWahFollower,
  normalizeAutoWahGain,
  normalizeAutoWahOctaves,
  normalizeAutoWahQ,
  normalizeAutoWahSensitivity,
  normalizeChorusDelayTime,
  normalizeChorusFrequency,
  normalizeDepth,
  normalizeDrive,
  normalizeFeedback,
  normalizeFrequency,
  normalizeKnee,
  normalizeOrder,
  normalizeRatio,
  normalizeThreshold,
  normalizeTime,
  normalizeVibratoFrequency,
  normalizeWet,
  normalizeWidth
} from '@/services/audioEffectService'
import { applyEvalEffects } from '@/services/evalEffectService'
import { coerceBytebeatSampleValue, normalizeBytebeatType } from '@/services/bytebeatTypeService'
import {
  normalizeOggOpusExportOptions,
  normalizeMp3ExportOptions,
  normalizeWavExportOptions,
  resolveExportSampleRate,
  resolveOggOpusExportSampleRate
} from '@/services/exportSettingsService'
import { hasRenderableFormulaInput } from '@/services/formulaService'
import { getValueTrackerEventTicks } from '@/services/valueTrackerService'
import { DEFAULT_SAMPLE_RATE } from '@/utils/audioSettings'
import { createProjectFilenameFromTitle, DEFAULT_PROJECT_TITLE } from '@/utils/projectTitle'
import { validateFormula } from '@/utils/formulaValidation'
import { getClipEnd, samplesToTicks, ticksToSamples } from '@/utils/timeUtils'

const SILENT_EVALUATOR = () => 0
const OFFLINE_RENDERABLE_AUDIO_EFFECT_TYPES = ['eq', 'distortion', 'stereoWidener', 'delay', 'compressor', 'reverb', 'limiter', 'bitCrusher', 'vibrato', 'chorus', 'chebyshev', 'autoWah']
const MIN_AUTOMATION_CURVE_SAMPLES = 16
const MAX_AUTOMATION_CURVE_SAMPLES = 128
const EXPORT_UI_YIELD_INTERVAL_MS = 12
const EXPORT_SAMPLE_YIELD_CHUNK_SIZE = 2048
const MP3_ENCODER = resolveMp3Encoder()
const MANUAL_OFFLINE_AUTOMATION_PARAM_KEYS = {
  autoWah: ['baseFrequency', 'octaves', 'sensitivity', 'follower'],
  chebyshev: ['order'],
  chorus: ['depth', 'delayTime'],
  distortion: ['drive'],
  reverb: ['decay', 'preDelay']
}

export async function downloadProjectWav(
  state,
  { loopCount = 1, filename = createWavFilename(state?.projectTitle), onProgress = null, options = {} } = {}
) {
  const normalizedOptions = normalizeWavExportOptions(options)
  const renderedAudio = await renderProjectAudio(state, {
    loopCount,
    onProgress: createScaledProgressReporter(onProgress, 0, 0.82),
    sampleRate: normalizedOptions.sampleRate
  })
  const wavBuffer = await encodeWavFile({
    bitDepth: normalizedOptions.bitDepth,
    channelData: renderedAudio.channelData,
    onProgress: createScaledProgressReporter(onProgress, 0.82, 1),
    sampleRate: renderedAudio.sampleRate
  })
  reportExportProgress(onProgress, 1)
  const blob = new Blob([wavBuffer], { type: 'audio/wav' })
  triggerDownload(blob, filename)
}

export async function downloadProjectMp3(
  state,
  { loopCount = 1, filename = createMp3Filename(state?.projectTitle), onProgress = null, options = {} } = {}
) {
  const normalizedOptions = normalizeMp3ExportOptions(options)
  const renderedAudio = await renderProjectAudio(state, {
    loopCount,
    onProgress: createScaledProgressReporter(onProgress, 0, 0.72),
    sampleRate: normalizedOptions.sampleRate
  })
  const wavBuffer = await encodeWavFile({
    bitDepth: 16,
    channelData: renderedAudio.channelData,
    onProgress: createScaledProgressReporter(onProgress, 0.72, 0.84),
    sampleRate: renderedAudio.sampleRate
  })
  const mp3Buffer = await encodeWavToMp3(wavBuffer, {
    bitrate: normalizedOptions.bitrate,
    onProgress: createScaledProgressReporter(onProgress, 0.84, 1)
  })
  reportExportProgress(onProgress, 1)
  const blob = new Blob([mp3Buffer], { type: 'audio/mpeg' })
  triggerDownload(blob, filename)
}

export async function downloadProjectOggOpus(
  state,
  { loopCount = 1, filename = createOggOpusFilename(state?.projectTitle), onProgress = null, options = {} } = {}
) {
  const normalizedOptions = normalizeOggOpusExportOptions(options)
  const renderedAudio = await renderProjectAudio(state, {
    loopCount,
    onProgress: createScaledProgressReporter(onProgress, 0, 0.78),
    sampleRate: resolveOggOpusExportSampleRate(normalizedOptions.sampleRate)
  })

  try {
    const { encodePcmToOggOpus } = await import('@/services/oggOpusExportService')
    const oggBuffer = await encodePcmToOggOpus(renderedAudio.channelData, {
      bitrate: normalizedOptions.bitrate,
      onProgress: createScaledProgressReporter(onProgress, 0.78, 1),
      sampleRate: renderedAudio.sampleRate
    })
    reportExportProgress(onProgress, 1)
    const blob = new Blob([oggBuffer], { type: 'audio/ogg; codecs=opus' })

    triggerDownload(blob, filename)
  } catch (error) {
    console.error('OGG Opus export failed', error)
    throw new Error('OGG Opus export is unavailable in this browser/build.')
  }
}

function triggerDownload(blob, filename) {
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

async function renderProjectAudio(
  state,
  { loopCount = 1, onProgress = null, sampleRate: outputSampleRateOption } = {}
) {
  const singleLoopTicks = getProjectDurationTicks(state.tracks)

  if (singleLoopTicks <= 0) {
    throw new Error('Project is empty')
  }

  const loops = Math.max(1, Math.round(loopCount))
  const totalTicks = singleLoopTicks * loops
  const sourceSampleRate = getSourceSampleRate(state.sampleRate)
  const outputSampleRate = resolveExportSampleRate(sourceSampleRate, outputSampleRateOption)
  const totalSourceSamples = Math.max(1, Math.ceil(ticksToSamples(totalTicks, state.tickSize)))
  const totalOutputSamples = Math.max(
    1,
    Math.ceil((totalSourceSamples * outputSampleRate) / sourceSampleRate)
  )
  const [leftChannel, rightChannel] = await renderTimelineChannels(state, {
    onProgress: createScaledProgressReporter(onProgress, 0, 0.86),
    outputSampleRate,
    sourceSampleRate,
    totalOutputSamples,
    totalSourceSamples,
    loops
  })
  reportExportProgress(onProgress, 0.86)
  const [processedLeftChannel, processedRightChannel] = await renderAudioEffectsOffline(
    state,
    [leftChannel, rightChannel],
    createScaledProgressReporter(onProgress, 0.86, 1),
    outputSampleRate
  )
  reportExportProgress(onProgress, 1)

  return {
    channelData: [processedLeftChannel, processedRightChannel],
    sampleRate: outputSampleRate
  }
}

async function encodeWavToMp3(wavBuffer, { bitrate = 128, onProgress = null } = {}) {
  ensureLamejsGlobals()
  const uiYieldController = createExportUiYieldController()
  const view = new DataView(wavBuffer)
  const bitsPerSample = view.getUint16(34, true)

  if (bitsPerSample !== 16) {
    throw new Error('MP3 export expects a 16-bit WAV render')
  }

  const numChannels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)
  const numFrames = (wavBuffer.byteLength - 44) / (numChannels * 2)
  const encoder = new MP3_ENCODER(numChannels, sampleRate, bitrate)
  const CHUNK = 1152
  const leftPcm = new Int16Array(numFrames)
  const rightPcm = numChannels > 1 ? new Int16Array(numFrames) : null

  for (let i = 0; i < numFrames; i += 1) {
    const offset = 44 + i * numChannels * 2
    leftPcm[i] = view.getInt16(offset, true)
    if (rightPcm) {
      rightPcm[i] = view.getInt16(offset + 2, true)
    }

    if ((i % EXPORT_SAMPLE_YIELD_CHUNK_SIZE) === 0) {
      reportExportProgress(onProgress, i / Math.max(1, numFrames))
      await maybeYieldToExportUi(uiYieldController)
    }
  }

  const mp3Parts = []

  for (let offset = 0; offset < numFrames; offset += CHUNK) {
    const left = leftPcm.subarray(offset, offset + CHUNK)
    const right = rightPcm ? rightPcm.subarray(offset, offset + CHUNK) : left
    const encoded = encoder.encodeBuffer(left, right)
    if (encoded.length > 0) {
      mp3Parts.push(new Uint8Array(encoded))
    }

    reportExportProgress(onProgress, offset / Math.max(1, numFrames))
    await maybeYieldToExportUi(uiYieldController)
  }

  const flushed = encoder.flush()
  if (flushed.length > 0) {
    mp3Parts.push(new Uint8Array(flushed))
  }

  const totalLength = mp3Parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(totalLength)
  let writeOffset = 0
  for (const part of mp3Parts) {
    output.set(part, writeOffset)
    writeOffset += part.length
  }

  reportExportProgress(onProgress, 1)
  return output.buffer
}

function resolveMp3Encoder() {
  const resolvedEncoder = lamejsModule.Mp3Encoder ?? lamejsModule.default?.Mp3Encoder

  if (typeof resolvedEncoder !== 'function') {
    throw new Error('MP3 encoder is not available')
  }

  return resolvedEncoder
}

function ensureLamejsGlobals() {
  if (!globalThis.MPEGMode) {
    const mpegMode = mpegModeModule.default ?? mpegModeModule

    if (typeof mpegMode !== 'function' && typeof mpegMode !== 'object') {
      throw new Error('Unable to initialize MPEGMode for MP3 export')
    }

    globalThis.MPEGMode = mpegMode
  }

  if (!globalThis.Lame) {
    const lameCore = lameCoreModule.default ?? lameCoreModule

    if (typeof lameCore !== 'function') {
      throw new Error('Unable to initialize Lame core for MP3 export')
    }

    globalThis.Lame = lameCore
  }

  if (!globalThis.BitStream) {
    const bitStream = bitStreamModule.default ?? bitStreamModule

    if (typeof bitStream !== 'function') {
      throw new Error('Unable to initialize BitStream for MP3 export')
    }

    globalThis.BitStream = bitStream
  }
}

async function renderTimelineChannels(
  state,
  { onProgress = null, outputSampleRate, sourceSampleRate, totalOutputSamples, totalSourceSamples, loops = 1 }
) {
  const uiYieldController = createExportUiYieldController()
  const leftChannel = new Float32Array(totalOutputSamples)
  const rightChannel = new Float32Array(totalOutputSamples)
  const bytebeatType = normalizeBytebeatType(state.bytebeatType)
  const singleLoopSourceSamples = Math.ceil(totalSourceSamples / Math.max(1, loops))
  const singleLoopBoundaries = collectTimelineBoundaries(
    state.tracks,
    state.variableTracks,
    state.valueTrackerTracks,
    state.tickSize,
    singleLoopSourceSamples
  )
  const evaluatorCache = new Map()
  let processedSamples = 0

  for (let loop = 0; loop < loops; loop += 1) {
    const loopSourceOffset = loop * singleLoopSourceSamples

    for (let index = 0; index < singleLoopBoundaries.length - 1; index += 1) {
      const startSourceSample = singleLoopBoundaries[index] + loopSourceOffset
      const endSourceSample = singleLoopBoundaries[index + 1] + loopSourceOffset

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

      const timeTicks = samplesToTicks(singleLoopBoundaries[index], state.tickSize)
      const activeFormula = getActiveFormula(
        timeTicks,
        state.tracks,
        state.variableTracks,
        state.valueTrackerTracks
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

        leftChannel[outputSample] = evaluateBytebeatSample(leftEvaluator, sourceSample, bytebeatType)
        rightChannel[outputSample] = evaluateBytebeatSample(rightEvaluator, sourceSample, bytebeatType)
        processedSamples += 1

        if ((outputSample % EXPORT_SAMPLE_YIELD_CHUNK_SIZE) === 0) {
          reportExportProgress(onProgress, processedSamples / Math.max(1, totalOutputSamples))
          await maybeYieldToExportUi(uiYieldController)
        }
      }
    }
  }

  reportExportProgress(onProgress, 1)
  return [leftChannel, rightChannel]
}

async function renderAudioEffectsOffline(state, channelData, onProgress, sampleRate) {
  const enabledAudioEffects = (state.audioEffects ?? []).filter(
    (effect) => effect?.enabled && OFFLINE_RENDERABLE_AUDIO_EFFECT_TYPES.includes(effect.type)
  )
  const masterGainLane = getAutomationLaneById(
    state.automationLanes,
    MASTER_GAIN_AUTOMATION_LANE_ID
  )
  const automationPoints = getSortedAutomationPoints(masterGainLane?.points ?? [])
  const hasStaticMasterGain = automationPoints.length <= 1
  const initialMasterGain = resolveMasterGainAtTime(0, state.automationLanes, state.masterGain)

  if (!enabledAudioEffects.length && hasStaticMasterGain && initialMasterGain === 1) {
    reportExportProgress(onProgress, 1)
    return channelData
  }

  if (!enabledAudioEffects.length) {
    return await applyMasterGainToChannelData(channelData, state, sampleRate, onProgress)
  }

  const OfflineAudioContextCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext

  if (!OfflineAudioContextCtor) {
    return await applyMasterGainToChannelData(channelData, state, sampleRate, onProgress)
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

  const sourceSampleRate = getSourceSampleRate(state.sampleRate)
  const toneNodes = await Promise.all(
    enabledAudioEffects.map(async (effect) => ({
      effect,
      node: await createOfflineAudioEffectNode(effect, toneContext)
    }))
  )
  reportExportProgress(onProgress, 0.12)
  const nodeEntries = toneNodes.filter((entry) => entry.node)
  const nodes = nodeEntries.map((entry) => entry.node)
  const manualAutomationTask = await prepareOfflineAudioEffectAutomation(nodeEntries, {
    automationLanes: state.automationLanes,
    durationSeconds: frameCount / sampleRate,
    offlineContext,
    sourceSampleRate,
    tickSize: state.tickSize
  })

  let previousNode = source

  for (const node of nodes) {
    toneConnect(previousNode, node)
    previousNode = node
  }

  previousNode.connect(offlineContext.destination)

  source.start(0)

  const renderPromise = offlineContext.startRendering()
  reportExportProgress(onProgress, 0.32)

  if (manualAutomationTask) {
    await manualAutomationTask
  }

  const renderedBuffer = await renderPromise
  reportExportProgress(onProgress, 0.82)

  for (const node of nodes) {
    safeDispose(node)
  }

  return [
    ...await applyMasterGainToChannelData(
      [
        renderedBuffer.getChannelData(0).slice(),
        renderedBuffer.getChannelData(1).slice()
      ],
      state,
      sampleRate,
      createScaledProgressReporter(onProgress, 0.82, 1)
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

  if (effect.type === 'bitCrusher') {
    const node = new BitCrusher({
      context: toneContext,
      bits: 4,
      wet: 0.5
    })

    node.bits.value = normalizeBits(effect.params?.bits)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  if (effect.type === 'vibrato') {
    const node = new Vibrato({
      context: toneContext,
      frequency: 5,
      depth: 0.1,
      wet: 1
    })

    node.frequency.value = normalizeVibratoFrequency(effect.params?.frequency)
    node.depth.value = normalizeDepth(effect.params?.depth)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  if (effect.type === 'chorus') {
    const node = new Chorus({
      context: toneContext,
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      feedback: 0,
      wet: 0.5
    }).start()

    node.frequency.value = normalizeChorusFrequency(effect.params?.frequency)
    node.depth = normalizeDepth(effect.params?.depth)
    node.delayTime = normalizeChorusDelayTime(effect.params?.delayTime)
    node.feedback.value = normalizeFeedback(effect.params?.feedback)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  if (effect.type === 'chebyshev') {
    const node = new Chebyshev({
      context: toneContext,
      order: 50,
      wet: 1
    })

    node.order = normalizeOrder(effect.params?.order)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  if (effect.type === 'autoWah') {
    const node = new AutoWah({
      context: toneContext,
      baseFrequency: 100,
      octaves: 6,
      sensitivity: 0,
      follower: 0.2,
      Q: 2,
      gain: 2,
      wet: 1
    })

    node.baseFrequency = normalizeAutoWahBaseFrequency(effect.params?.baseFrequency)
    node.octaves = normalizeAutoWahOctaves(effect.params?.octaves)
    node.sensitivity = normalizeAutoWahSensitivity(effect.params?.sensitivity)
    node.follower = normalizeAutoWahFollower(effect.params?.follower)
    node.Q.value = normalizeAutoWahQ(effect.params?.q)
    node.gain.value = normalizeAutoWahGain(effect.params?.gain)
    node.wet.value = normalizeWet(effect.params?.wet)

    return node
  }

  return null
}

async function prepareOfflineAudioEffectAutomation(
  nodeEntries,
  { automationLanes, durationSeconds, offlineContext, sourceSampleRate, tickSize }
) {
  if (!nodeEntries.length) {
    return null
  }

  const manualEntries = []

  for (const entry of nodeEntries) {
    const resolvedEffectAtStart = resolveAudioEffectAtTime(0, automationLanes, entry.effect)
    await applyOfflineAudioEffectState(entry.node, resolvedEffectAtStart)
    scheduleOfflineAudioEffectAutomation(
      entry.node,
      entry.effect,
      automationLanes,
      sourceSampleRate,
      tickSize
    )

    const manualParamKeys = getManualOfflineAutomationParamKeys(entry.effect.type).filter((paramKey) =>
      getAutomationLaneByAudioEffectParam(automationLanes, entry.effect.id, paramKey)
    )

    if (manualParamKeys.length) {
      manualEntries.push({
        ...entry,
        manualParamKeys
      })
    }
  }

  const checkpoints = collectManualOfflineAutomationCheckpoints(
    manualEntries,
    automationLanes,
    durationSeconds,
    sourceSampleRate,
    tickSize
  )

  if (!checkpoints.length) {
    return null
  }

  const scheduledSuspends = checkpoints.map((checkpoint) => ({
    checkpoint,
    promise: offlineContext.suspend(checkpoint.timeSeconds)
  }))

  return scheduledSuspends.reduce(
    (chain, { checkpoint, promise }) =>
      chain.then(async () => {
        await promise

        for (const entry of manualEntries) {
          await applyOfflineAudioEffectStateAtTime(
            entry.node,
            entry.effect,
            automationLanes,
            checkpoint.timeTicks,
            entry.manualParamKeys
          )
        }

        await offlineContext.resume()
      }),
    Promise.resolve()
  )
}

function scheduleOfflineAudioEffectAutomation(
  node,
  effect,
  automationLanes,
  sourceSampleRate,
  tickSize
) {
  const resolvedEffectAtStart = resolveAudioEffectAtTime(0, automationLanes, effect)
  const initialParams = resolvedEffectAtStart?.params ?? {}

  for (const paramKey of Object.keys(initialParams)) {
    const target = getOfflineAudioEffectAutomationTarget(node, effect.type, paramKey)
    const lane = getAutomationLaneByAudioEffectParam(automationLanes, effect.id, paramKey)

    if (!target || !lane) {
      continue
    }

    scheduleOfflineParamAutomation(target, lane, {
      initialValue: initialParams[paramKey],
      normalizeValue: (value) => normalizeAudioEffectParamValue(effect.type, paramKey, value),
      sourceSampleRate,
      tickSize
    })
  }
}

function scheduleOfflineParamAutomation(
  target,
  lane,
  { initialValue, normalizeValue, sourceSampleRate, tickSize }
) {
  if (typeof target?.setValueAtTime !== 'function') {
    return
  }

  const points = getSortedAutomationPoints(lane?.points ?? [])
  const normalizedInitialValue = normalizeValue(initialValue)

  if (typeof target.cancelScheduledValues === 'function') {
    target.cancelScheduledValues(0)
  }

  target.setValueAtTime(normalizedInitialValue, 0)
  if (!points.length) {
    return
  }

  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index]
    const currentTimeSeconds = ticksToSeconds(currentPoint.time, tickSize, sourceSampleRate)
    const currentValue = normalizeValue(currentPoint.value)

    if (currentTimeSeconds <= 0) {
      target.setValueAtTime(currentValue, 0)
    } else if (index === 0) {
      target.setValueAtTime(currentValue, currentTimeSeconds)
    }

    const nextPoint = points[index + 1]

    if (!nextPoint) {
      continue
    }

    scheduleOfflineParamAutomationSegment(target, currentPoint, nextPoint, {
      normalizeValue,
      sourceSampleRate,
      tickSize
    })
  }
}

function collectManualOfflineAutomationCheckpoints(
  manualEntries,
  automationLanes,
  durationSeconds,
  sourceSampleRate,
  tickSize
) {
  const checkpoints = new Map()

  for (const entry of manualEntries) {
    for (const paramKey of entry.manualParamKeys) {
      const lane = getAutomationLaneByAudioEffectParam(automationLanes, entry.effect.id, paramKey)
      const checkpointTimes = collectAutomationLaneCheckpointTimes(lane, {
        sourceSampleRate,
        tickSize
      })

      for (const timeTicks of checkpointTimes) {
        if (timeTicks <= 0) {
          continue
        }

        const timeSeconds = ticksToSeconds(timeTicks, tickSize, sourceSampleRate)

        if (timeSeconds <= 0 || timeSeconds >= durationSeconds) {
          continue
        }

        checkpoints.set(timeTicks, {
          timeTicks,
          timeSeconds
        })
      }
    }
  }

  return [...checkpoints.values()].sort((left, right) => left.timeSeconds - right.timeSeconds)
}

function getManualOfflineAutomationParamKeys(effectType) {
  return MANUAL_OFFLINE_AUTOMATION_PARAM_KEYS[effectType] ?? []
}

function scheduleOfflineParamAutomationSegment(
  target,
  currentPoint,
  nextPoint,
  { normalizeValue, sourceSampleRate, tickSize }
) {
  const startTimeSeconds = ticksToSeconds(currentPoint.time, tickSize, sourceSampleRate)
  const endTimeSeconds = ticksToSeconds(nextPoint.time, tickSize, sourceSampleRate)
  const startValue = normalizeValue(currentPoint.value)
  const endValue = normalizeValue(nextPoint.value)
  const durationSeconds = endTimeSeconds - startTimeSeconds

  if (durationSeconds <= 0) {
    target.setValueAtTime(endValue, Math.max(0, endTimeSeconds))
    return
  }

  const curve = normalizeAutomationCurveType(currentPoint.curve)

  if (
    curve !== AUTOMATION_CURVE_LINEAR &&
    typeof target.setValueCurveAtTime === 'function'
  ) {
    target.setValueAtTime(startValue, Math.max(0, startTimeSeconds))
    target.setValueCurveAtTime(
      buildAutomationCurveValues(startValue, endValue, curve, durationSeconds),
      Math.max(0, startTimeSeconds),
      durationSeconds
    )
    target.setValueAtTime(endValue, endTimeSeconds)
    return
  }

  if (typeof target.linearRampToValueAtTime === 'function') {
    target.linearRampToValueAtTime(endValue, endTimeSeconds)
    return
  }

  target.setValueAtTime(endValue, endTimeSeconds)
}

function buildAutomationCurveValues(startValue, endValue, curve, durationSeconds) {
  const sampleCount = getAutomationCurveSampleCount(durationSeconds)

  return Float32Array.from({ length: sampleCount }, (_entry, index) => {
    const interpolation = sampleCount <= 1 ? 1 : index / (sampleCount - 1)
    return interpolateAutomationSegmentValue(startValue, endValue, interpolation, curve)
  })
}

function getAutomationCurveSampleCount(durationSeconds) {
  const normalizedDuration = Math.max(0, Number(durationSeconds) || 0)
  return Math.max(
    MIN_AUTOMATION_CURVE_SAMPLES,
    Math.min(MAX_AUTOMATION_CURVE_SAMPLES, Math.ceil(normalizedDuration * 60))
  )
}

function collectAutomationLaneCheckpointTimes(lane, { sourceSampleRate, tickSize }) {
  const points = getSortedAutomationPoints(lane?.points ?? [])
  const checkpointTimes = new Set()

  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index]

    if (index > 0) {
      checkpointTimes.add(currentPoint.time)
    }

    const nextPoint = points[index + 1]

    if (!nextPoint || nextPoint.time <= currentPoint.time) {
      continue
    }

    const curve = normalizeAutomationCurveType(currentPoint.curve)

    if (curve === AUTOMATION_CURVE_LINEAR) {
      continue
    }

    const segmentDurationSeconds = ticksToSeconds(
      nextPoint.time - currentPoint.time,
      tickSize,
      sourceSampleRate
    )
    const sampleCount = getAutomationCurveSampleCount(segmentDurationSeconds)

    for (let step = 1; step < sampleCount; step += 1) {
      checkpointTimes.add(
        currentPoint.time + ((nextPoint.time - currentPoint.time) * step) / sampleCount
      )
    }
  }

  return [...checkpointTimes].sort((leftTime, rightTime) => leftTime - rightTime)
}

function getOfflineAudioEffectAutomationTarget(node, effectType, paramKey) {
  if (!node) {
    return null
  }

  if (effectType === 'eq') {
    if (paramKey === 'low') {
      return node.low
    }

    if (paramKey === 'mid') {
      return node.mid
    }

    if (paramKey === 'high') {
      return node.high
    }

    if (paramKey === 'lowFrequency') {
      return node.lowFrequency
    }

    if (paramKey === 'highFrequency') {
      return node.highFrequency
    }
  }

  if (effectType === 'distortion' && paramKey === 'wet') {
    return node.wet
  }

  if (effectType === 'stereoWidener' && paramKey === 'width') {
    return node.width
  }

  if (effectType === 'delay') {
    if (paramKey === 'delayTime') {
      return node.delayTime
    }

    if (paramKey === 'feedback') {
      return node.feedback
    }

    if (paramKey === 'wet') {
      return node.wet
    }
  }

  if (effectType === 'compressor') {
    if (paramKey === 'threshold') {
      return node.threshold
    }

    if (paramKey === 'ratio') {
      return node.ratio
    }

    if (paramKey === 'attack') {
      return node.attack
    }

    if (paramKey === 'release') {
      return node.release
    }

    if (paramKey === 'knee') {
      return node.knee
    }
  }

  if (effectType === 'limiter' && paramKey === 'threshold') {
    return node.threshold
  }

  if (effectType === 'reverb' && paramKey === 'wet') {
    return node.wet
  }

  return null
}

async function applyOfflineAudioEffectStateAtTime(
  node,
  effect,
  automationLanes,
  timeTicks,
  paramKeys = null
) {
  const resolvedEffect = resolveAudioEffectAtTime(timeTicks, automationLanes, effect)
  await applyOfflineAudioEffectState(node, resolvedEffect, paramKeys)
}

async function applyOfflineAudioEffectState(node, effect, paramKeys = null) {
  if (!node || !effect?.params) {
    return
  }

  const keysToApply = paramKeys ?? Object.keys(effect.params)

  for (const paramKey of keysToApply) {
    await applyOfflineAudioEffectParamValue(node, effect.type, paramKey, effect.params[paramKey])
  }
}

async function applyOfflineAudioEffectParamValue(node, effectType, paramKey, value) {
  if (effectType === 'eq') {
    if (paramKey === 'low') {
      node.low.value = normalizeDecibels(value)
      return
    }

    if (paramKey === 'mid') {
      node.mid.value = normalizeDecibels(value)
      return
    }

    if (paramKey === 'high') {
      node.high.value = normalizeDecibels(value)
      return
    }

    if (paramKey === 'lowFrequency') {
      node.lowFrequency.value = normalizeFrequency(value)
      return
    }

    if (paramKey === 'highFrequency') {
      node.highFrequency.value = normalizeFrequency(value)
    }

    return
  }

  if (effectType === 'distortion') {
    if (paramKey === 'drive') {
      node.distortion = normalizeDrive(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }

    return
  }

  if (effectType === 'stereoWidener') {
    if (paramKey === 'width') {
      node.width.value = normalizeWidth(value)
    }

    return
  }

  if (effectType === 'delay') {
    if (paramKey === 'delayTime') {
      node.delayTime.value = normalizeTime(value)
      return
    }

    if (paramKey === 'feedback') {
      node.feedback.value = normalizeFeedback(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }

    return
  }

  if (effectType === 'compressor') {
    if (paramKey === 'threshold') {
      node.threshold.value = normalizeThreshold(value)
      return
    }

    if (paramKey === 'ratio') {
      node.ratio.value = normalizeRatio(value)
      return
    }

    if (paramKey === 'attack') {
      node.attack.value = normalizeTime(value)
      return
    }

    if (paramKey === 'release') {
      node.release.value = normalizeTime(value)
      return
    }

    if (paramKey === 'knee') {
      node.knee.value = normalizeKnee(value)
    }

    return
  }

  if (effectType === 'limiter') {
    if (paramKey === 'threshold') {
      node.threshold.value = normalizeThreshold(value)
    }

    return
  }

  if (effectType === 'reverb') {
    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
      return
    }

    if (paramKey === 'decay') {
      node.decay = normalizeDecay(value)
      await node.ready
      return
    }

    if (paramKey === 'preDelay') {
      node.preDelay = normalizeTime(value)
      await node.ready
    }
  }

  if (effectType === 'bitCrusher') {
    if (paramKey === 'bits') {
      node.bits.value = normalizeBits(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }
  }

  if (effectType === 'vibrato') {
    if (paramKey === 'frequency') {
      node.frequency.value = normalizeVibratoFrequency(value)
      return
    }

    if (paramKey === 'depth') {
      node.depth.value = normalizeDepth(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }
  }

  if (effectType === 'chorus') {
    if (paramKey === 'frequency') {
      node.frequency.value = normalizeChorusFrequency(value)
      return
    }

    if (paramKey === 'depth') {
      node.depth = normalizeDepth(value)
      return
    }

    if (paramKey === 'delayTime') {
      node.delayTime = normalizeChorusDelayTime(value)
      return
    }

    if (paramKey === 'feedback') {
      node.feedback.value = normalizeFeedback(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }
  }

  if (effectType === 'chebyshev') {
    if (paramKey === 'order') {
      node.order = normalizeOrder(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }
  }

  if (effectType === 'autoWah') {
    if (paramKey === 'baseFrequency') {
      node.baseFrequency = normalizeAutoWahBaseFrequency(value)
      return
    }

    if (paramKey === 'octaves') {
      node.octaves = normalizeAutoWahOctaves(value)
      return
    }

    if (paramKey === 'sensitivity') {
      node.sensitivity = normalizeAutoWahSensitivity(value)
      return
    }

    if (paramKey === 'follower') {
      node.follower = normalizeAutoWahFollower(value)
      return
    }

    if (paramKey === 'q') {
      node.Q.value = normalizeAutoWahQ(value)
      return
    }

    if (paramKey === 'gain') {
      node.gain.value = normalizeAutoWahGain(value)
      return
    }

    if (paramKey === 'wet') {
      node.wet.value = normalizeWet(value)
    }
  }
}

function normalizeAudioEffectParamValue(effectType, paramKey, value) {
  if (effectType === 'eq') {
    if (paramKey === 'low' || paramKey === 'mid' || paramKey === 'high') {
      return normalizeDecibels(value)
    }

    if (paramKey === 'lowFrequency' || paramKey === 'highFrequency') {
      return normalizeFrequency(value)
    }
  }

  if (effectType === 'distortion') {
    if (paramKey === 'drive') {
      return normalizeDrive(value)
    }

    if (paramKey === 'wet') {
      return normalizeWet(value)
    }
  }

  if (effectType === 'stereoWidener' && paramKey === 'width') {
    return normalizeWidth(value)
  }

  if (effectType === 'delay') {
    if (paramKey === 'delayTime') {
      return normalizeTime(value)
    }

    if (paramKey === 'feedback') {
      return normalizeFeedback(value)
    }

    if (paramKey === 'wet') {
      return normalizeWet(value)
    }
  }

  if (effectType === 'compressor') {
    if (paramKey === 'threshold') {
      return normalizeThreshold(value)
    }

    if (paramKey === 'ratio') {
      return normalizeRatio(value)
    }

    if (paramKey === 'attack' || paramKey === 'release') {
      return normalizeTime(value)
    }

    if (paramKey === 'knee') {
      return normalizeKnee(value)
    }
  }

  if (effectType === 'limiter' && paramKey === 'threshold') {
    return normalizeThreshold(value)
  }

  if (effectType === 'reverb') {
    if (paramKey === 'wet') {
      return normalizeWet(value)
    }

    if (paramKey === 'decay') {
      return normalizeDecay(value)
    }

    if (paramKey === 'preDelay') {
      return normalizeTime(value)
    }
  }

  if (effectType === 'chorus') {
    if (paramKey === 'frequency') return normalizeChorusFrequency(value)
    if (paramKey === 'depth') return normalizeDepth(value)
    if (paramKey === 'delayTime') return normalizeChorusDelayTime(value)
    if (paramKey === 'feedback') return normalizeFeedback(value)
    if (paramKey === 'wet') return normalizeWet(value)
  }

  if (effectType === 'chebyshev') {
    if (paramKey === 'order') return normalizeOrder(value)
    if (paramKey === 'wet') return normalizeWet(value)
  }

  if (effectType === 'autoWah') {
    if (paramKey === 'baseFrequency') return normalizeAutoWahBaseFrequency(value)
    if (paramKey === 'octaves') return normalizeAutoWahOctaves(value)
    if (paramKey === 'sensitivity') return normalizeAutoWahSensitivity(value)
    if (paramKey === 'follower') return normalizeAutoWahFollower(value)
    if (paramKey === 'q') return normalizeAutoWahQ(value)
    if (paramKey === 'gain') return normalizeAutoWahGain(value)
    if (paramKey === 'wet') return normalizeWet(value)
  }

  return value
}

function ticksToSeconds(ticks, tickSize, sourceSampleRate) {
  return ticksToSamples(ticks, tickSize) / sourceSampleRate
}

async function applyMasterGainToChannelData(channelData, state, sampleRate, onProgress = null) {
  const uiYieldController = createExportUiYieldController()
  const automationPoints = getSortedAutomationPoints(
    getAutomationLaneById(state.automationLanes, MASTER_GAIN_AUTOMATION_LANE_ID)?.points ?? []
  )
  const constantGain = resolveMasterGainAtTime(0, state.automationLanes, state.masterGain)

  if (automationPoints.length <= 1 && constantGain === 1) {
    return channelData
  }

  if (automationPoints.length <= 1) {
    const nextChannelData = []

    for (const channel of channelData) {
      const nextChannel = new Float32Array(channel.length)

      for (let index = 0; index < channel.length; index += 1) {
        nextChannel[index] = channel[index] * constantGain

        if ((index % EXPORT_SAMPLE_YIELD_CHUNK_SIZE) === 0) {
          reportExportProgress(onProgress, index / Math.max(1, channel.length))
          await maybeYieldToExportUi(uiYieldController)
        }
      }

      nextChannelData.push(nextChannel)
    }

    reportExportProgress(onProgress, 1)
    return nextChannelData
  }

  const sourceSampleRate = getSourceSampleRate(state.sampleRate)
  const nextChannelData = []

  for (const channel of channelData) {
    const nextChannel = new Float32Array(channel.length)

    for (let index = 0; index < channel.length; index += 1) {
      const sourceSample = (index * sourceSampleRate) / sampleRate
      const timeTicks = samplesToTicks(sourceSample, state.tickSize)
      const gain = resolveMasterGainAtTime(timeTicks, state.automationLanes, state.masterGain)
      nextChannel[index] = channel[index] * gain

      if ((index % EXPORT_SAMPLE_YIELD_CHUNK_SIZE) === 0) {
        reportExportProgress(onProgress, index / Math.max(1, channel.length))
        await maybeYieldToExportUi(uiYieldController)
      }
    }

    nextChannelData.push(nextChannel)
  }

  reportExportProgress(onProgress, 1)
  return nextChannelData
}

function collectTimelineBoundaries(tracks, variableTracks, valueTrackerTracks, tickSize, totalSamples) {
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

  for (const valueTrackerTrack of valueTrackerTracks ?? []) {
    for (const clip of valueTrackerTrack.clips) {
      boundaries.add(clampSampleBoundary(ticksToSamples(clip.start, tickSize), totalSamples))
      boundaries.add(clampSampleBoundary(ticksToSamples(getClipEnd(clip), tickSize), totalSamples))

      for (const eventTick of getValueTrackerEventTicks(clip)) {
        boundaries.add(clampSampleBoundary(ticksToSamples(eventTick, tickSize), totalSamples))
      }
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
  if (!hasRenderableFormulaInput(activeFormula)) {
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

function evaluateBytebeatSample(evaluator, time, bytebeatType) {
  try {
    return coerceBytebeatSampleValue(evaluator(time), bytebeatType)
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

async function encodeWavFile({ bitDepth = 16, channelData, onProgress = null, sampleRate }) {
  const uiYieldController = createExportUiYieldController()
  const normalizedBitDepth = normalizeWavExportOptions({ bitDepth }).bitDepth
  const numChannels = channelData.length
  const numFrames = channelData[0]?.length ?? 0
  const bytesPerSample = getWavBytesPerSample(normalizedBitDepth)
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const wavFormatCode = normalizedBitDepth === 32 ? 3 : 1

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, wavFormatCode, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, normalizedBitDepth, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44

  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      writeWavSample(
        view,
        offset,
        channelData[channel][frame] ?? 0,
        normalizedBitDepth
      )
      offset += bytesPerSample
    }

    if ((frame % EXPORT_SAMPLE_YIELD_CHUNK_SIZE) === 0) {
      reportExportProgress(onProgress, frame / Math.max(1, numFrames))
      await maybeYieldToExportUi(uiYieldController)
    }
  }

  reportExportProgress(onProgress, 1)
  return buffer
}

function getWavBytesPerSample(bitDepth) {
  if (bitDepth === 24) {
    return 3
  }

  if (bitDepth === 32) {
    return 4
  }

  return 2
}

function writeWavSample(view, offset, sample, bitDepth) {
  if (bitDepth === 24) {
    writePcm24Sample(view, offset, sample)
    return
  }

  if (bitDepth === 32) {
    writeFloat32Sample(view, offset, sample)
    return
  }

  writePcm16Sample(view, offset, sample)
}

function writePcm16Sample(view, offset, sample) {
  const clampedSample = clampAudioSample(sample)
  const pcmValue = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff
  view.setInt16(offset, Math.round(pcmValue), true)
}

function writePcm24Sample(view, offset, sample) {
  const clampedSample = clampAudioSample(sample)
  let pcmValue = Math.round(clampedSample < 0 ? clampedSample * 0x800000 : clampedSample * 0x7fffff)

  if (pcmValue < 0) {
    pcmValue += 0x1000000
  }

  view.setUint8(offset, pcmValue & 0xff)
  view.setUint8(offset + 1, (pcmValue >> 8) & 0xff)
  view.setUint8(offset + 2, (pcmValue >> 16) & 0xff)
}

function writeFloat32Sample(view, offset, sample) {
  const numericSample = Number(sample)
  view.setFloat32(offset, Number.isFinite(numericSample) ? numericSample : 0, true)
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function createExportUiYieldController() {
  return {
    nextYieldAt: getExportUiNow() + EXPORT_UI_YIELD_INTERVAL_MS
  }
}

async function maybeYieldToExportUi(controller) {
  if (getExportUiNow() < controller.nextYieldAt) {
    return
  }

  controller.nextYieldAt = getExportUiNow() + EXPORT_UI_YIELD_INTERVAL_MS
  await waitForExportUiFrame()
}

function getExportUiNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function waitForExportUiFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 0)
      })
      return
    }

    window.setTimeout(resolve, 0)
  })
}

function createScaledProgressReporter(onProgress, start, end) {
  if (typeof onProgress !== 'function') {
    return null
  }

  const normalizedStart = Number(start)
  const normalizedEnd = Number(end)

  return (progress) => {
    const clampedProgress = clampExportProgress(progress)
    const scaledProgress = normalizedStart + (normalizedEnd - normalizedStart) * clampedProgress
    onProgress(clampExportProgress(scaledProgress))
  }
}

function reportExportProgress(onProgress, progress) {
  if (typeof onProgress !== 'function') {
    return
  }

  onProgress(clampExportProgress(progress))
}

function clampExportProgress(progress) {
  const numericProgress = Number(progress)

  if (!Number.isFinite(numericProgress)) {
    return 0
  }

  return Math.max(0, Math.min(1, numericProgress))
}

function createWavFilename(projectTitle = DEFAULT_PROJECT_TITLE) {
  return createProjectFilenameFromTitle(projectTitle, 'wav')
}

function createMp3Filename(projectTitle = DEFAULT_PROJECT_TITLE) {
  return createProjectFilenameFromTitle(projectTitle, 'mp3')
}

function createOggOpusFilename(projectTitle = DEFAULT_PROJECT_TITLE) {
  return createProjectFilenameFromTitle(projectTitle, 'ogg')
}
