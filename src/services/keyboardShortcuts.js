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
  const shortcuts = {
    Space: async (event) => {
      event.preventDefault()
      await transport.togglePlay()
    },
    KeyL: (event) => {
      event.preventDefault()
      dawStore.toggleLoop()
    }
  }

  const handleKeyDown = async (event) => {
    if (event.repeat || isTyping()) {
      return
    }

    const isUndoShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z'
    const isRedoShortcut =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      ((event.shiftKey && event.key.toLowerCase() === 'z') || (!event.metaKey && event.key.toLowerCase() === 'y'))

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
