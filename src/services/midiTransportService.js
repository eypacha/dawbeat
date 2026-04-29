import { reactive } from 'vue'
import {
  normalizeMidiMessage,
  startMidiLearn,
  stopMidiLearn,
  subscribeMidiMessageEvents
} from '@/services/midiInputService'
import { enqueueSnackbar } from '@/services/notifications'

const STORAGE_KEY = 'dawbeat-midi-transport-bindings'
const TRANSPORT_ACTION_PLAY = 'play'
const TRANSPORT_ACTION_STOP = 'stop'
const TRANSPORT_ACTION_LOOP = 'loop'
const TRANSPORT_ACTION_RECORD = 'record'
const VALID_TRANSPORT_ACTIONS = new Set([
  TRANSPORT_ACTION_PLAY,
  TRANSPORT_ACTION_STOP,
  TRANSPORT_ACTION_LOOP,
  TRANSPORT_ACTION_RECORD
])

const storedTransportBindings = loadStoredTransportBindings()

export const midiTransportState = reactive({
  learningAction: null,
  playBinding: storedTransportBindings.play,
  stopBinding: storedTransportBindings.stop,
  loopBinding: storedTransportBindings.loop,
  recordBinding: storedTransportBindings.record
})

let disposeMidiMessageSubscription = null
let transportActionChain = Promise.resolve()
let transportHandlers = {
  play: null,
  stop: null,
  loop: null,
  record: null
}

export function registerMidiTransportHandlers(handlers = {}) {
  transportHandlers = {
    play: handlers.play ?? null,
    stop: handlers.stop ?? null,
    loop: handlers.loop ?? null,
    record: handlers.record ?? null
  }

  ensureMidiTransportSubscription()

  return () => {
    stopMidiTransportLearn()

    if (disposeMidiMessageSubscription) {
      disposeMidiMessageSubscription()
      disposeMidiMessageSubscription = null
    }

    if (
      transportHandlers?.play === handlers.play &&
      transportHandlers?.stop === handlers.stop &&
      transportHandlers?.loop === handlers.loop &&
      transportHandlers?.record === handlers.record
    ) {
      transportHandlers = {
        play: null,
        stop: null,
        loop: null,
        record: null
      }
    }
  }
}

export function startMidiTransportLearn(action, options = {}) {
  const normalizedAction = normalizeTransportAction(action)

  if (!normalizedAction) {
    return false
  }

  stopMidiTransportLearn()

  midiTransportState.learningAction = normalizedAction

  const started = startMidiLearn((binding) => {
    if (midiTransportState.learningAction !== normalizedAction) {
      return
    }

    setMidiTransportBinding(normalizedAction, binding)
    midiTransportState.learningAction = null
    stopMidiLearn()
  }, {
    deviceId: normalizeNullableString(options.deviceId),
    sources: ['midiCc', 'midiNote']
  })

  if (!started) {
    midiTransportState.learningAction = null
    return false
  }

  return true
}

export function stopMidiTransportLearn() {
  midiTransportState.learningAction = null
  stopMidiLearn()
}

export function clearMidiTransportBinding(action) {
  const normalizedAction = normalizeTransportAction(action)

  if (!normalizedAction) {
    return false
  }

  setMidiTransportBinding(normalizedAction, createDefaultMidiTransportBinding())
  return true
}

export function resetMidiTransportBindings() {
  stopMidiTransportLearn()
  midiTransportState.playBinding = createDefaultMidiTransportBinding()
  midiTransportState.stopBinding = createDefaultMidiTransportBinding()
  midiTransportState.loopBinding = createDefaultMidiTransportBinding()
  midiTransportState.recordBinding = createDefaultMidiTransportBinding()
  persistTransportBindings()
}

export function getMidiTransportBindingSummary(binding, resolveDeviceName = null) {
  const normalizedBinding = createDefaultMidiTransportBinding(binding)

  if (!normalizedBinding.type) {
    return 'Unassigned'
  }

  const parts = [
    normalizedBinding.type === 'midiCc'
      ? `MIDI CC ${normalizedBinding.controller ?? 'Any'}`
      : `MIDI Note ${normalizedBinding.note ?? 'Any'}`
  ]

  parts.push(normalizedBinding.channel !== null ? `Ch ${normalizedBinding.channel}` : 'Any ch')

  const deviceSummary = getTransportBindingDeviceSummary(
    normalizedBinding.deviceId,
    resolveDeviceName
  )

  if (deviceSummary) {
    parts.push(deviceSummary)
  }

  return parts.filter(Boolean).join(' · ')
}

function ensureMidiTransportSubscription() {
  if (disposeMidiMessageSubscription) {
    return
  }

  disposeMidiMessageSubscription = subscribeMidiMessageEvents(handleMidiMessageEvent)
}

function handleMidiMessageEvent(message) {
  if (midiTransportState.learningAction) {
    return
  }

  const normalizedMessage = normalizeMidiMessage(message)

  if (!normalizedMessage) {
    return
  }

  if (normalizedMessage.source === 'midiNote' && normalizedMessage.isNoteOff) {
    return
  }

  const action = getMatchedTransportAction(normalizedMessage)

  if (!action) {
    return
  }

  enqueueTransportAction(action)
}

function enqueueTransportAction(action) {
  const handler = transportHandlers?.[action]

  if (typeof handler !== 'function') {
    return
  }

  transportActionChain = transportActionChain
    .then(() => handler())
    .catch((error) => {
      console.error('No se pudo ejecutar el transporte MIDI aprendido', error)
      enqueueSnackbar('MIDI transport action failed.', { variant: 'error' })
    })
}

function getMatchedTransportAction(input) {
  if (doesMidiTransportBindingMatchInput(midiTransportState.stopBinding, input)) {
    return TRANSPORT_ACTION_STOP
  }

  if (doesMidiTransportBindingMatchInput(midiTransportState.recordBinding, input)) {
    return TRANSPORT_ACTION_RECORD
  }

  if (doesMidiTransportBindingMatchInput(midiTransportState.loopBinding, input)) {
    return TRANSPORT_ACTION_LOOP
  }

  if (doesMidiTransportBindingMatchInput(midiTransportState.playBinding, input)) {
    return TRANSPORT_ACTION_PLAY
  }

  return null
}

function setMidiTransportBinding(action, binding) {
  const normalizedAction = normalizeTransportAction(action)

  if (!normalizedAction) {
    return false
  }

  midiTransportState[`${normalizedAction}Binding`] = createDefaultMidiTransportBinding(binding)
  persistTransportBindings()
  return true
}

function loadStoredTransportBindings() {
  const defaultBindings = {
    play: createDefaultMidiTransportBinding(),
    stop: createDefaultMidiTransportBinding(),
    loop: createDefaultMidiTransportBinding(),
    record: createDefaultMidiTransportBinding()
  }

  if (typeof localStorage === 'undefined') {
    return defaultBindings
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return defaultBindings
    }

    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return defaultBindings
    }

    return {
      play: createDefaultMidiTransportBinding(parsed.play),
      stop: createDefaultMidiTransportBinding(parsed.stop),
      loop: createDefaultMidiTransportBinding(parsed.loop),
      record: createDefaultMidiTransportBinding(parsed.record)
    }
  } catch {
    return defaultBindings
  }
}

function persistTransportBindings() {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      play: midiTransportState.playBinding,
      stop: midiTransportState.stopBinding,
      loop: midiTransportState.loopBinding,
      record: midiTransportState.recordBinding
    }))
  } catch {
    // ignore
  }
}

function createDefaultMidiTransportBinding(binding = {}) {
  const type = binding?.type === 'midiCc' || binding?.type === 'midiNote'
    ? binding.type
    : null

  const normalizedBinding = {
    type,
    deviceId: normalizeNullableString(binding?.deviceId),
    channel: normalizeNullableInteger(binding?.channel),
    controller: normalizeNullableInteger(binding?.controller),
    note: normalizeNullableInteger(binding?.note)
  }

  if (type === 'midiCc') {
    return {
      ...normalizedBinding,
      note: null
    }
  }

  if (type === 'midiNote') {
    return {
      ...normalizedBinding,
      controller: null
    }
  }

  return {
    type: null,
    deviceId: null,
    channel: null,
    controller: null,
    note: null
  }
}

function doesMidiTransportBindingMatchInput(binding, input = {}) {
  const normalizedBinding = createDefaultMidiTransportBinding(binding)
  const normalizedSource = normalizeNullableString(input?.source)

  if (!normalizedBinding.type || normalizedSource !== normalizedBinding.type) {
    return false
  }

  if (normalizedBinding.deviceId && normalizedBinding.deviceId !== normalizeNullableString(input?.deviceId)) {
    return false
  }

  if (normalizedBinding.channel !== null && normalizedBinding.channel !== normalizeNullableInteger(input?.channel)) {
    return false
  }

  if (
    normalizedBinding.type === 'midiCc' &&
    normalizedBinding.controller !== null &&
    normalizedBinding.controller !== normalizeNullableInteger(input?.controller)
  ) {
    return false
  }

  if (
    normalizedBinding.type === 'midiNote' &&
    normalizedBinding.note !== null &&
    normalizedBinding.note !== normalizeNullableInteger(input?.note)
  ) {
    return false
  }

  return true
}

function getTransportBindingDeviceSummary(deviceId, resolveDeviceName) {
  if (!deviceId) {
    return 'Any device'
  }

  const resolvedDeviceName = typeof resolveDeviceName === 'function'
    ? normalizeNullableString(resolveDeviceName(deviceId))
    : null

  return resolvedDeviceName || 'Specific device'
}

function normalizeTransportAction(action) {
  const normalizedAction = typeof action === 'string' ? action.trim() : ''

  return VALID_TRANSPORT_ACTIONS.has(normalizedAction) ? normalizedAction : null
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue || null
}

function normalizeNullableInteger(value) {
  const numericValue = Number(value)
  return Number.isInteger(numericValue) ? numericValue : null
}
