import { inject, provide, reactive, readonly } from 'vue'

const contextMenuKey = Symbol('context-menu')

export function provideContextMenu() {
  const state = reactive({
    visible: false,
    x: 0,
    y: 0,
    items: []
  })

  function openContextMenu({ x, y, items }) {
    state.x = x
    state.y = y
    state.items = items
    state.visible = true
  }

  function closeContextMenu() {
    state.visible = false
    state.items = []
  }

  const contextMenu = {
    state: readonly(state),
    openContextMenu,
    closeContextMenu
  }

  provide(contextMenuKey, contextMenu)

  return contextMenu
}

export function useContextMenu() {
  const contextMenu = inject(contextMenuKey, null)

  if (!contextMenu) {
    throw new Error('Context menu provider is missing')
  }

  return contextMenu
}
