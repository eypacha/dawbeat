import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'

const STORAGE_KEY = 'dawbeat-library'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export const useLibraryStore = defineStore('libraryStore', () => {
  const items = ref(loadFromStorage())

  function persist() {
    saveToStorage(items.value)
  }

  function addItem({ name, formula, leftFormula, rightFormula, formulaStereo, duration }) {
    const item = {
      id: nanoid(),
      name: name || formula || leftFormula || 'Unnamed',
      formula: formula || '',
      leftFormula: leftFormula || '',
      rightFormula: rightFormula || '',
      formulaStereo: Boolean(formulaStereo),
      duration: duration ?? 4
    }

    items.value.unshift(item)
    persist()
  }

  function removeItem(id) {
    const idx = items.value.findIndex((item) => item.id === id)
    if (idx !== -1) {
      items.value.splice(idx, 1)
      persist()
    }
  }

  function renameItem(id, name) {
    const item = items.value.find((entry) => entry.id === id)
    if (item) {
      item.name = name
      persist()
    }
  }

  function updateItemFormula(id, formula) {
    const item = items.value.find((entry) => entry.id === id)
    if (item) {
      item.formula = formula
      persist()
    }
  }

  return {
    items,
    addItem,
    removeItem,
    renameItem,
    updateItemFormula
  }
})
