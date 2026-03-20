import { Compressor, Context as ToneContext, Distortion, EQ3, FeedbackDelay, Limiter, Reverb, StereoWidener, connect as toneConnect } from 'tone'
import { getActiveFormula } from '@/engine/timelineEngine'
import {
  getAutomationLaneByAudioEffectParam,
  getAutomationLaneById,
  getSortedAutomationPoints,
  resolveAudioEffectAtTime,
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
import { getValueRollEventTicks } from '@/services/valueRollService'
import { DEFAULT_SAMPLE_RATE } from '@/utils/audioSettings'
import { validateFormula } from '@/utils/formulaValidation'
import { getClipEnd, samplesToTicks, ticksToSamples } from '@/utils/timeUtils'

const SILENT_EVALUATOR = () => 0
const DEFAULT_EXPORT_WAV_SAMPLE_RATE = 44100
const OFFLINE_RENDERABLE_AUDIO_EFFECT_TYPES = ['eq', 'distortion', 'stereoWidener', 'delay', 'compressor', 'reverb', 'limiter']
const MANUAL_OFFLINE_AUTOMATION_PARAM_KEYS = {
  distortion: ['drive'],
  reverb: ['decay', 'preDelay']
}

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
    state.valueRollTracks,
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
      state.variableTracks,
      state.valueRollTracks
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

  const sourceSampleRate = getSourceSampleRate(state.sampleRate)
  const toneNodes = await Promise.all(
    enabledAudioEffects.map(async (effect) => ({
      effect,
      node: await createOfflineAudioEffectNode(effect, toneContext)
    }))
  )
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

  if (manualAutomationTask) {
    await manualAutomationTask
  }

  const renderedBuffer = await renderPromise

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

  let lastTimeSeconds = 0

  for (const point of points) {
    const timeSeconds = ticksToSeconds(point.time, tickSize, sourceSampleRate)
    const normalizedValue = normalizeValue(point.value)

    if (timeSeconds <= 0) {
      target.setValueAtTime(normalizedValue, 0)
      continue
    }

    if (
      typeof target.linearRampToValueAtTime === 'function' &&
      timeSeconds > lastTimeSeconds
    ) {
      target.linearRampToValueAtTime(normalizedValue, timeSeconds)
    } else {
      target.setValueAtTime(normalizedValue, timeSeconds)
    }

    lastTimeSeconds = timeSeconds
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
      const points = getSortedAutomationPoints(lane?.points ?? [])

      for (const point of points) {
        if (point.time <= 0) {
          continue
        }

        const timeSeconds = ticksToSeconds(point.time, tickSize, sourceSampleRate)

        if (timeSeconds <= 0 || timeSeconds >= durationSeconds) {
          continue
        }

        checkpoints.set(point.time, {
          timeTicks: point.time,
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

  return value
}

function ticksToSeconds(ticks, tickSize, sourceSampleRate) {
  return ticksToSamples(ticks, tickSize) / sourceSampleRate
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

function collectTimelineBoundaries(tracks, variableTracks, valueRollTracks, tickSize, totalSamples) {
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

  for (const valueRollTrack of valueRollTracks ?? []) {
    for (const clip of valueRollTrack.clips) {
      boundaries.add(clampSampleBoundary(ticksToSamples(clip.start, tickSize), totalSamples))
      boundaries.add(clampSampleBoundary(ticksToSamples(getClipEnd(clip), tickSize), totalSamples))

      for (const eventTick of getValueRollEventTicks(clip)) {
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
