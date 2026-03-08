import { onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { getActiveFormula } from '@/engine/timelineEngine'
import bytebeatService from '@/services/bytebeatService'
import { useDawStore } from '@/stores/dawStore'
import { samplesToTicks } from '@/utils/timeUtils'

export function useTransportPlayback() {
  const dawStore = useDawStore()
  const { playing, sampleRate, tickSize, tracks } = storeToRefs(dawStore)

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

  const play = async () => {
    if (playing.value) {
      return
    }

    try {
      await bytebeatService.init()
      bytebeatService.setDesiredSampleRate(sampleRate.value)

      const initialFormula = getActiveFormula(0, tracks.value)
      await bytebeatService.setFormula(initialFormula)
      await bytebeatService.play()

      dawStore.setTime(0)
      dawStore.startPlayback()

      cancelLoop()
      syncPlaybackFrame()
    } catch (error) {
      dawStore.stopPlayback()
      console.error('No se pudo iniciar la reproduccion bytebeat', error)
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
    stop
  }
}
