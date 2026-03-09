import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { getActiveFormula } from '@/engine/timelineEngine'
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
  const { audioEffects, audioReady, evalEffects, formulas, loopEnabled, loopEnd, loopStart, masterGain, playing, sampleRate, tickSize, tracks } =
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

  const syncPlaybackFrame = async () => {
    const currentSample = bytebeatService.getCurrentSample()
    const timeTicks = samplesToTicks(currentSample, tickSize.value)

    if (loopEnabled.value && timeTicks >= loopEnd.value && !loopJumpInProgress) {
      loopJumpInProgress = true

      try {
        const loopStartSample = ticksToSamples(loopStart.value, tickSize.value)
        const loopFormula = getActiveFormula(loopStart.value, tracks.value, formulas.value)
        const loopExpressions = applyEvalEffects(loopFormula, evalEffects.value)

        await bytebeatService.seekToSample(loopStartSample, loopExpressions)
        dawStore.setTime(loopStart.value)
      } catch (error) {
        console.error('No se pudo reiniciar el loop', error)
      }

      loopJumpInProgress = false

      if (playing.value) {
        frameId = requestAnimationFrame(syncPlaybackFrame)
      }

      return
    }

    const activeFormula = getActiveFormula(timeTicks, tracks.value, formulas.value)
    const activeExpressions = applyEvalEffects(activeFormula, evalEffects.value)

    dawStore.setTime(timeTicks)
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
    await bytebeatService.syncAudioEffects(audioEffects.value)
    await bytebeatService.setMasterGain(masterGain.value)
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
      await bytebeatService.syncAudioEffects(audioEffects.value)
      await bytebeatService.setMasterGain(masterGain.value)

      const resumeTime = dawStore.time
      const resumeFromPause = resumeTime > 0
      const initialFormula = getActiveFormula(resumeTime, tracks.value, formulas.value)
      const initialExpressions = applyEvalEffects(initialFormula, evalEffects.value)

      if (resumeFromPause) {
        bytebeatService.releaseHeldSample()
      } else {
        bytebeatService.setSampleOffset(0)
      }

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
    } catch (error) {
      console.error('No se pudo detener la reproduccion bytebeat', error)
    }
  }

  transportPlayback = {
    play,
    enableAudio,
    pause,
    togglePlay,
    stop
  }

  watch(
    audioEffects,
    (nextAudioEffects) => {
      void bytebeatService.syncAudioEffects(nextAudioEffects)

      if (playing.value) {
        void bytebeatService.reconnectAudioGraph(nextAudioEffects)
      }
    },
    { deep: true }
  )

  watch(masterGain, (nextMasterGain) => {
    void bytebeatService.setMasterGain(nextMasterGain)
  })

  watch(sampleRate, (nextSampleRate) => {
    bytebeatService.setDesiredSampleRate(nextSampleRate)
  })

  return transportPlayback
}
