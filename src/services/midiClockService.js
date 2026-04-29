import { reactive } from 'vue'
import { getSampleRateFromBpm } from '@/services/bpmService'
import {
  enableMidiInput,
  getMidiInputDisplayName,
  midiState,
  subscribeMidiMessageEvents
} from '@/services/midiInputService'
import { enqueueSnackbar } from '@/services/notifications'
import { useDawStore } from '@/stores/dawStore'
import { MAX_SAMPLE_RATE, MIN_SAMPLE_RATE } from '@/utils/audioSettings'

const MIDI_TIMING_CLOCK = 0xF8
const MIDI_START = 0xFA
const MIDI_CONTINUE = 0xFB
const MIDI_STOP = 0xFC
const MIDI_CLOCK_PULSES_PER_QUARTER = 24
const MIDI_CLOCK_INTERVAL_WINDOW_SIZE = 24
const MIDI_CLOCK_MIN_LOCK_INTERVALS = 6
const MIDI_CLOCK_TIMEOUT_FLOOR_MS = 250
const MIDI_CLOCK_TIMEOUT_MULTIPLIER = 8

export const midiClockState = reactive({
  effectiveSampleRate: null,
  enabled: false,
  externalBpm: null,
  lastClockAt: null,
  locked: false,
  running: false,
  selectedInputId: '',
  syncSourceName: ''
})

let lastClockTimestamp = 0
let clockIntervals = []
let clockTimeoutId = null
let disposeMidiMessageSubscription = null
let transportHandlers = null
let transportCommandChain = Promise.resolve()

export async function setMidiClockReceiveEnabled(value) {
  const shouldEnable = Boolean(value)

  if (!shouldEnable) {
    midiClockState.enabled = false
    resetMidiClockRuntime()
    return true
  }

  const midiEnabled = midiState.enabled || await enableMidiInput()

  if (!midiEnabled) {
    return false
  }

  ensureMidiClockSubscription()

  midiClockState.enabled = true

  if (!midiClockState.selectedInputId && midiState.inputs.length) {
    midiClockState.selectedInputId = midiState.inputs[0].id
  }

  midiClockState.syncSourceName = getMidiInputDisplayName(midiClockState.selectedInputId)
  return true
}

export function setMidiClockInput(deviceId) {
  midiClockState.selectedInputId = typeof deviceId === 'string' ? deviceId : ''
  midiClockState.syncSourceName = getMidiInputDisplayName(midiClockState.selectedInputId)
  resetMidiClockRuntime()
}

export function refreshMidiClockDerivedState() {
  if (!midiClockState.locked || !Number.isFinite(midiClockState.externalBpm) || midiClockState.externalBpm <= 0) {
    midiClockState.effectiveSampleRate = null
    return null
  }

  const dawStore = useDawStore()
  const runtimeSampleRate = getSampleRateFromBpm(midiClockState.externalBpm, dawStore.bpmMeasure)

  if (!Number.isFinite(runtimeSampleRate) || runtimeSampleRate <= 0) {
    midiClockState.effectiveSampleRate = null
    return null
  }

  midiClockState.effectiveSampleRate = clampRuntimeSampleRate(runtimeSampleRate)
  return midiClockState.effectiveSampleRate
}

export function registerMidiClockTransport(handlers = {}) {
  transportHandlers = {
    continueFromExternalClock: handlers.continueFromExternalClock ?? null,
    continueFromMidiTransport: handlers.continueFromMidiTransport ?? null,
    startFromExternalClock: handlers.startFromExternalClock ?? null,
    startFromMidiTransport: handlers.startFromMidiTransport ?? null,
    stopFromExternalClock: handlers.stopFromExternalClock ?? null,
    stopFromMidiTransport: handlers.stopFromMidiTransport ?? null
  }

  ensureMidiClockSubscription()

  return () => {
    if (transportHandlers?.startFromExternalClock === handlers.startFromExternalClock) {
      transportHandlers = null
    }
  }
}

export function disposeMidiClock() {
  clearClockTimeout()
  resetMidiClockRuntime()
  midiClockState.enabled = false

  if (disposeMidiMessageSubscription) {
    disposeMidiMessageSubscription()
    disposeMidiMessageSubscription = null
  }

  transportHandlers = null
}

function ensureMidiClockSubscription() {
  if (disposeMidiMessageSubscription) {
    return
  }

  disposeMidiMessageSubscription = subscribeMidiMessageEvents(handleMidiMessageEvent)
}

function handleMidiMessageEvent(message) {
  if (!midiClockState.enabled) {
    if (handleStandardTransportMessage(message.status)) {
      return
    }

    return
  }

  if (!midiClockState.selectedInputId && midiState.inputs.length) {
    midiClockState.selectedInputId = midiState.inputs[0].id
  }

  if (!midiClockState.selectedInputId || message.deviceId !== midiClockState.selectedInputId) {
    return
  }

  midiClockState.syncSourceName = message.deviceName || getMidiInputDisplayName(message.deviceId)

  if (message.status === MIDI_TIMING_CLOCK) {
    handleTimingClock(message)
    return
  }

  if (handleClockTransportMessage(message.status)) {
    return
  }
}

function handleClockTransportMessage(status) {
  if (status === MIDI_START) {
    if (midiClockState.enabled) {
      midiClockState.running = true
    }
    enqueueTransportCommand('startFromExternalClock')
    return true
  }

  if (status === MIDI_CONTINUE) {
    if (midiClockState.enabled) {
      midiClockState.running = true
    }
    enqueueTransportCommand('continueFromExternalClock')
    return true
  }

  if (status === MIDI_STOP) {
    if (midiClockState.enabled) {
      midiClockState.running = false
    }
    enqueueTransportCommand('stopFromExternalClock')
    return true
  }

  return false
}

function handleStandardTransportMessage(status) {
  if (status === MIDI_START) {
    enqueueTransportCommand('startFromMidiTransport')
    return true
  }

  if (status === MIDI_CONTINUE) {
    enqueueTransportCommand('continueFromMidiTransport')
    return true
  }

  if (status === MIDI_STOP) {
    enqueueTransportCommand('stopFromMidiTransport')
    return true
  }

  return false
}

function handleTimingClock(message) {
  const nextTimestamp = Number(message.receivedAt)

  if (!Number.isFinite(nextTimestamp) || nextTimestamp <= 0) {
    return
  }

  if (lastClockTimestamp > 0) {
    const interval = nextTimestamp - lastClockTimestamp

    if (Number.isFinite(interval) && interval > 0) {
      clockIntervals = [...clockIntervals, interval].slice(-MIDI_CLOCK_INTERVAL_WINDOW_SIZE)

      if (clockIntervals.length >= MIDI_CLOCK_MIN_LOCK_INTERVALS) {
        midiClockState.externalBpm = getExternalClockBpm()
        midiClockState.locked = Number.isFinite(midiClockState.externalBpm)
        refreshMidiClockDerivedState()
      }
    }
  }

  lastClockTimestamp = nextTimestamp
  midiClockState.lastClockAt = nextTimestamp
  scheduleClockTimeout()
}

function scheduleClockTimeout() {
  clearClockTimeout()

  const averageInterval = getAverageClockInterval()
  const timeoutMs = Math.max(
    MIDI_CLOCK_TIMEOUT_FLOOR_MS,
    Number.isFinite(averageInterval)
      ? averageInterval * MIDI_CLOCK_TIMEOUT_MULTIPLIER
      : MIDI_CLOCK_TIMEOUT_FLOOR_MS
  )

  clockTimeoutId = globalThis.setTimeout(() => {
    resetMidiClockRuntime()
  }, timeoutMs)
}

function clearClockTimeout() {
  if (!clockTimeoutId) {
    return
  }

  globalThis.clearTimeout(clockTimeoutId)
  clockTimeoutId = null
}

function resetMidiClockRuntime() {
  clearClockTimeout()
  lastClockTimestamp = 0
  clockIntervals = []
  midiClockState.effectiveSampleRate = null
  midiClockState.externalBpm = null
  midiClockState.lastClockAt = null
  midiClockState.locked = false
  midiClockState.running = false
  midiClockState.syncSourceName = getMidiInputDisplayName(midiClockState.selectedInputId)
}

function enqueueTransportCommand(handlerName) {
  const handler = transportHandlers?.[handlerName]

  if (typeof handler !== 'function') {
    return
  }

  transportCommandChain = transportCommandChain
    .then(() => handler())
    .catch((error) => {
      console.error('No se pudo sincronizar el transporte por MIDI Clock', error)
      enqueueSnackbar('MIDI Clock transport sync failed.', {
        variant: 'error'
      })
    })
}

function getAverageClockInterval() {
  if (!clockIntervals.length) {
    return null
  }

  return clockIntervals.reduce((sum, interval) => sum + interval, 0) / clockIntervals.length
}

function getExternalClockBpm() {
  const averageInterval = getAverageClockInterval()

  if (!Number.isFinite(averageInterval) || averageInterval <= 0) {
    return null
  }

  return 60000 / (averageInterval * MIDI_CLOCK_PULSES_PER_QUARTER)
}

function clampRuntimeSampleRate(value) {
  return Math.min(MAX_SAMPLE_RATE, Math.max(MIN_SAMPLE_RATE, value))
}
