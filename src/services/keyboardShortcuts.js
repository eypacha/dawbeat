import { TIMELINE_SNAP_SUBDIVISIONS } from '@/utils/timeUtils'
import { midiClockState } from '@/services/midiClockService'
import { dispatchValueTrackerInput } from '@/services/valueTrackerInputService'

function isTyping() {
  const element = document.activeElement

  if (!element) {
    return false
  }

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  )
}

export function initKeyboardShortcuts({ dawStore, transport }) {
  const clipNudgeStep = 1 / TIMELINE_SNAP_SUBDIVISIONS
  const shortcuts = {
    Space: async (event) => {
      if (midiClockState.enabled && midiClockState.locked) {
        event.preventDefault()
        return
      }

      event.preventDefault()
      await transport.togglePlay()
    },
    KeyL: (event) => {
      event.preventDefault()
      dawStore.toggleLoop()
    },
    ArrowLeft: (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (dawStore.selectedAutomationPoint) {
        event.preventDefault()
        dawStore.nudgeSelectedAutomationPointTime(-clipNudgeStep)
        return
      }

      if (!dawStore.selectedClipIds.length) {
        return
      }

      event.preventDefault()
      dawStore.nudgeSelectedClips(-clipNudgeStep, !event.shiftKey)
    },
    ArrowRight: (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (dawStore.selectedAutomationPoint) {
        event.preventDefault()
        dawStore.nudgeSelectedAutomationPointTime(clipNudgeStep)
        return
      }

      if (!dawStore.selectedClipIds.length) {
        return
      }

      event.preventDefault()
      dawStore.nudgeSelectedClips(clipNudgeStep, !event.shiftKey)
    },
    ArrowUp: (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || !dawStore.selectedAutomationPoint) {
        return
      }

      event.preventDefault()
      dawStore.nudgeSelectedAutomationPointValue(1)
    },
    ArrowDown: (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || !dawStore.selectedAutomationPoint) {
        return
      }

      event.preventDefault()
      dawStore.nudgeSelectedAutomationPointValue(-1)
    }
  }

  const handleKeyDown = async (event) => {
    if (event.repeat || isTyping()) {
      return
    }

    const keyboardValue = getKeyboardValueTrackerInput(event)

    if (keyboardValue !== null) {
      const applied = dispatchValueTrackerInput({
        source: 'keyboard',
        timeTicks: transport.getCurrentTime?.() ?? dawStore.time,
        value: keyboardValue
      })

      if (applied) {
        event.preventDefault()
      }

      return
    }

    const isCopyShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'c'
    const isPasteShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v'
    const isUndoShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z'
    const isRedoShortcut =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      ((event.shiftKey && event.key.toLowerCase() === 'z') || (!event.metaKey && event.key.toLowerCase() === 'y'))

    if (isCopyShortcut && dawStore.selectedClipIds.length) {
      event.preventDefault()
      dawStore.copySelectedClips()
      return
    }

    if (isPasteShortcut && dawStore.canPasteClipsAtPlayhead) {
      event.preventDefault()
      dawStore.pasteClipboardAtPlayhead()
      return
    }

    if (!dawStore.playing && isUndoShortcut && dawStore.canUndo) {
      event.preventDefault()
      dawStore.undo()
      return
    }

    if (!dawStore.playing && isRedoShortcut && dawStore.canRedo) {
      event.preventDefault()
      dawStore.redo()
      return
    }

    const action = shortcuts[event.code]

    if (!action) {
      return
    }

    await action(event)
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

function getKeyboardValueTrackerInput(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null
  }

  const normalizedKey = typeof event.key === 'string' ? event.key.toLowerCase() : ''

  if (/^[0-9]$/.test(normalizedKey)) {
    return Number(normalizedKey)
  }

  if (/^[a-f]$/.test(normalizedKey)) {
    return normalizedKey.charCodeAt(0) - 87
  }

  return null
}
