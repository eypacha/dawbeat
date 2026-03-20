import { useDawStore } from '@/stores/dawStore'

const DEFAULT_INPUT_SOURCE = 'keyboard'
const VALID_INPUT_SOURCES = new Set(['keyboard', 'midiCc', 'midiNote'])

export function dispatchValueTrackerInput(input = {}) {
  const dawStore = useDawStore()

  return dawStore.ingestValueTrackerInput({
    source: normalizeInputSource(input.source),
    timeTicks: input.timeTicks,
    value: input.value
  })
}

function normalizeInputSource(source) {
  return VALID_INPUT_SOURCES.has(source) ? source : DEFAULT_INPUT_SOURCE
}
