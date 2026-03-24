import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { createDefaultLibraryItems } from '@/data/defaultLibraryItems'

const STORAGE_KEY = 'dawbeat-library'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultLibraryItems()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : createDefaultLibraryItems()
  } catch {
    return createDefaultLibraryItems()
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

  function replaceItems(nextItems) {
    if (!Array.isArray(nextItems)) {
      return
    }

    items.value = nextItems.map((item) => ({
      id: item?.id || nanoid(),
      name: item?.name || item?.formula || item?.leftFormula || 'Unnamed',
      formula: item?.formula || '',
      leftFormula: item?.leftFormula || '',
      rightFormula: item?.rightFormula || '',
      formulaStereo: Boolean(item?.formulaStereo),
      duration: Number.isFinite(Number(item?.duration)) && Number(item.duration) > 0
        ? Number(item.duration)
        : 4
    }))
    persist()
  }

  function clearItems() {
    items.value = []
    persist()
  }

  function resetToDefaultItems() {
    items.value = createDefaultLibraryItems()
    persist()
  }

  return {
    items,
    addItem,
    removeItem,
    renameItem,
    updateItemFormula,
    replaceItems,
    clearItems,
    resetToDefaultItems
  }
})
