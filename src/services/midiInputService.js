import { reactive } from 'vue'
import { dispatchValueTrackerInput } from '@/services/valueTrackerInputService'
import { enqueueSnackbar } from '@/services/notifications'
import { VALUE_TRACKER_MAX } from '@/services/valueTrackerService'

const MIDI_NOTE_OFF = 0x80
const MIDI_NOTE_ON = 0x90
const MIDI_CONTROL_CHANGE = 0xB0
const MAX_RECENT_MESSAGES = 12

const midiSupport = Boolean(globalThis.navigator?.requestMIDIAccess)

export const midiState = reactive({
  enabled: false,
  error: '',
  initializing: false,
  inputs: [],
  recentMessages: [],
  supported: midiSupport
})

let activeLearnSession = null
let midiAccess = null
let midiEnablePromise = null
const midiInputHandlers = new Map()
const midiMessageSubscribers = new Set()

export async function enableMidiInput() {
  if (!midiState.supported) {
    midiState.error = 'Web MIDI is not available in this browser.'
    enqueueSnackbar(midiState.error, { variant: 'error' })
    return false
  }

  if (midiAccess) {
    syncMidiInputs()
    midiState.enabled = true
    return true
  }

  if (midiEnablePromise) {
    return midiEnablePromise
  }

  midiState.initializing = true
  midiState.error = ''

  midiEnablePromise = globalThis.navigator.requestMIDIAccess({ sysex: false })
    .then((access) => {
      midiAccess = access
      midiAccess.onstatechange = handleMidiStateChange
      midiState.enabled = true
      syncMidiInputs()
      enqueueSnackbar('MIDI input enabled.', { variant: 'success' })
      return true
    })
    .catch((error) => {
      console.error('No se pudo habilitar MIDI', error)
      midiState.enabled = false
      midiState.error = 'Could not access MIDI devices.'
      enqueueSnackbar(midiState.error, { variant: 'error' })
      return false
    })
    .finally(() => {
      midiState.initializing = false
      midiEnablePromise = null
    })

  return midiEnablePromise
}

export function refreshMidiInputs() {
  if (!midiAccess) {
    return false
  }

  syncMidiInputs()
  return true
}

export function disposeMidiInput() {
  stopMidiLearn()

  for (const inputHandlerEntry of midiInputHandlers.values()) {
    inputHandlerEntry.input.onmidimessage = null
  }

  midiInputHandlers.clear()

  if (midiAccess) {
    midiAccess.onstatechange = null
  }

  midiAccess = null
  midiEnablePromise = null
  midiState.enabled = false
  midiState.initializing = false
  midiState.inputs = []
  midiState.recentMessages = []
}

export function startMidiLearn(callback, options = {}) {
  if (typeof callback !== 'function') {
    return false
  }

  const sources = Array.isArray(options.sources) ? options.sources.filter(Boolean) : []

  activeLearnSession = {
    callback,
    sources: new Set(sources)
  }

  return true
}

export function stopMidiLearn() {
  activeLearnSession = null
}

export function getMidiInputDisplayName(deviceId) {
  if (typeof deviceId !== 'string' || !deviceId) {
    return ''
  }

  return midiState.inputs.find((input) => input.id === deviceId)?.name ?? ''
}

export function subscribeMidiMessageEvents(callback) {
  if (typeof callback !== 'function') {
    return () => {}
  }

  midiMessageSubscribers.add(callback)

  return () => {
    midiMessageSubscribers.delete(callback)
  }
}

export function formatMidiDebugMessage(message) {
  if (!message) {
    return ''
  }

  const sourceLabel = message.source === 'midiCc'
    ? `CC ${message.controller ?? '--'}`
    : `Note ${message.note ?? '--'}`
  const channelLabel = `Ch ${message.channel ?? '--'}`
  const rawLabel = `raw ${message.rawValue ?? '--'}`
  const valueLabel = `value ${message.value ?? '--'}`
  const deviceLabel = message.deviceName || 'Unknown device'

  return `${sourceLabel} · ${channelLabel} · ${rawLabel} · ${valueLabel} · ${deviceLabel}`
}

function handleMidiStateChange() {
  syncMidiInputs()
}

function syncMidiInputs() {
  if (!midiAccess) {
    midiState.inputs = []
    return
  }

  const nextInputs = Array.from(midiAccess.inputs.values())
    .map((input) => ({
      connection: input.connection,
      id: input.id,
      manufacturer: input.manufacturer || '',
      name: input.name || 'Unknown device',
      state: input.state
    }))
    .sort((leftInput, rightInput) => leftInput.name.localeCompare(rightInput.name))

  const nextInputIds = new Set(nextInputs.map((input) => input.id))

  for (const [inputId, inputHandlerEntry] of midiInputHandlers.entries()) {
    if (nextInputIds.has(inputId)) {
      continue
    }

    inputHandlerEntry.input.onmidimessage = null
    midiInputHandlers.delete(inputId)
  }

  for (const input of midiAccess.inputs.values()) {
    if (midiInputHandlers.has(input.id)) {
      continue
    }

    const handler = (event) => handleMidiMessage(event, input)
    input.onmidimessage = handler
    midiInputHandlers.set(input.id, {
      handler,
      input
    })
  }

  midiState.inputs = nextInputs
}

function handleMidiMessage(event, input) {
  const normalizedEvent = normalizeMidiEvent(event, input)

  if (!normalizedEvent) {
    return
  }

  notifyMidiMessageSubscribers(normalizedEvent)

  const normalizedMessage = normalizeMidiMessage(normalizedEvent)

  if (!normalizedMessage) {
    return
  }

  midiState.recentMessages = [
    {
      ...normalizedMessage,
      id: createMidiMessageId()
    },
    ...midiState.recentMessages
  ].slice(0, MAX_RECENT_MESSAGES)

  maybeCompleteMidiLearn(normalizedMessage)
  dispatchValueTrackerInput(normalizedMessage)
}

function notifyMidiMessageSubscribers(message) {
  for (const subscriber of midiMessageSubscribers) {
    try {
      subscriber(message)
    } catch (error) {
      console.error('No se pudo despachar el mensaje MIDI', error)
    }
  }
}

function maybeCompleteMidiLearn(message) {
  if (!activeLearnSession) {
    return
  }

  if (activeLearnSession.sources.size && !activeLearnSession.sources.has(message.source)) {
    return
  }

  const callback = activeLearnSession.callback
  activeLearnSession = null

  callback(createMidiLearnBinding(message), message)
}

function normalizeMidiEvent(event, input) {
  const data = Array.from(event?.data ?? [])

  if (!data.length) {
    return null
  }

  const [status, data1 = null, data2 = null] = data

  return {
    data,
    data1,
    data2,
    deviceId: input?.id ?? null,
    deviceName: input?.name || 'Unknown device',
    receivedAt: Number(event?.timeStamp) || globalThis.performance?.now?.() || Date.now(),
    status
  }
}

function normalizeMidiMessage(event) {
  const { data, data1, data2, deviceId, deviceName, status } = event

  if (data.length < 3) {
    return null
  }

  const command = status & 0xF0
  const channel = (status & 0x0F) + 1
  const baseMessage = {
    channel,
    deviceId,
    deviceName,
    rawValue: data2,
    timeTicks: undefined
  }

  if (command === MIDI_CONTROL_CHANGE) {
    return {
      ...baseMessage,
      controller: data1,
      note: null,
      source: 'midiCc',
      value: scaleMidi7BitValue(data2)
    }
  }

  if (command === MIDI_NOTE_ON) {
    return {
      ...baseMessage,
      controller: null,
      note: data1,
      source: 'midiNote',
      value: data2 > 0 ? scaleMidi7BitValue(data2) : 0
    }
  }

  if (command === MIDI_NOTE_OFF) {
    return {
      ...baseMessage,
      controller: null,
      note: data1,
      source: 'midiNote',
      value: 0
    }
  }

  return null
}

function createMidiLearnBinding(message) {
  if (message.source === 'midiCc') {
    return {
      channel: message.channel,
      controller: message.controller,
      deviceId: message.deviceId,
      note: null,
      type: 'midiCc',
      variableName: null
    }
  }

  if (message.source === 'midiNote') {
    return {
      channel: message.channel,
      controller: null,
      deviceId: message.deviceId,
      note: message.note,
      type: 'midiNote',
      variableName: null
    }
  }

  return {
    channel: null,
    controller: null,
    deviceId: null,
    note: null,
    type: null,
    variableName: null
  }
}

function scaleMidi7BitValue(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.max(0, Math.min(VALUE_TRACKER_MAX, Math.round((numericValue / 127) * VALUE_TRACKER_MAX)))
}

function createMidiMessageId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `midi-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
