import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { getActiveFormula, getPlaybackEndTick } from '@/engine/timelineEngine'
import { resolveAudioEffectsAtTimeWithOverrides } from '@/services/automationService'
import { automationCompanionHostState } from '@/services/automationCompanionService'
import bytebeatService from '@/services/bytebeatService'
import { applyEvalEffects } from '@/services/evalEffectService'
import { midiClockState, refreshMidiClockDerivedState } from '@/services/midiClockService'
import { enqueueSnackbar } from '@/services/notifications'
import { useDawStore } from '@/stores/dawStore'
import { samplesToTicks, ticksToSamples } from '@/utils/timeUtils'

let transportPlayback = null

export function useTransportPlayback() {
  if (transportPlayback) {
    return transportPlayback
  }

  const dawStore = useDawStore()
  const { audioEffects, audioReady, automationLanes, automationLiveOverrides, bpmMeasure, bytebeatType, evalEffects, loopEnabled, loopEnd, loopStart, masterGain, playing, sampleRate, tickSize, tracks, valueTrackerLiveInputs, valueTrackerRecordingSession, valueTrackerTracks, variableTracks } =
    storeToRefs(dawStore)

  let frameId = 0
  let loopJumpInProgress = false
  let playbackEndStopDisabled = false
  const effectiveSampleRate = computed(() => {
    if (midiClockState.enabled && midiClockState.locked && Number.isFinite(midiClockState.effectiveSampleRate)) {
      return midiClockState.effectiveSampleRate
    }

    return sampleRate.value
  })

  const cancelLoop = () => {
    if (!frameId) {
      return
    }

    cancelAnimationFrame(frameId)
    frameId = 0
  }

  const syncMasterGainAtTime = async (timeTicks) => {
    await bytebeatService.syncMasterGainAtTime(timeTicks, dawStore)
  }

  const getAudioEffectsAtTime = (timeTicks) =>
    resolveAudioEffectsAtTimeWithOverrides(
      timeTicks,
      dawStore.automationLanes,
      audioEffects.value,
      dawStore.automationLiveOverrides
    )

  const syncAudioEffectsAtTime = async (timeTicks) => {
    await bytebeatService.syncAudioEffects(getAudioEffectsAtTime(timeTicks))
  }

  const getCurrentTime = () => {
    if (audioReady.value && playing.value) {
      return samplesToTicks(bytebeatService.getCurrentSample(), tickSize.value)
    }

    return dawStore.time
  }

  const normalizeRecordingStartTime = async () => {
    const currentTime = getCurrentTime()

    if (!loopEnabled.value || (currentTime >= loopStart.value && currentTime < loopEnd.value)) {
      return currentTime
    }

    await seekToTime(loopStart.value)
    return loopStart.value
  }

  const notifyRecordingStartFailure = (reason) => {
    if (reason === 'clip-collision') {
      enqueueSnackbar('Recording must start in empty Value Tracker space.', {
        variant: 'error'
      })
      return
    }

    if (reason === 'no-recording-space') {
      enqueueSnackbar('Recording needs at least 1 tick of free space.', {
        variant: 'error'
      })
      return
    }

    enqueueSnackbar('Could not start Value Tracker recording.', {
      variant: 'error'
    })
  }

  const syncPlaybackFrame = async () => {
    const currentSample = bytebeatService.getCurrentSample()
    const timeTicks = samplesToTicks(currentSample, tickSize.value)
    const recordingSession = valueTrackerRecordingSession.value

    if (
      recordingSession &&
      Number.isFinite(recordingSession.plannedStopTick) &&
      timeTicks >= recordingSession.plannedStopTick
    ) {
      dawStore.finishValueTrackerRecording({
        stopTick: recordingSession.plannedStopTick
      })
    }

    if (loopEnabled.value && timeTicks >= loopEnd.value && !loopJumpInProgress) {
      loopJumpInProgress = true

      try {
        const loopStartSample = ticksToSamples(loopStart.value, tickSize.value)
        const loopFormula = getActiveFormula(
          loopStart.value,
          tracks.value,
          variableTracks.value,
          valueTrackerTracks.value,
          valueTrackerLiveInputs.value
        )
        const loopExpressions = applyEvalEffects(loopFormula, evalEffects.value)

        await bytebeatService.seekToSample(loopStartSample, loopExpressions)
        dawStore.setTime(loopStart.value)
        await syncAudioEffectsAtTime(loopStart.value)
        await syncMasterGainAtTime(loopStart.value)
      } catch (error) {
        console.error('No se pudo reiniciar el loop', error)
      }

      loopJumpInProgress = false

      if (playing.value) {
        frameId = requestAnimationFrame(syncPlaybackFrame)
      }

      return
    }

    if (!loopEnabled.value && !playbackEndStopDisabled) {
      let playbackEndTick = getPlaybackEndTick(
        tracks.value,
        variableTracks.value,
        valueTrackerTracks.value
      )

      if (valueTrackerRecordingSession.value) {
        playbackEndTick = Number.isFinite(valueTrackerRecordingSession.value.plannedStopTick)
          ? Math.max(playbackEndTick, valueTrackerRecordingSession.value.plannedStopTick)
          : Number.POSITIVE_INFINITY
      }

      if (playbackEndTick <= 0 || timeTicks >= playbackEndTick) {
        await stop()
        return
      }
    }

    const activeFormula = getActiveFormula(
      timeTicks,
      tracks.value,
      variableTracks.value,
      valueTrackerTracks.value,
      valueTrackerLiveInputs.value
    )
    const activeExpressions = applyEvalEffects(activeFormula, evalEffects.value)

    dawStore.setTime(timeTicks)
    void syncAudioEffectsAtTime(timeTicks)
    void syncMasterGainAtTime(timeTicks)
    void bytebeatService.setExpressions(activeExpressions)

    if (playing.value) {
      frameId = requestAnimationFrame(syncPlaybackFrame)
    }
  }

  const enableAudio = async () => {
    if (audioReady.value) {
      return
    }

    bytebeatService.setType(bytebeatType.value)
    await bytebeatService.init()
    await bytebeatService.unlock()
    bytebeatService.setDesiredSampleRate(effectiveSampleRate.value)
    await syncAudioEffectsAtTime(dawStore.time)
    await syncMasterGainAtTime(dawStore.time)
    await bytebeatService.setExpressions([''], true, true)

    dawStore.setAudioReady(true)
  }

  const play = async () => {
    if (playing.value) {
      return
    }

    try {
      await enableAudio()
      bytebeatService.setDesiredSampleRate(effectiveSampleRate.value)
      await syncAudioEffectsAtTime(dawStore.time)

      const resumeTime = dawStore.time
      const resumeFromPause = resumeTime > 0
      const initialFormula = getActiveFormula(
        resumeTime,
        tracks.value,
        variableTracks.value,
        valueTrackerTracks.value,
        valueTrackerLiveInputs.value
      )
      const initialExpressions = applyEvalEffects(initialFormula, evalEffects.value)

      if (resumeFromPause) {
        bytebeatService.releaseHeldSample()
      } else {
        bytebeatService.setSampleOffset(0)
      }

      await syncMasterGainAtTime(resumeTime)
      await bytebeatService.setExpressions(initialExpressions, !resumeFromPause, true)
      await bytebeatService.play({ resetTime: !resumeFromPause })

      if (!resumeFromPause) {
        dawStore.setTime(0)
      }

      dawStore.startPlayback()

      cancelLoop()
      syncPlaybackFrame()
    } catch (error) {
      dawStore.stopPlayback()
      console.error('No se pudo iniciar la reproduccion bytebeat', error)
    }
  }

  const pause = async () => {
    if (!playing.value) {
      return
    }

    const pausedTime = getCurrentTime()

    if (dawStore.isValueTrackerRecording) {
      dawStore.finishValueTrackerRecording({
        stopPlayback: true,
        stopTick: pausedTime
      })
    }

    loopJumpInProgress = false
    cancelLoop()
    dawStore.stopPlayback()
    dawStore.setTime(pausedTime)

    try {
      await bytebeatService.pause()
    } catch (error) {
      console.error('No se pudo pausar la reproduccion bytebeat', error)
    }
  }

  const togglePlay = async () => {
    if (playing.value) {
      await pause()
      return
    }

    await play()
  }

  const stop = async () => {
    const stopTime = getCurrentTime()

    if (dawStore.isValueTrackerRecording) {
      dawStore.finishValueTrackerRecording({
        stopPlayback: true,
        stopTick: stopTime
      })
    }

    playbackEndStopDisabled = false
    loopJumpInProgress = false
    cancelLoop()
    dawStore.stopPlayback()
    dawStore.setTime(0)

    try {
      await bytebeatService.stop()
      await syncMasterGainAtTime(0)
    } catch (error) {
      console.error('No se pudo detener la reproduccion bytebeat', error)
    }
  }

  const seekToTime = async (nextTime) => {
    const normalizedTime = Math.max(0, Number(nextTime) || 0)
    dawStore.setTime(normalizedTime)

    if (!audioReady.value) {
      return
    }

    const targetSample = ticksToSamples(normalizedTime, tickSize.value)

    if (playing.value) {
      const activeFormula = getActiveFormula(
        normalizedTime,
        tracks.value,
        variableTracks.value,
        valueTrackerTracks.value,
        valueTrackerLiveInputs.value
      )
      const activeExpressions = applyEvalEffects(activeFormula, evalEffects.value)

      try {
        await bytebeatService.seekToSample(targetSample, activeExpressions)
        await syncAudioEffectsAtTime(normalizedTime)
        await syncMasterGainAtTime(normalizedTime)
      } catch (error) {
        console.error('No se pudo mover el playhead', error)
      }

      return
    }

    bytebeatService.holdSample(targetSample)
    void syncAudioEffectsAtTime(normalizedTime)
    void syncMasterGainAtTime(normalizedTime)
  }

  const record = async () => {
    if (dawStore.isValueTrackerRecording) {
      dawStore.finishValueTrackerRecording({
        stopTick: getCurrentTime()
      })
      return
    }

    if (midiClockState.enabled && midiClockState.locked && !playing.value) {
      enqueueSnackbar('Use external MIDI Start to begin recording.', {
        variant: 'error'
      })
      return
    }

    const startTick = await normalizeRecordingStartTime()
    const startResult = dawStore.startValueTrackerRecording({ startTick })

    if (!startResult.ok) {
      notifyRecordingStartFailure(startResult.reason)
      return
    }

    playbackEndStopDisabled = true

    if (playing.value) {
      return
    }

    await play()

    if (!playing.value) {
      dawStore.cancelValueTrackerRecording()
      playbackEndStopDisabled = false
    }
  }

  const toggleRecord = async () => {
    if (dawStore.isValueTrackerRecording) {
      await record()
      return
    }

    if (automationCompanionHostState.controllers.length) {
      dawStore.toggleAutomationRecordingArmed()
      return
    }

    await record()
  }

  const startFromExternalClock = async () => {
    await seekToTime(0)

    if (!playing.value) {
      await play()
    }
  }

  const continueFromExternalClock = async () => {
    if (!playing.value) {
      await play()
    }
  }

  const stopFromExternalClock = async () => {
    if (playing.value) {
      await pause()
    }
  }

  transportPlayback = {
    continueFromExternalClock,
    play,
    enableAudio,
    getCurrentTime,
    pause,
    record,
    seekToTime,
    startFromExternalClock,
    stopFromExternalClock,
    toggleRecord,
    togglePlay,
    stop
  }

  watch(
    audioEffects,
    () => {
      void syncAudioEffectsAtTime(dawStore.time)

      if (playing.value) {
        void bytebeatService.reconnectAudioGraph(getAudioEffectsAtTime(dawStore.time))
      }
    },
    { deep: true }
  )

  watch(masterGain, () => {
    void syncMasterGainAtTime(dawStore.time)
  })

  watch(automationLanes, () => {
    void syncAudioEffectsAtTime(dawStore.time)
    void syncMasterGainAtTime(dawStore.time)
  }, { deep: true })

  watch(automationLiveOverrides, () => {
    void syncAudioEffectsAtTime(dawStore.time)
    void syncMasterGainAtTime(dawStore.time)
  }, { deep: true })

  watch(bpmMeasure, () => {
    refreshMidiClockDerivedState()
  })

  watch(effectiveSampleRate, (nextSampleRate) => {
    bytebeatService.setDesiredSampleRate(nextSampleRate)
  })

  watch(bytebeatType, (nextBytebeatType) => {
    bytebeatService.setType(nextBytebeatType)
  })

  return transportPlayback
}
