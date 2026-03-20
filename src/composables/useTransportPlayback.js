import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { getActiveFormula, getPlaybackEndTick } from '@/engine/timelineEngine'
import { resolveAudioEffectsAtTime } from '@/services/automationService'
import bytebeatService from '@/services/bytebeatService'
import { applyEvalEffects } from '@/services/evalEffectService'
import { useDawStore } from '@/stores/dawStore'
import { samplesToTicks, ticksToSamples } from '@/utils/timeUtils'

let transportPlayback = null

export function useTransportPlayback() {
  if (transportPlayback) {
    return transportPlayback
  }

  const dawStore = useDawStore()
  const { audioEffects, audioReady, automationLanes, evalEffects, formulas, loopEnabled, loopEnd, loopStart, masterGain, playing, sampleRate, tickSize, tracks, valueRollTracks, variableTracks } =
    storeToRefs(dawStore)

  let frameId = 0
  let loopJumpInProgress = false

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
    resolveAudioEffectsAtTime(timeTicks, dawStore.automationLanes, audioEffects.value)

  const syncAudioEffectsAtTime = async (timeTicks) => {
    await bytebeatService.syncAudioEffects(getAudioEffectsAtTime(timeTicks))
  }

  const syncPlaybackFrame = async () => {
    const currentSample = bytebeatService.getCurrentSample()
    const timeTicks = samplesToTicks(currentSample, tickSize.value)

    if (loopEnabled.value && timeTicks >= loopEnd.value && !loopJumpInProgress) {
      loopJumpInProgress = true

      try {
        const loopStartSample = ticksToSamples(loopStart.value, tickSize.value)
        const loopFormula = getActiveFormula(
          loopStart.value,
          tracks.value,
          formulas.value,
          variableTracks.value,
          valueRollTracks.value
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

    if (!loopEnabled.value) {
      const playbackEndTick = getPlaybackEndTick(tracks.value)

      if (playbackEndTick <= 0 || timeTicks >= playbackEndTick) {
        await stop()
        return
      }
    }

    const activeFormula = getActiveFormula(
      timeTicks,
      tracks.value,
      formulas.value,
      variableTracks.value,
      valueRollTracks.value
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

    await bytebeatService.init()
    await bytebeatService.unlock()
    bytebeatService.setDesiredSampleRate(sampleRate.value)
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
      bytebeatService.setDesiredSampleRate(sampleRate.value)
      await syncAudioEffectsAtTime(dawStore.time)

      const resumeTime = dawStore.time
      const resumeFromPause = resumeTime > 0
      const initialFormula = getActiveFormula(
        resumeTime,
        tracks.value,
        formulas.value,
        variableTracks.value,
        valueRollTracks.value
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

    const pausedSample = bytebeatService.getCurrentSample()
    const pausedTime = samplesToTicks(pausedSample, tickSize.value)

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
        formulas.value,
        variableTracks.value,
        valueRollTracks.value
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

  transportPlayback = {
    play,
    enableAudio,
    pause,
    seekToTime,
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

  watch(sampleRate, (nextSampleRate) => {
    bytebeatService.setDesiredSampleRate(nextSampleRate)
  })

  return transportPlayback
}
