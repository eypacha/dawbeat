import { useDawStore } from '@/stores/dawStore'

const VALID_INPUT_SOURCE = 'midiCc'

export function dispatchAutomationInput(input = {}) {
  if (normalizeInputSource(input.source) !== VALID_INPUT_SOURCE) {
    return false
  }

  const dawStore = useDawStore()

  return dawStore.ingestAutomationInput({
    ...input,
    source: VALID_INPUT_SOURCE
  })
}

function normalizeInputSource(source) {
  return source === VALID_INPUT_SOURCE ? source : null
}
