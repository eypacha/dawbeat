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
