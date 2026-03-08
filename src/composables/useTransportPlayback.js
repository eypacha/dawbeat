import { onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { getActiveFormula } from '@/engine/timelineEngine'
import bytebeatService from '@/services/bytebeatService'
import { useDawStore } from '@/stores/dawStore'
import { samplesToTicks } from '@/utils/timeUtils'

export function useTransportPlayback() {
  const dawStore = useDawStore()
  const { audioReady, playing, sampleRate, tickSize, tracks } = storeToRefs(dawStore)

  let frameId = 0

  const cancelLoop = () => {
    if (!frameId) {
      return
    }

    cancelAnimationFrame(frameId)
    frameId = 0
  }

  const syncPlaybackFrame = () => {
    const currentSample = bytebeatService.getCurrentSample()
    const timeTicks = samplesToTicks(currentSample, tickSize.value)
    const activeFormula = getActiveFormula(timeTicks, tracks.value)

    dawStore.setTime(timeTicks)
    void bytebeatService.setFormula(activeFormula)

    if (playing.value) {
      frameId = requestAnimationFrame(syncPlaybackFrame)
    }
  }

  const enableAudio = async () => {
    if (audioReady.value) {
      return
    }

    await bytebeatService.init()
    bytebeatService.setDesiredSampleRate(sampleRate.value)

    const initialFormula = getActiveFormula(0, tracks.value)
    await bytebeatService.setFormula(initialFormula, true)
    await bytebeatService.unlock()

    dawStore.setAudioReady(true)
  }

  const play = async () => {
    if (playing.value) {
      return
    }

    try {
      await enableAudio()
      bytebeatService.setDesiredSampleRate(sampleRate.value)

      const resumeTime = dawStore.time
      const resumeFromPause = resumeTime > 0
      const initialFormula = getActiveFormula(resumeTime, tracks.value)

      await bytebeatService.setFormula(initialFormula, !resumeFromPause)
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

    cancelLoop()
    dawStore.stopPlayback()

    try {
      await bytebeatService.pause()
    } catch (error) {
      console.error('No se pudo pausar la reproduccion bytebeat', error)
    }
  }

  const stop = async () => {
    cancelLoop()
    dawStore.stopPlayback()
    dawStore.setTime(0)

    try {
      await bytebeatService.stop()
    } catch (error) {
      console.error('No se pudo detener la reproduccion bytebeat', error)
    }
  }

  onBeforeUnmount(() => {
    void stop()
  })

  return {
    play,
    enableAudio,
    pause,
    stop
  }
}
